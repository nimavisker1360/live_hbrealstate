import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function getWritableSession() {
  const session = await getCurrentSession().catch(() => null);

  if (!session) {
    return { response: jsonError("Authentication required.", 401) };
  }

  const user = await getSessionBackedByDatabase(session);

  if (user.role === "BUYER") {
    return { response: jsonError("Unauthorized.", 403) };
  }

  return { user };
}

export async function GET() {
  try {
    const writable = await getWritableSession();

    if (writable.response) {
      return writable.response;
    }

    const recordings = await prisma.liveRecording.findMany({
      where: { userId: writable.user.sub },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        createdAt: true,
        errorMessage: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        playbackId: true,
        status: true,
        title: true,
        uploadProgress: true,
        uploadedAt: true,
        property: {
          select: {
            location: true,
            title: true,
          },
        },
        stream: {
          select: {
            roomId: true,
            title: true,
          },
        },
        uploadSessions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            totalChunks: true,
            uploadedChunks: true,
          },
        },
      },
    });

    return Response.json({
      data: recordings.map((recording) => ({
        ...recording,
        createdAt: recording.createdAt.toISOString(),
        fileSize: recording.fileSize.toString(),
        uploadedAt: recording.uploadedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
