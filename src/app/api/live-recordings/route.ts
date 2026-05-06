import { getCurrentSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type LiveRecordingResponse = {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  uploadProgress: number;
  retryCount: number;
  muxAssetId: string | null;
  playbackId: string | null;
  storageUrl: string | null;
  uploadedAt: string | null;
  createdAt: string;
  streamId: string | null;
};

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return jsonError("Authentication required.", 401);
    }

    if (session.role === "BUYER") {
      return jsonError("Unauthorized.", 403);
    }

    const recordings = await prisma.liveRecording.findMany({
      where: {
        userId: session.sub,
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        status: true,
        uploadProgress: true,
        retryCount: true,
        muxAssetId: true,
        playbackId: true,
        storageUrl: true,
        uploadedAt: true,
        createdAt: true,
        streamId: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const serialized = recordings.map((rec) => ({
      ...rec,
      fileSize: Number(rec.fileSize),
      uploadedAt: rec.uploadedAt?.toISOString() ?? null,
      createdAt: rec.createdAt.toISOString(),
    })) as LiveRecordingResponse[];

    return Response.json({ data: serialized });
  } catch (error) {
    return handleApiError(error);
  }
}
