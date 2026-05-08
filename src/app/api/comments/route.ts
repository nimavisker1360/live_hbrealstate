import type { Prisma } from "@/generated/prisma/client";
import { getStringParam, handleApiError, jsonError } from "@/lib/api";
import { MOCK_ROOM_ID, ensureMockContext } from "@/lib/db-defaults";
import { prisma } from "@/lib/prisma";
import {
  PUSHER_EVENTS,
  getLivePresenceChannel,
  type RealtimeCommentEvent,
} from "@/lib/pusher-channels";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { commentPayloadSchema } from "@/lib/schemas";
import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { getConsultantById } from "@/lib/hb-consultants";

export const runtime = "nodejs";

function resolveLiveCommentAuthor({
  agentName,
  fallbackAuthor,
  session,
  consultantId,
}: {
  agentName?: string | null;
  fallbackAuthor: string;
  session: Awaited<ReturnType<typeof getSessionBackedByDatabase>> | null;
  consultantId?: string | null;
}) {
  const isAgent = session?.role === "AGENT" || session?.role === "OWNER";

  if (isAgent) {
    return (
      getConsultantById(consultantId)?.name?.trim() ||
      agentName?.trim() ||
      session?.name?.trim() ||
      fallbackAuthor
    );
  }

  return session?.name?.trim() || fallbackAuthor;
}

export async function GET(request: Request) {
  try {
    const liveSessionId = getStringParam(request, "liveSessionId");
    const propertyId = getStringParam(request, "propertyId");
    const roomId = getStringParam(request, "roomId");

    const where: Prisma.CommentWhereInput = {
      ...(liveSessionId ? { liveSessionId } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(roomId ? { liveSession: { roomId } } : {}),
    };

    const comments = await prisma.comment.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        property: { select: { id: true, title: true } },
        liveSession: { select: { id: true, roomId: true, title: true } },
      },
    });

    return Response.json({ data: comments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const rawSession = await getCurrentSession().catch(() => null);
    const session = rawSession
      ? await getSessionBackedByDatabase(rawSession)
      : null;
    const payload = commentPayloadSchema.parse(await request.json());
    const context = payload.liveSessionId
      ? await prisma.liveSession.findUnique({
          where: { id: payload.liveSessionId },
          select: {
            agent: true,
            id: true,
            property: true,
            title: true,
          },
        })
      : null;

    if (payload.liveSessionId && !context) {
      return jsonError("Live session not found.", 404);
    }

    const fallbackContext = context
      ? null
      : await ensureMockContext({
          agentId: payload.agentId,
          propertyId: payload.propertyId,
          propertyTitle: payload.propertyTitle,
          propertyLocation: payload.propertyLocation,
          roomId: payload.roomId ?? MOCK_ROOM_ID,
          sessionTitle: payload.propertyTitle,
        });

    const liveSession = context ?? fallbackContext?.liveSession;
    const property = context?.property ?? fallbackContext?.property;
    const agent = context?.agent ?? fallbackContext?.agent;

    if (!liveSession || !property) {
      return jsonError("A property reel is required for comments.", 400);
    }

    const comment = await prisma.comment.create({
      data: {
        agentId: agent?.id,
        propertyId: property.id,
        liveSessionId: liveSession.id,
        userId: session?.sub,
        author: resolveLiveCommentAuthor({
          agentName: agent?.name,
          consultantId: property.consultantId,
          fallbackAuthor: payload.author,
          session,
        }),
        message: payload.message,
      },
      include: {
        property: { select: { id: true, title: true } },
        liveSession: { select: { id: true, roomId: true, title: true } },
      },
    });

    await triggerRealtimeEvent(
      getLivePresenceChannel(liveSession.id),
      PUSHER_EVENTS.COMMENT_CREATED,
      {
        clientEventId: payload.clientEventId,
        comment: {
          id: comment.id,
          author: comment.author,
          message: comment.message,
          liveSessionId: comment.liveSessionId,
          createdAt: comment.createdAt.toISOString(),
        },
      } satisfies RealtimeCommentEvent,
    );

    return Response.json({ data: comment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
