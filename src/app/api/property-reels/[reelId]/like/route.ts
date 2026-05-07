import { Prisma } from "@/generated/prisma/client";
import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  appendVisitorCookie,
  ensureVisitorId,
  readVisitorId,
} from "@/lib/reel-visitor";

export const runtime = "nodejs";

const LIKE_COOLDOWN_MS = 600;
const recentToggles = new Map<string, number>();

function pruneCooldown(now: number) {
  for (const [key, ts] of recentToggles) {
    if (now - ts > LIKE_COOLDOWN_MS * 8) {
      recentToggles.delete(key);
    }
  }
}

async function readReel(reelId: string) {
  return prisma.videoTour.findUnique({
    where: { id: reelId },
    select: { id: true, likeCount: true },
  });
}

function jsonWithCookie(
  body: unknown,
  init: ResponseInit,
  setCookie?: { name: string; value: string },
) {
  return appendVisitorCookie(Response.json(body, init), setCookie);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reelId: string }> },
) {
  try {
    const { reelId } = await params;
    const reel = await readReel(reelId);
    if (!reel) return jsonError("Reel not found.", 404);

    const session = await getCurrentSession().catch(() => null);
    let liked = false;

    if (session?.sub) {
      const existing = await prisma.videoTourLike.findUnique({
        where: {
          videoTourId_userId: { videoTourId: reel.id, userId: session.sub },
        },
        select: { id: true },
      });
      liked = Boolean(existing);
    } else {
      const visitorId = await readVisitorId();
      if (visitorId) {
        const existing = await prisma.videoTourLike.findUnique({
          where: {
            videoTourId_visitorId: { videoTourId: reel.id, visitorId },
          },
          select: { id: true },
        });
        liked = Boolean(existing);
      }
    }

    return Response.json({
      data: { reelId: reel.id, count: reel.likeCount, liked },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reelId: string }> },
) {
  try {
    const { reelId } = await params;
    const reel = await readReel(reelId);
    if (!reel) return jsonError("Reel not found.", 404);

    const session = await getCurrentSession().catch(() => null);
    const visitor = session?.sub ? null : await ensureVisitorId();

    const identity = session?.sub ?? visitor?.visitorId;
    if (!identity) {
      return jsonError("Could not establish identity.", 500);
    }

    const now = Date.now();
    const cdKey = `${reel.id}:${identity}`;
    const last = recentToggles.get(cdKey);
    if (last && now - last < LIKE_COOLDOWN_MS) {
      return jsonWithCookie(
        {
          error: { message: "Too many like toggles. Please slow down." },
          data: { reelId: reel.id, count: reel.likeCount },
        },
        { status: 429 },
        visitor?.setCookie,
      );
    }
    recentToggles.set(cdKey, now);
    pruneCooldown(now);

    const result = await prisma.$transaction(async (tx) => {
      const where = session?.sub
        ? { videoTourId_userId: { videoTourId: reel.id, userId: session.sub } }
        : {
            videoTourId_visitorId: {
              videoTourId: reel.id,
              visitorId: visitor!.visitorId,
            },
          };

      const existing = await tx.videoTourLike.findUnique({
        where,
        select: { id: true },
      });

      if (existing) {
        await tx.videoTourLike.delete({ where: { id: existing.id } });
        const updated = await tx.videoTour.update({
          where: { id: reel.id },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        });
        const safeCount = Math.max(0, updated.likeCount);
        if (safeCount !== updated.likeCount) {
          await tx.videoTour.update({
            where: { id: reel.id },
            data: { likeCount: safeCount },
          });
        }
        return { liked: false, count: safeCount };
      }

      try {
        await tx.videoTourLike.create({
          data: {
            videoTourId: reel.id,
            userId: session?.sub ?? null,
            visitorId: session?.sub ? null : visitor!.visitorId,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const refreshed = await tx.videoTour.findUnique({
            where: { id: reel.id },
            select: { likeCount: true },
          });
          return { liked: true, count: refreshed?.likeCount ?? reel.likeCount };
        }
        throw error;
      }

      const updated = await tx.videoTour.update({
        where: { id: reel.id },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });
      return { liked: true, count: updated.likeCount };
    });

    return jsonWithCookie(
      { data: { reelId: reel.id, ...result } },
      { status: 200 },
      visitor?.setCookie,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
