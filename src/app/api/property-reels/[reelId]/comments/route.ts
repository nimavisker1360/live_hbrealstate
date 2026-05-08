import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import {
  PUSHER_EVENTS,
  getReelCommentsChannel,
  type RealtimeReelCommentEvent,
} from "@/lib/pusher-channels";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { prisma } from "@/lib/prisma";
import {
  checkCommentCooldown,
  detectCommentSpam,
  fetchThreadedVideoTourComments,
  markCommentPosted,
  resolveCommentIdentity,
  resolveCommentParent,
  serializeVideoTourComment,
  videoTourCommentBodySchema,
  withVisitorCookie,
  type VideoTourCommentSort,
} from "@/lib/video-tour-comments";

export const runtime = "nodejs";

async function loadReel(reelId: string) {
  return prisma.videoTour.findUnique({
    where: { id: reelId },
    select: {
      id: true,
      agentId: true,
      commentCount: true,
      property: { select: { consultantId: true } },
    },
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
    const sortParam = url.searchParams.get("sort");
    const sort: VideoTourCommentSort =
      sortParam === "mostLiked" ? "mostLiked" : "newest";
    const threaded = await fetchThreadedVideoTourComments({
      cursor,
      sort,
      take,
      videoTourId: reel.id,
    });

    return Response.json({
      data: {
        reelId: reel.id,
        commentCount: reel.commentCount,
        comments: threaded.comments,
        nextCursor: threaded.nextCursor,
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

    const body = videoTourCommentBodySchema.parse(await request.json());
    const parentId = await resolveCommentParent(reel.id, body.parentId);
    if (parentId === undefined) {
      return jsonError("Parent comment not found.", 404);
    }

    const session = await getCurrentSession().catch(() => null);
    const identityContext = await resolveCommentIdentity({
      author: body.author,
      consultantId: reel.property.consultantId,
      reelAgentId: reel.agentId,
      session,
    });
    const identity = identityContext.identity;
    if (!identity) {
      return jsonError("Could not establish identity.", 500);
    }

    const cooldown = checkCommentCooldown(reel.id, identity);
    if (cooldown.retryAfterMs > 0) {
      return withVisitorCookie(
        Response.json(
          {
            error: {
              message: "You're commenting too fast. Please wait a moment.",
              retryAfterMs: cooldown.retryAfterMs,
            },
          },
          { status: 429 },
        ),
        identityContext.visitor,
      );
    }

    const spamReason = detectCommentSpam(body.message);
    if (spamReason) {
      return withVisitorCookie(
        Response.json({ error: { message: spamReason } }, { status: 400 }),
        identityContext.visitor,
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const comment = await tx.videoTourComment.create({
        data: {
          videoTourId: reel.id,
          parentId,
          userId: identityContext.userId,
          agentId: identityContext.agentId,
          visitorId: identityContext.userId
            ? null
            : identityContext.visitor!.visitorId,
          author: identityContext.author,
          message: body.message,
        },
        select: {
          id: true,
          parentId: true,
          author: true,
          message: true,
          createdAt: true,
          userId: true,
          agentId: true,
          isPinned: true,
          likeCount: true,
          user: { select: { role: true } },
        },
      });
      const updated = await tx.videoTour.update({
        where: { id: reel.id },
        data: { commentCount: { increment: 1 } },
        select: { commentCount: true },
      });
      return { comment, commentCount: updated.commentCount };
    });

    markCommentPosted(cooldown.key, cooldown.now);

    const comment = serializeVideoTourComment(created.comment);

    await triggerRealtimeEvent(
      getReelCommentsChannel(reel.id),
      PUSHER_EVENTS.COMMENT_CREATED,
      {
        reelId: reel.id,
        comment,
        commentCount: created.commentCount,
        clientEventId: body.clientEventId,
      } satisfies RealtimeReelCommentEvent,
    );

    return withVisitorCookie(
      Response.json(
        {
          data: {
            comment,
            commentCount: created.commentCount,
          },
        },
        { status: 201 },
      ),
      identityContext.visitor,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
