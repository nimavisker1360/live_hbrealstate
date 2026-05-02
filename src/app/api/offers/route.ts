import { OfferStatus, type Prisma } from "@/generated/prisma/client";
import { getStringParam, handleApiError, jsonError } from "@/lib/api";
import { ensureMockContext } from "@/lib/db-defaults";
import { prisma } from "@/lib/prisma";
import { offerPayloadSchema } from "@/lib/schemas";
import { getCurrentSession } from "@/lib/auth";

function serializeOffer<T extends { amount: { toString(): string } }>(
  offer: T,
) {
  return {
    ...offer,
    amount: offer.amount.toString(),
  };
}

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return jsonError("Authentication required.", 401);
    }

    if (session.role === "BUYER") {
      return jsonError("Unauthorized.", 403);
    }

    const agentId = getStringParam(request, "agentId");
    const propertyId = getStringParam(request, "propertyId");
    const roomId = getStringParam(request, "roomId");
    const status = getStringParam(request, "status")?.toUpperCase();

    if (status && !(status in OfferStatus)) {
      return jsonError("Invalid offer status filter.", 400);
    }

    const where: Prisma.OfferWhereInput = {
      ...(agentId ? { agentId } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(roomId ? { liveSession: { roomId } } : {}),
      ...(status ? { status: status as OfferStatus } : {}),
    };

    const offers = await prisma.offer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        agent: { select: { id: true, name: true, company: true } },
        property: { select: { id: true, title: true, location: true } },
        liveSession: { select: { id: true, roomId: true, title: true } },
      },
    });

    return Response.json({ data: offers.map(serializeOffer) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = offerPayloadSchema.parse(await request.json());
    const { agent, property, liveSession } = await ensureMockContext({
      agentId: payload.agentId,
      agentName: payload.agentName,
      propertyId: payload.propertyId,
      propertyTitle: payload.propertyTitle,
      propertyLocation: payload.propertyLocation,
      roomId: payload.roomId,
      sessionTitle: payload.propertyTitle,
    });

    const offer = await prisma.offer.create({
      data: {
        agentId: agent.id,
        propertyId: property.id,
        liveSessionId: liveSession?.id,
        buyerName: payload.buyerName,
        phone: payload.phone,
        amount: payload.amount,
        currency: payload.currency,
        message: payload.message,
      },
      include: {
        agent: { select: { id: true, name: true, company: true } },
        property: { select: { id: true, title: true, location: true } },
        liveSession: { select: { id: true, roomId: true, title: true } },
      },
    });

    return Response.json({ data: serializeOffer(offer) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
