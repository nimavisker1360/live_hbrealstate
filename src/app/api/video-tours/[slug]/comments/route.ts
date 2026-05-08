import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  fetchThreadedVideoTourComments,
  resolveCommentIdentity,
  resolveCommentParent,
  serializeVideoTourComment,
  videoTourCommentBodySchema,
  withVisitorCookie,
} from "@/lib/video-tour-comments";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tour = await prisma.videoTour.findUnique({
      where: { slug },
      select: { id: true, commentCount: true },
    });

    if (!tour) {
      return jsonError("Reel not found.", 404);
    }

    const url = new URL(request.url);
    const sort = url.searchParams.get("sort") === "mostLiked"
      ? "mostLiked"
      : "newest";
    const take = Math.max(
      1,
      Math.min(100, Number(url.searchParams.get("take")) || 50),
    );
    const threaded = await fetchThreadedVideoTourComments({
      cursor: url.searchParams.get("cursor")?.trim() || undefined,
      sort,
      take,
      videoTourId: tour.id,
    });

    return Response.json({
      data: {
        commentCount: tour.commentCount,
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
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tour = await prisma.videoTour.findUnique({
      where: { slug },
      select: { id: true, agentId: true },
    });

    if (!tour) {
      return jsonError("Reel not found.", 404);
    }

    const session = await getCurrentSession().catch(() => null);
    const body = videoTourCommentBodySchema.parse(await request.json());
    const parentId = await resolveCommentParent(tour.id, body.parentId);
    if (parentId === undefined) {
      return jsonError("Parent comment not found.", 404);
    }
    const identityContext = await resolveCommentIdentity({
      author: body.author,
      reelAgentId: tour.agentId,
      session,
    });

    const comment = await prisma.videoTourComment.create({
      data: {
        videoTourId: tour.id,
        parentId,
        userId: identityContext.userId,
        agentId: identityContext.agentId,
        visitorId: identityContext.userId
          ? null
          : identityContext.visitor?.visitorId,
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

    await prisma.videoTour.update({
      where: { id: tour.id },
      data: { commentCount: { increment: 1 } },
    });

    return withVisitorCookie(
      Response.json(
        {
          data: serializeVideoTourComment(comment),
        },
        { status: 201 },
      ),
      identityContext.visitor,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
