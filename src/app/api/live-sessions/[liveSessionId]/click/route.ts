import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ClickRouteContext = {
  params: Promise<{
    liveSessionId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: ClickRouteContext,
) {
  try {
    const { liveSessionId } = await params;
    const { type } = (await request.json().catch(() => ({}))) as {
      type?: string;
    };

    if (!type || !["whatsapp", "book", "details"].includes(type)) {
      return jsonError("Invalid click type.", 400);
    }

    let updateData: Record<string, unknown> = {};

    if (type === "whatsapp") {
      updateData = {
        whatsappClicks: {
          increment: 1,
        },
      };
    }

    const liveSession = await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: updateData,
      select: {
        id: true,
        whatsappClicks: true,
      },
    });

    return Response.json({ data: liveSession });
  } catch (error) {
    return handleApiError(error);
  }
}
