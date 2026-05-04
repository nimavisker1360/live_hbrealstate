import { getStringParam, handleApiError, jsonError } from "@/lib/api";
import { getMuxLiveStream } from "@/lib/mux";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type DatabaseStreamStatus = "SCHEDULED" | "LIVE" | "ENDED";

function mapMuxStatus(status?: string | null): DatabaseStreamStatus | null {
  if (status === "active") {
    return "LIVE";
  }

  if (status === "idle") {
    return "SCHEDULED";
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
        muxLiveStreamId: true,
        playbackId: true,
        roomId: true,
        startsAt: true,
        status: true,
      },
    });

    if (!liveSession) {
      return jsonError("Live session not found.", 404);
    }

    let playbackId = liveSession.playbackId;
    let status = liveSession.status;

    if (liveSession.muxLiveStreamId) {
      const muxLiveStream = await getMuxLiveStream(liveSession.muxLiveStreamId);
      const muxStatus = mapMuxStatus(muxLiveStream.status);

      playbackId = muxLiveStream.playbackId ?? playbackId;
      status = muxStatus ?? status;

      if (
        status !== liveSession.status ||
        playbackId !== liveSession.playbackId
      ) {
        await prisma.liveSession.update({
          where: { id: liveSession.id },
          data: {
            endedAt: status === "ENDED" ? new Date() : null,
            playbackId,
            status,
          },
        });
      }
    }

    return Response.json({
      data: {
        id: liveSession.id,
        playbackId,
        roomId: liveSession.roomId,
        startsAt: liveSession.startsAt?.toISOString() ?? null,
        status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
