import { ensureMockContext } from "@/lib/db-defaults";
import { sendLeadNotificationEmail } from "@/lib/lead-email";
import { prisma } from "@/lib/prisma";
import { leadPayloadSchema } from "@/lib/schemas";

export async function createLeadAndSendEmail(input: unknown) {
  const payload = leadPayloadSchema.parse(input);
  const { agent, property, liveSession } = await ensureMockContext({
    agentId: payload.agentId,
    agentName: payload.agentName,
    propertyId: payload.propertyId,
    propertyTitle: payload.propertyTitle,
    propertyLocation: payload.propertyLocation,
    roomId: payload.roomId,
    sessionTitle: payload.propertyTitle,
  });

  const lead = await prisma.lead.create({
    data: {
      agentId: agent.id,
      propertyId: property.id,
      liveSessionId: liveSession?.id,
      fullName: payload.fullName,
      phone: payload.phone,
      interest: payload.interest,
      budget: payload.budget,
      source: payload.source,
      message: payload.message,
    },
    include: {
      agent: { select: { id: true, name: true, company: true } },
      property: { select: { id: true, title: true, location: true } },
      liveSession: { select: { id: true, roomId: true, title: true } },
    },
  });

  try {
    await sendLeadNotificationEmail(lead);
  } catch (emailError) {
    console.error("Lead notification email failed:", emailError);
  }

  return lead;
}
