import { getStringParam, handleApiError, jsonError } from "@/lib/api";
import { getMuxAsset, getMuxLiveStream } from "@/lib/mux";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type DatabaseStreamStatus = "SCHEDULED" | "LIVE" | "ENDED";

function mapMuxStatus(status?: string | null): DatabaseStreamStatus | null {
  if (status === "active") {
    return "LIVE";
  }

  if (status === "disabled") {
    return "ENDED";
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const liveSessionId = getStringParam(request, "liveSessionId");
    const roomId = getStringParam(request, "roomId");

    if (!liveSessionId && !roomId) {
      return jsonError("liveSessionId or roomId is required.", 400);
    }

    const liveSession = await prisma.liveSession.findFirst({
      where: liveSessionId ? { id: liveSessionId } : { roomId },
      select: {
        id: true,
        muxAssetId: true,
        muxLiveStreamId: true,
        playbackId: true,
        recordingPlaybackId: true,
        recordingStatus: true,
        roomId: true,
        startsAt: true,
        status: true,
      },
    });

    if (!liveSession) {
      return jsonError("Live session not found.", 404);
    }

    let playbackId = liveSession.playbackId;
    let recordingPlaybackId = liveSession.recordingPlaybackId;
    let recordingStatus = liveSession.recordingStatus;
    let status = liveSession.status;
    let muxAssetId = liveSession.muxAssetId;

    if (liveSession.muxLiveStreamId) {
      const muxLiveStream = await getMuxLiveStream(liveSession.muxLiveStreamId);
      const latestAssetId =
        muxLiveStream.recentAssetIds.at(-1) ?? muxLiveStream.activeAssetId;
      const muxStatus =
        muxLiveStream.status === "idle"
          ? liveSession.status === "LIVE" || latestAssetId
            ? "ENDED"
            : "SCHEDULED"
          : mapMuxStatus(muxLiveStream.status);

      playbackId = muxLiveStream.playbackId ?? playbackId;
      status = muxStatus ?? status;

      if (latestAssetId) {
        const muxAsset = await getMuxAsset(latestAssetId).catch(() => null);

        muxAssetId = muxAsset?.muxAssetId ?? latestAssetId;
        recordingPlaybackId = muxAsset?.playbackId ?? recordingPlaybackId;
        recordingStatus = muxAsset?.status ?? recordingStatus ?? "preparing";
      }

      if (
        muxAssetId !== liveSession.muxAssetId ||
        recordingPlaybackId !== liveSession.recordingPlaybackId ||
        recordingStatus !== liveSession.recordingStatus ||
        status !== liveSession.status ||
        playbackId !== liveSession.playbackId
      ) {
        await prisma.liveSession.update({
          where: { id: liveSession.id },
          data: {
            endedAt: status === "ENDED" ? new Date() : null,
            muxAssetId,
            playbackId,
            recordingPlaybackId,
            recordingReadyAt: recordingPlaybackId ? new Date() : undefined,
            recordingStatus,
            status,
          },
        });
      }
    }

    return Response.json({
      data: {
        id: liveSession.id,
        playbackId,
        recordingPlaybackId,
        recordingStatus,
        roomId: liveSession.roomId,
        startsAt: liveSession.startsAt?.toISOString() ?? null,
        status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
