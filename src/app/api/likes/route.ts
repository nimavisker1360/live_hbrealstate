import { getStringParam, handleApiError, jsonError } from "@/lib/api";
import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { prisma } from "@/lib/prisma";
import {
  PUSHER_EVENTS,
  getLivePresenceChannel,
  type RealtimeLikeEvent,
} from "@/lib/pusher-channels";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { likePayloadSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const LIKE_COOLDOWN_MS = 2_000;
const recentLikeAttempts = new Map<string, number>();

async function findLiveSession(liveSessionId?: string, roomId?: string) {
  if (liveSessionId) {
    return prisma.liveSession.findUnique({
      where: { id: liveSessionId },
      select: { id: true },
    });
  }

  if (roomId) {
    return prisma.liveSession.findUnique({
      where: { roomId },
      select: { id: true },
    });
  }

  return null;
}

function getCooldownKey(liveSessionId: string, userId: string) {
  return `${liveSessionId}:${userId}`;
}

function pruneRecentLikeAttempts(now: number) {
  for (const [key, timestamp] of recentLikeAttempts) {
    if (now - timestamp > LIKE_COOLDOWN_MS * 4) {
      recentLikeAttempts.delete(key);
    }
  }
}

export async function GET(request: Request) {
  try {
    const liveSessionId = getStringParam(request, "liveSessionId");
    const roomId = getStringParam(request, "roomId");
    const liveSession = await findLiveSession(liveSessionId, roomId);

    if (!liveSession) {
      return jsonError("Live session not found.", 404);
    }

    const count = await prisma.likeEvent.count({
      where: { liveSessionId: liveSession.id },
    });

    return Response.json({
      data: {
        liveSessionId: liveSession.id,
        count,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const rawSession = await getCurrentSession().catch(() => null);

    if (!rawSession) {
      return jsonError("Authentication required.", 401);
    }

    const session = await getSessionBackedByDatabase(rawSession);

    const payload = likePayloadSchema.parse(await request.json());
    const liveSession = await findLiveSession(
      payload.liveSessionId,
      payload.roomId,
    );

    if (!liveSession) {
      return jsonError("Live session not found.", 404);
    }

    const now = Date.now();
    const cooldownKey = getCooldownKey(liveSession.id, session.sub);
    const lastAttemptAt = recentLikeAttempts.get(cooldownKey);

    if (lastAttemptAt && now - lastAttemptAt < LIKE_COOLDOWN_MS) {
      const count = await prisma.likeEvent.count({
        where: { liveSessionId: liveSession.id },
      });

      return Response.json(
        {
          data: {
            liveSessionId: liveSession.id,
            count,
            retryAfterMs: LIKE_COOLDOWN_MS - (now - lastAttemptAt),
          },
          error: { message: "Please wait before liking again." },
        },
        { status: 429 },
      );
    }

    const cooldownStart = new Date(now - LIKE_COOLDOWN_MS);
    const recentLike = await prisma.likeEvent.findFirst({
      where: {
        liveSessionId: liveSession.id,
        userId: session.sub,
        createdAt: { gte: cooldownStart },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (recentLike) {
      const count = await prisma.likeEvent.count({
        where: { liveSessionId: liveSession.id },
      });

      return Response.json(
        {
          data: {
            liveSessionId: liveSession.id,
            count,
            retryAfterMs: Math.max(
              0,
              LIKE_COOLDOWN_MS - (now - recentLike.createdAt.getTime()),
            ),
          },
          error: { message: "Please wait before liking again." },
        },
        { status: 429 },
      );
    }

    await prisma.likeEvent.create({
      data: {
        liveSessionId: liveSession.id,
        userId: session.sub,
        visitorId: payload.visitorId,
      },
    });

    recentLikeAttempts.set(cooldownKey, now);
    pruneRecentLikeAttempts(now);

    const count = await prisma.likeEvent.count({
      where: { liveSessionId: liveSession.id },
    });

    await triggerRealtimeEvent(
      getLivePresenceChannel(liveSession.id),
      PUSHER_EVENTS.LIKE_CREATED,
      {
        clientEventId: payload.clientEventId,
        liveSessionId: liveSession.id,
        count,
        userId: session.sub,
        userName: session.name ?? session.email ?? "Someone",
      } satisfies RealtimeLikeEvent,
    );

    return Response.json(
      {
        data: {
          liveSessionId: liveSession.id,
          count,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
