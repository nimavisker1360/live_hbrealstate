import { getCurrentSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getWritableSession() {
  const session = await getCurrentSession().catch(() => null);

  if (!session && process.env.NODE_ENV === "production") {
    return { response: jsonError("Authentication required.", 401) };
  }

  if (session?.role === "BUYER") {
    return { response: jsonError("Unauthorized.", 403) };
  }

  return { session };
}

export async function GET() {
  try {
    const writable = await getWritableSession();

    if (writable.response) {
      return writable.response;
    }

    const propertyReels = await prisma.liveSession.findMany({
      where: writable.session ? { agentId: writable.session.sub } : undefined,
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        createdAt: true,
        endedAt: true,
        id: true,
        propertyId: true,
        recordingPlaybackId: true,
        roomId: true,
        title: true,
        updatedAt: true,
        agent: { select: { id: true, name: true, company: true } },
        property: { select: { id: true, title: true, location: true } },
      },
    });

    return Response.json({
      data: propertyReels.map((reel) => ({
        ...reel,
        createdAt: reel.createdAt.toISOString(),
        endedAt: reel.endedAt?.toISOString() ?? null,
        livePageUrl: `/reels/${reel.roomId}`,
        status: reel.recordingPlaybackId ? "PUBLISHED" : "DRAFT",
        updatedAt: reel.updatedAt.toISOString(),
        videoUrl: reel.recordingPlaybackId,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST() {
  return jsonError(
    "Live session creation is disabled. Upload property videos from the property reels dashboard.",
    410,
  );
}
