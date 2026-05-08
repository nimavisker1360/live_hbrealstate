import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkCommentCooldown,
  detectCommentSpam,
  markCommentPosted,
  resolveCommentIdentity,
  resolveCommentParent,
  serializeVideoTourComment,
  videoTourCommentBodySchema,
  withVisitorCookie,
} from "@/lib/video-tour-comments";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ reelId: string; commentId: string }> },
) {
  try {
    const { reelId, commentId } = await params;
    const reel = await prisma.videoTour.findUnique({
      where: { id: reelId },
      select: { id: true, agentId: true },
    });

    if (!reel) return jsonError("Reel not found.", 404);

    const body = videoTourCommentBodySchema.parse(await request.json());
    const parentId = await resolveCommentParent(
      reel.id,
      body.parentId ?? commentId,
    );

    if (parentId === undefined) {
      return jsonError("Parent comment not found.", 404);
    }

    const session = await getCurrentSession().catch(() => null);
    const identityContext = await resolveCommentIdentity({
      author: body.author,
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

    return withVisitorCookie(
      Response.json(
        {
          data: {
            comment: serializeVideoTourComment(created.comment),
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
