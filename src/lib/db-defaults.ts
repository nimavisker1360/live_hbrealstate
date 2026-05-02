import { prisma } from "@/lib/prisma";

export const MOCK_AGENT_ID = "agent-hb-live";
export const MOCK_PROPERTY_ID = "property-hb-live";
export const MOCK_ROOM_ID = "hb-live-room";

type EnsureContextInput = {
  agentId?: string;
  agentName?: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyLocation?: string;
  roomId?: string;
  sessionTitle?: string;
};

export async function ensureMockContext({
  agentId = MOCK_AGENT_ID,
  agentName = "HB Live Agent",
  propertyId = MOCK_PROPERTY_ID,
  propertyTitle = "HB Live Property",
  propertyLocation = "Istanbul, Turkey",
  roomId,
  sessionTitle,
}: EnsureContextInput) {
  const agent = await prisma.agent.upsert({
    where: { id: agentId },
    update: {
      name: agentName,
    },
    create: {
      id: agentId,
      name: agentName,
      company: "HB Real Estate",
      status: "ACTIVE",
      subscriptionPlan: "PRO",
    },
  });

  const property = await prisma.property.upsert({
    where: { id: propertyId },
    update: {
      title: propertyTitle,
      location: propertyLocation,
      agentId: agent.id,
    },
    create: {
      id: propertyId,
      agentId: agent.id,
      title: propertyTitle,
      location: propertyLocation,
    },
  });

  const liveSession = roomId
    ? await prisma.liveSession.upsert({
        where: { roomId },
        update: {
          agentId: agent.id,
          propertyId: property.id,
          title: sessionTitle ?? property.title,
        },
        create: {
          roomId,
          agentId: agent.id,
          propertyId: property.id,
          title: sessionTitle ?? property.title,
          status: "LIVE",
        },
      })
    : null;

  return {
    agent,
    property,
    liveSession,
  };
}
