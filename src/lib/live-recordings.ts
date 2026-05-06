import { prisma } from "@/lib/prisma";

export function isMissingLiveSessionSegmentTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  );
}

export function getVisibleRecordingPlaybackIds(
  segments: Array<{ playbackId: string | null; status: string | null }>,
  fallbackPlaybackId?: string | null,
) {
  const playbackIds = segments
    .filter((segment) => segment.status !== "deleted")
    .map((segment) => segment.playbackId)
    .filter((playbackId): playbackId is string => Boolean(playbackId));

  if (fallbackPlaybackId && !playbackIds.includes(fallbackPlaybackId)) {
    playbackIds.push(fallbackPlaybackId);
  }

  return playbackIds;
}

export async function getLiveSessionRecordingSegments(liveSessionId: string) {
  try {
    return await prisma.liveSessionSegment.findMany({
      where: { liveSessionId },
      orderBy: { sequence: "asc" },
      select: {
        playbackId: true,
        status: true,
      },
    });
  } catch (error) {
    if (isMissingLiveSessionSegmentTable(error)) {
      console.warn(
        "LiveSessionSegment table is missing. Run the latest Prisma migration to enable multi-part recordings.",
      );
      return [];
    }

    throw error;
  }
}

export async function upsertLiveSessionRecordingSegment({
  liveSessionId,
  muxAssetId,
  playbackId,
  status,
}: {
  liveSessionId: string;
  muxAssetId: string;
  playbackId?: string | null;
  status?: string | null;
}) {
  try {
    const existing = await prisma.liveSessionSegment.findUnique({
      where: { muxAssetId },
      select: { id: true },
    });
    const readyAt = playbackId ? new Date() : undefined;

    if (existing) {
      return await prisma.liveSessionSegment.update({
        where: { id: existing.id },
        data: {
          ...(playbackId ? { playbackId, readyAt } : {}),
          ...(status ? { status } : {}),
        },
      });
    }

    const latestSegment = await prisma.liveSessionSegment.findFirst({
      where: { liveSessionId },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });

    return await prisma.liveSessionSegment.create({
      data: {
        liveSessionId,
        muxAssetId,
        playbackId,
        readyAt,
        sequence: (latestSegment?.sequence ?? 0) + 1,
        status,
      },
    });
  } catch (error) {
    if (isMissingLiveSessionSegmentTable(error)) {
      console.warn(
        "LiveSessionSegment table is missing. Run the latest Prisma migration to enable multi-part recordings.",
      );
      return null;
    }

    throw error;
  }
}
