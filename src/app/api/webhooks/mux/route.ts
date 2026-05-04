import { createHmac, timingSafeEqual } from "node:crypto";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type MuxWebhookEvent = {
  type?: string;
  data?: {
    id?: string;
    active_asset_id?: string;
    live_stream_id?: string;
    playback_ids?: Array<{ id?: string }>;
    recent_asset_ids?: string[];
    status?: string;
    stream_key?: string;
  };
};

function verifyMuxSignature(body: string, signatureHeader: string | null) {
  const secret = process.env.MUX_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  if (!signatureHeader) {
    return false;
  }

  const signatureParts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");

      return [key, value];
    }),
  );
  const timestamp = signatureParts.t;
  const signature = signatureParts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const receivedAt = Number(timestamp) * 1000;

  if (!Number.isFinite(receivedAt) || Math.abs(Date.now() - receivedAt) > 300_000) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

function getSessionStatus(eventType?: string, muxStatus?: string) {
  if (
    eventType === "video.live_stream.active" ||
    eventType === "video.live_stream.recording" ||
    muxStatus === "active"
  ) {
    return "LIVE" as const;
  }

  if (
    eventType === "video.live_stream.disabled" ||
    eventType === "video.live_stream.deleted" ||
    eventType === "video.live_stream.disconnected" ||
    eventType === "video.live_stream.idle" ||
    muxStatus === "disabled"
  ) {
    return "ENDED" as const;
  }

  if (muxStatus === "idle") {
    return "SCHEDULED" as const;
  }

  return null;
}

function isAssetEvent(eventType?: string) {
  return Boolean(eventType?.startsWith("video.asset."));
}

export async function POST(request: Request) {
  try {
    const body = await request.text();

    if (!verifyMuxSignature(body, request.headers.get("mux-signature"))) {
      return jsonError("Invalid Mux signature.", 401);
    }

    const event = JSON.parse(body) as MuxWebhookEvent;
    const status = getSessionStatus(event.type, event.data?.status);
    const playbackIds =
      event.data?.playback_ids
        ?.map((playbackId) => playbackId.id)
        .filter((playbackId): playbackId is string => Boolean(playbackId)) ?? [];
    const muxAssetId = isAssetEvent(event.type)
      ? event.data?.id
      : (event.data?.active_asset_id ?? event.data?.recent_asset_ids?.at(-1));
    const muxLiveStreamId = isAssetEvent(event.type)
      ? event.data?.live_stream_id
      : event.data?.id;
    const recordingPlaybackId = isAssetEvent(event.type)
      ? playbackIds[0]
      : undefined;
    const streamKey = event.data?.stream_key;

    if (
      !status &&
      !muxAssetId &&
      !muxLiveStreamId &&
      !streamKey &&
      playbackIds.length === 0
    ) {
      return Response.json({ data: { ignored: true } });
    }

    await prisma.liveSession.updateMany({
      where: {
        NOT: {
          recordingStatus: "deleted",
        },
        OR: [
          ...(muxAssetId ? [{ muxAssetId }] : []),
          ...(muxLiveStreamId ? [{ muxLiveStreamId }] : []),
          ...(streamKey ? [{ streamKey }] : []),
          ...(playbackIds.length > 0 ? [{ playbackId: { in: playbackIds } }] : []),
          ...(playbackIds.length > 0
            ? [{ recordingPlaybackId: { in: playbackIds } }]
            : []),
        ],
      },
      data: {
        ...(status ? { status } : {}),
        ...(status ? { endedAt: status === "ENDED" ? new Date() : null } : {}),
        ...(muxAssetId ? { muxAssetId } : {}),
        ...(recordingPlaybackId
          ? {
              recordingPlaybackId,
              recordingReadyAt: new Date(),
              recordingStatus: event.data?.status ?? "ready",
            }
          : muxAssetId
            ? { recordingStatus: event.data?.status ?? "preparing" }
            : {}),
      },
    });

    return Response.json({ data: { ok: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
