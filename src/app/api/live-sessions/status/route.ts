import { getStringParam, handleApiError, jsonError } from "@/lib/api";
import {
  getVisibleRecordingPlaybackIds,
  upsertLiveSessionRecordingSegment,
} from "@/lib/live-recordings";
import { LIVE_RECONNECT_WINDOW_MS } from "@/lib/live-streaming";
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
        endedAt: true,
        startsAt: true,
        status: true,
        segments: {
          orderBy: { sequence: "asc" },
          select: {
            playbackId: true,
            status: true,
          },
        },
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
    let recordingSegments = liveSession.segments;

    if (liveSession.muxLiveStreamId) {
      const muxLiveStream = await getMuxLiveStream(liveSession.muxLiveStreamId);
      const assetIds = [
        ...muxLiveStream.recentAssetIds,
        ...(muxLiveStream.activeAssetId ? [muxLiveStream.activeAssetId] : []),
      ].filter((assetId, index, all) => all.indexOf(assetId) === index);
      const latestAssetId = assetIds.at(-1);
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
          status = idleMs >= LIVE_RECONNECT_WINDOW_MS ? "ENDED" : "LIVE";
        } else {
          const idleDetectedAt = latestAssetId ? (endedAt ?? new Date()) : null;
          const idleMs = idleDetectedAt
            ? Date.now() - idleDetectedAt.getTime()
            : 0;

          status = latestAssetId
            ? idleMs >= LIVE_RECONNECT_WINDOW_MS
              ? "ENDED"
              : "LIVE"
            : "SCHEDULED";
          endedAt = idleDetectedAt;
        }
      }

      if (assetIds.length > 0 && !recordingDeleted) {
        for (const assetId of assetIds) {
          const muxAsset = await getMuxAsset(assetId).catch(() => null);

          await upsertLiveSessionRecordingSegment({
            liveSessionId: liveSession.id,
            muxAssetId: muxAsset?.muxAssetId ?? assetId,
            playbackId: muxAsset?.playbackId,
            status: muxAsset?.status ?? "preparing",
          });

          if (assetId === latestAssetId) {
            muxAssetId = muxAsset?.muxAssetId ?? assetId;
            recordingPlaybackId = muxAsset?.playbackId ?? recordingPlaybackId;
            recordingStatus = muxAsset?.status ?? recordingStatus ?? "preparing";
          }
        }

        recordingSegments = await prisma.liveSessionSegment.findMany({
          where: { liveSessionId: liveSession.id },
          orderBy: { sequence: "asc" },
          select: {
            playbackId: true,
            status: true,
          },
        });
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
        recordingPlaybackIds: recordingDeleted
          ? []
          : getVisibleRecordingPlaybackIds(recordingSegments, recordingPlaybackId),
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
