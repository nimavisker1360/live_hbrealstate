import { handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const LIKE_COOLDOWN_MS = 2_000;
const recentLikeAttempts = new Map<string, number>();

function cooldownKey(videoTourId: string, identity: string) {
  return `${videoTourId}:${identity}`;
}

function pruneRecent(now: number) {
  for (const [key, timestamp] of recentLikeAttempts) {
    if (now - timestamp > LIKE_COOLDOWN_MS * 4) {
      recentLikeAttempts.delete(key);
    }
  }
}

async function findVideoTour(slug: string) {
  return prisma.videoTour.findUnique({
    where: { slug },
    select: { id: true, likeCount: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const tour = await findVideoTour(slug);

    if (!tour) {
      return jsonError("Reel not found.", 404);
    }

    return Response.json({
      data: { videoTourId: tour.id, count: tour.likeCount },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const session = await getCurrentSession().catch(() => null);
    const tour = await findVideoTour(slug);

    if (!tour) {
      return jsonError("Reel not found.", 404);
    }

    const identity = session?.sub ?? `anon-${slug}`;
    const now = Date.now();
    const key = cooldownKey(tour.id, identity);
    const last = recentLikeAttempts.get(key);

    if (last && now - last < LIKE_COOLDOWN_MS) {
      return Response.json(
        {
          data: { videoTourId: tour.id, count: tour.likeCount },
          error: { message: "Please wait before liking again." },
        },
        { status: 429 },
      );
    }

    recentLikeAttempts.set(key, now);
    pruneRecent(now);

    if (session?.sub) {
      const existing = await prisma.videoTourLike.findUnique({
        where: {
          videoTourId_userId: { videoTourId: tour.id, userId: session.sub },
        },
        select: { id: true },
      });

      if (!existing) {
        await prisma.videoTourLike.create({
          data: { videoTourId: tour.id, userId: session.sub },
        });
        await prisma.videoTour.update({
          where: { id: tour.id },
          data: { likeCount: { increment: 1 } },
        });
      }
    } else {
      await prisma.videoTour.update({
        where: { id: tour.id },
        data: { likeCount: { increment: 1 } },
      });
    }

    const updated = await prisma.videoTour.findUnique({
      where: { id: tour.id },
      select: { likeCount: true },
    });

    return Response.json(
      {
        data: { videoTourId: tour.id, count: updated?.likeCount ?? tour.likeCount },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
