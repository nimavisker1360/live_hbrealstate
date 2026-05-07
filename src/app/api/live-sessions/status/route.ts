import { getStringParam, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const liveSessionId = getStringParam(request, "liveSessionId");
    const roomId = getStringParam(request, "roomId");

    if (!liveSessionId && !roomId) {
      return jsonError("A property reel identifier is required.", 400);
    }

    const propertyReel = await prisma.liveSession.findFirst({
      where: liveSessionId ? { id: liveSessionId } : { roomId },
      select: {
        id: true,
        recordingPlaybackId: true,
        recordingStatus: true,
        roomId: true,
      },
    });

    if (!propertyReel) {
      return jsonError("Property reel not found.", 404);
    }

    return Response.json({
      data: {
        id: propertyReel.id,
        recordingStatus:
          propertyReel.recordingStatus ??
          (propertyReel.recordingPlaybackId ? "ready" : null),
        roomId: propertyReel.roomId,
        status: propertyReel.recordingPlaybackId ? "PUBLISHED" : "DRAFT",
        videoUrl: propertyReel.recordingPlaybackId ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
