import { LeadStatus, type Prisma } from "@/generated/prisma/client";
import { handleApiError, getStringParam, jsonError } from "@/lib/api";
import { ensureMockContext } from "@/lib/db-defaults";
import { prisma } from "@/lib/prisma";
import { leadPayloadSchema } from "@/lib/schemas";
import { getCurrentSession } from "@/lib/auth";
import { sendLeadNotificationEmail } from "@/lib/lead-email";

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

    if (status && !(status in LeadStatus)) {
      return jsonError("Invalid lead status filter.", 400);
    }

    const where: Prisma.LeadWhereInput = {
      ...(agentId ? { agentId } : {}),
      ...(propertyId ? { propertyId } : {}),
      ...(roomId ? { liveSession: { roomId } } : {}),
      ...(status ? { status: status as LeadStatus } : {}),
    };

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        agent: { select: { id: true, name: true, company: true } },
        property: { select: { id: true, title: true, location: true } },
        liveSession: { select: { id: true, roomId: true, title: true } },
      },
    });

    return Response.json({ data: leads });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = leadPayloadSchema.parse(await request.json());
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

    return Response.json({ data: lead }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
