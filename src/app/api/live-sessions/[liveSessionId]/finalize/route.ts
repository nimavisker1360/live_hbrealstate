import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type FinalizeContext = {
  params: Promise<{
    liveSessionId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: FinalizeContext,
) {
  try {
    const { liveSessionId } = await params;
    const { viewers } = (await request.json().catch(() => ({}))) as {
      viewers?: number;
    };

    if (!liveSessionId) {
      return jsonError("Live session ID is required.", 400);
    }

    // Get lead count for this session
    const leadCount = await prisma.lead.count({
      where: { liveSessionId },
    });

    // Get offer count for this session
    const offerCount = await prisma.offer.count({
      where: { liveSessionId },
    });

    // Update live session with final stats
    const updatedSession = await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: {
        viewers: viewers ?? 0,
        // You can add more fields if needed
      },
      select: {
        id: true,
        viewers: true,
        status: true,
        endedAt: true,
      },
    });

    return Response.json({
      data: {
        ...updatedSession,
        leads: leadCount,
        offers: offerCount,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
