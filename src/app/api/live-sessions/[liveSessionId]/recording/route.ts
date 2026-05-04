import { getCurrentSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RecordingRouteContext = {
  params: Promise<{
    liveSessionId: string;
  }>;
};

async function getWritableSession() {
  const session = await getCurrentSession().catch(() => null);

  if (!session && process.env.NODE_ENV === "production") {
    return { response: jsonError("Authentication required.", 401) };
  }

  if (session?.role === "BUYER") {
    return { response: jsonError("Unauthorized.", 403) };
  }

  return { session };
}

export async function DELETE(
  _request: Request,
  { params }: RecordingRouteContext,
) {
  try {
    const writable = await getWritableSession();

    if (writable.response) {
      return writable.response;
    }

    const { liveSessionId } = await params;
    const liveSession = await prisma.liveSession.update({
      where: { id: liveSessionId },
      data: {
        muxAssetId: null,
        recordingPlaybackId: null,
        recordingReadyAt: null,
        recordingStatus: null,
      },
      select: {
        id: true,
        roomId: true,
      },
    });

    return Response.json({ data: liveSession });
  } catch (error) {
    return handleApiError(error);
  }
}
