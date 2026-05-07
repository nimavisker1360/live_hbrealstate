import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const commentBody = z.object({
  message: z.string().trim().min(1).max(500),
  author: z.string().trim().min(1).max(80).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tour = await prisma.videoTour.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!tour) {
      return jsonError("Reel not found.", 404);
    }

    const comments = await prisma.videoTourComment.findMany({
      where: { videoTourId: tour.id },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        author: true,
        message: true,
        createdAt: true,
      },
    });

    return Response.json({
      data: comments.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
      })),
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
      select: { id: true },
    });

    if (!tour) {
      return jsonError("Reel not found.", 404);
    }

    const session = await getCurrentSession().catch(() => null);
    const body = commentBody.parse(await request.json());
    const author = session?.name ?? body.author ?? "Guest";

    const comment = await prisma.videoTourComment.create({
      data: {
        videoTourId: tour.id,
        userId: session?.sub,
        author,
        message: body.message,
      },
      select: {
        id: true,
        author: true,
        message: true,
        createdAt: true,
      },
    });

    await prisma.videoTour.update({
      where: { id: tour.id },
      data: { commentCount: { increment: 1 } },
    });

    return Response.json(
      {
        data: { ...comment, createdAt: comment.createdAt.toISOString() },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
