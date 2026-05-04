import { getStringParam, handleApiError, jsonError } from "@/lib/api";
import { getMuxAsset, getMuxLiveStream } from "@/lib/mux";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type DatabaseStreamStatus = "SCHEDULED" | "LIVE" | "ENDED";
const STREAM_IDLE_GRACE_MS = 45_000;

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
        endedAt: true,
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
    let endedAt = liveSession.endedAt;
    const recordingDeleted = liveSession.recordingStatus === "deleted";

    if (liveSession.muxLiveStreamId) {
      const muxLiveStream = await getMuxLiveStream(liveSession.muxLiveStreamId);
      const latestAssetId =
        muxLiveStream.recentAssetIds.at(-1) ?? muxLiveStream.activeAssetId;
      const muxStatus = mapMuxStatus(muxLiveStream.status);

      playbackId = muxLiveStream.playbackId ?? playbackId;
      status = muxStatus ?? status;

      if (muxLiveStream.status === "active") {
        endedAt = null;
      }

      if (status === "ENDED" && !endedAt) {
        endedAt = new Date();
      }

      if (muxLiveStream.status === "idle") {
        if (liveSession.status === "LIVE") {
          const idleDetectedAt = endedAt ?? new Date();
          const idleMs = Date.now() - idleDetectedAt.getTime();

          endedAt = idleDetectedAt;
          status = idleMs >= STREAM_IDLE_GRACE_MS ? "ENDED" : "LIVE";
        } else {
          status = latestAssetId ? "ENDED" : "SCHEDULED";
          endedAt = status === "ENDED" ? (endedAt ?? new Date()) : null;
        }
      }

      if (latestAssetId && !recordingDeleted) {
        const muxAsset = await getMuxAsset(latestAssetId).catch(() => null);

        muxAssetId = muxAsset?.muxAssetId ?? latestAssetId;
        recordingPlaybackId = muxAsset?.playbackId ?? recordingPlaybackId;
        recordingStatus = muxAsset?.status ?? recordingStatus ?? "preparing";
      } else if (recordingDeleted) {
        muxAssetId = null;
        recordingPlaybackId = null;
        recordingStatus = "deleted";
      }

      if (
        muxAssetId !== liveSession.muxAssetId ||
        recordingPlaybackId !== liveSession.recordingPlaybackId ||
        recordingStatus !== liveSession.recordingStatus ||
        endedAt?.getTime() !== liveSession.endedAt?.getTime() ||
        status !== liveSession.status ||
        playbackId !== liveSession.playbackId
      ) {
        await prisma.liveSession.update({
          where: { id: liveSession.id },
          data: {
            endedAt,
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
