import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  appendVisitorCookie,
  ensureVisitorId,
} from "@/lib/reel-visitor";

export const runtime = "nodejs";

const MIN_LENGTH = 1;
const MAX_LENGTH = 500;
const COMMENT_COOLDOWN_MS = 4_000;
const recentPosts = new Map<string, number>();

const commentBodySchema = z.object({
  message: z.string().trim().min(MIN_LENGTH).max(MAX_LENGTH),
  author: z.string().trim().min(1).max(80).optional(),
});

const URL_PATTERN = /\bhttps?:\/\/|www\.[a-z0-9]/i;
const REPEAT_PATTERN = /(.)\1{12,}/;

function pruneCooldown(now: number) {
  for (const [key, ts] of recentPosts) {
    if (now - ts > COMMENT_COOLDOWN_MS * 8) {
      recentPosts.delete(key);
    }
  }
}

function detectSpam(message: string): string | null {
  if (URL_PATTERN.test(message)) return "Links are not allowed in comments.";
  if (REPEAT_PATTERN.test(message)) return "Comment looks like spam.";
  return null;
}

async function loadReel(reelId: string) {
  return prisma.videoTour.findUnique({
    where: { id: reelId },
    select: { id: true, commentCount: true },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reelId: string }> },
) {
  try {
    const { reelId } = await params;
    const reel = await loadReel(reelId);
    if (!reel) return jsonError("Reel not found.", 404);

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor")?.trim() || undefined;
    const take = Math.max(
      1,
      Math.min(100, Number(url.searchParams.get("take")) || 50),
    );

    const comments = await prisma.videoTourComment.findMany({
      where: { videoTourId: reel.id },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        author: true,
        message: true,
        createdAt: true,
        userId: true,
      },
    });

    const hasMore = comments.length > take;
    const page = hasMore ? comments.slice(0, take) : comments;

    return Response.json({
      data: {
        reelId: reel.id,
        commentCount: reel.commentCount,
        comments: page.map((comment) => ({
          id: comment.id,
          author: comment.author,
          message: comment.message,
          createdAt: comment.createdAt.toISOString(),
          isMember: Boolean(comment.userId),
        })),
        nextCursor: hasMore ? page[page.length - 1].id : null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reelId: string }> },
) {
  try {
    const { reelId } = await params;
    const reel = await loadReel(reelId);
    if (!reel) return jsonError("Reel not found.", 404);

    const body = commentBodySchema.parse(await request.json());
    const session = await getCurrentSession().catch(() => null);
    const visitor = session?.sub ? null : await ensureVisitorId();

    const identity = session?.sub ?? visitor?.visitorId;
    if (!identity) {
      return jsonError("Could not establish identity.", 500);
    }

    const now = Date.now();
    const cdKey = `${reel.id}:${identity}`;
    const last = recentPosts.get(cdKey);
    if (last && now - last < COMMENT_COOLDOWN_MS) {
      return appendVisitorCookie(
        Response.json(
          {
            error: {
              message: "You're commenting too fast. Please wait a moment.",
              retryAfterMs: COMMENT_COOLDOWN_MS - (now - last),
            },
          },
          { status: 429 },
        ),
        visitor?.setCookie,
      );
    }

    const spamReason = detectSpam(body.message);
    if (spamReason) {
      return appendVisitorCookie(
        Response.json({ error: { message: spamReason } }, { status: 400 }),
        visitor?.setCookie,
      );
    }

    const author =
      session?.name?.trim() ||
      body.author?.trim() ||
      "Guest";

    const created = await prisma.$transaction(async (tx) => {
      const comment = await tx.videoTourComment.create({
        data: {
          videoTourId: reel.id,
          userId: session?.sub ?? null,
          visitorId: session?.sub ? null : visitor!.visitorId,
          author,
          message: body.message,
        },
        select: {
          id: true,
          author: true,
          message: true,
          createdAt: true,
          userId: true,
        },
      });
      const updated = await tx.videoTour.update({
        where: { id: reel.id },
        data: { commentCount: { increment: 1 } },
        select: { commentCount: true },
      });
      return { comment, commentCount: updated.commentCount };
    });

    recentPosts.set(cdKey, now);
    pruneCooldown(now);

    return appendVisitorCookie(
      Response.json(
        {
          data: {
            comment: {
              id: created.comment.id,
              author: created.comment.author,
              message: created.comment.message,
              createdAt: created.comment.createdAt.toISOString(),
              isMember: Boolean(created.comment.userId),
            },
            commentCount: created.commentCount,
          },
        },
        { status: 201 },
      ),
      visitor?.setCookie,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
