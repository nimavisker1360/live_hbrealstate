import { randomUUID } from "node:crypto";
import { getCurrentSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";
import { ensureMockContext } from "@/lib/db-defaults";
import {
  MUX_RTMP_URL,
  MuxApiError,
  MuxConfigurationError,
  createMuxLiveStream,
} from "@/lib/mux";
import { prisma } from "@/lib/prisma";
import { liveSessionPayloadSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function slugifyRoomPart(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "live"
  );
}

function serializeLiveSession<
  T extends {
    createdAt: Date;
    endedAt: Date | null;
    playbackId: string | null;
    rtmpUrl?: string | null;
    roomId: string;
    startsAt: Date | null;
    updatedAt: Date;
  },
>(
  liveSession: T,
  origin?: string,
) {
  const livePagePath = `/live/${liveSession.roomId}`;

  return {
    ...liveSession,
    createdAt: liveSession.createdAt.toISOString(),
    endedAt: liveSession.endedAt?.toISOString() ?? null,
    hlsUrl: liveSession.playbackId
      ? `https://stream.mux.com/${liveSession.playbackId}.m3u8`
      : null,
    ingestUrl: liveSession.rtmpUrl ?? MUX_RTMP_URL,
    livePageUrl: origin ? `${origin}${livePagePath}` : livePagePath,
    rtmpUrl: liveSession.rtmpUrl ?? MUX_RTMP_URL,
    startsAt: liveSession.startsAt?.toISOString() ?? null,
    updatedAt: liveSession.updatedAt.toISOString(),
  };
}

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

    const liveSessions = await prisma.liveSession.findMany({
      where: writable.session ? { agentId: writable.session.sub } : undefined,
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        agent: { select: { id: true, name: true, company: true } },
        property: { select: { id: true, title: true, location: true } },
      },
    });

    return Response.json({
      data: liveSessions.map((liveSession) => serializeLiveSession(liveSession)),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const writable = await getWritableSession();

    if (writable.response) {
      return writable.response;
    }

    const payload = liveSessionPayloadSchema.parse(await request.json());
    const title = payload.title ?? payload.propertyTitle;
    const propertyId =
      payload.propertyId ??
      `property-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const roomId =
      payload.roomId ??
      `${slugifyRoomPart(title)}-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const muxLiveStream = await createMuxLiveStream();
    const startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
    const { liveSession } = await ensureMockContext({
      agentId: payload.agentId ?? writable.session?.sub,
      agentName: payload.agentName ?? writable.session?.name ?? "HB Live Agent",
      propertyId,
      propertyTitle: payload.propertyTitle,
      propertyLocation: payload.propertyLocation,
      propertyDescription: payload.propertyDescription,
      propertyImage: payload.propertyImage,
      roomId,
      sessionTitle: title,
      status: "SCHEDULED",
    });

    if (!liveSession) {
      return jsonError("Could not create live session.", 500);
    }

    const updatedLiveSession = await prisma.liveSession.update({
      where: { id: liveSession.id },
      data: {
        playbackId: muxLiveStream.playbackId,
        muxLiveStreamId: muxLiveStream.muxLiveStreamId,
        rtmpUrl: muxLiveStream.rtmpUrl,
        startsAt,
        streamKey: muxLiveStream.streamKey,
        streamProvider: payload.streamProvider,
      },
      include: {
        agent: { select: { id: true, name: true, company: true } },
        property: { select: { id: true, title: true, location: true, image: true } },
      },
    });

    return Response.json(
      {
        data: serializeLiveSession(
          updatedLiveSession,
          new URL(request.url).origin,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MuxConfigurationError) {
      console.error(error);
      return jsonError(error.message, 500);
    }

    if (error instanceof MuxApiError) {
      console.error("Mux live stream creation failed.", error);
      return jsonError(
        error.message ||
          "Mux could not create the live stream. Check your Mux credentials and try again.",
        502,
        { muxStatus: error.status },
      );
    }

    return handleApiError(error);
  }
}
