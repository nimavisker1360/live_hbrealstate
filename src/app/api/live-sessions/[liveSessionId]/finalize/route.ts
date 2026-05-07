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
      return jsonError("Property reel ID is required.", 400);
    }

    const leadCount = await prisma.lead.count({
      where: { liveSessionId },
    });

    const offerCount = await prisma.offer.count({
      where: { liveSessionId },
    });

    const updatedSession = await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: {
        viewers: viewers ?? 0,
      },
      select: {
        id: true,
        viewers: true,
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
