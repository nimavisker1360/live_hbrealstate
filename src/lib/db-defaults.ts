import { prisma } from "@/lib/prisma";

export const MOCK_AGENT_ID = "agent-hb-reels";
export const MOCK_PROPERTY_ID = "property-hb-reels";
export const MOCK_ROOM_ID = "hb-property-reel";

export class MockContextError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MockContextError";
    this.status = status;
  }
}

type EnsureContextInput = {
  agentId?: string;
  agentName?: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyLocation?: string;
  propertyDescription?: string;
  propertyImage?: string;
  roomId?: string;
  sessionTitle?: string;
  status?: "ENDED";
};

export async function ensureMockContext({
  agentId = MOCK_AGENT_ID,
  propertyId = MOCK_PROPERTY_ID,
  propertyTitle = "HB Property Reel",
  propertyLocation = "Istanbul, Turkey",
  propertyDescription,
  propertyImage,
  roomId,
  sessionTitle,
  status = "ENDED",
}: EnsureContextInput) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, company: true, status: true },
  });

  if (!agent || agent.status !== "ACTIVE") {
    throw new MockContextError("Active agent context not found.", 404);
  }

  const property = await prisma.property.upsert({
    where: { id: propertyId },
    update: {
      title: propertyTitle,
      location: propertyLocation,
      agentId: agent.id,
      ...(propertyDescription && { description: propertyDescription }),
      ...(propertyImage && { image: propertyImage }),
    },
    create: {
      id: propertyId,
      agentId: agent.id,
      title: propertyTitle,
      location: propertyLocation,
      ...(propertyDescription && { description: propertyDescription }),
      ...(propertyImage && { image: propertyImage }),
    },
  });

  const liveSession = roomId
    ? await prisma.liveSession.upsert({
        where: { roomId },
        update: {
          agentId: agent.id,
          propertyId: property.id,
          status,
          title: sessionTitle ?? property.title,
        },
        create: {
          roomId,
          agentId: agent.id,
          propertyId: property.id,
          title: sessionTitle ?? property.title,
          status,
        },
      })
    : null;

  return {
    agent,
    property,
    liveSession,
  };
}
