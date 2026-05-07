import { revalidatePath } from "next/cache";
import { LiveRecordingStatus } from "@/generated/prisma/client";
import { handleApiError, jsonError } from "@/lib/api";
import { getRecordingDashboardUser } from "@/lib/live-recording-access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RecordingRouteContext = {
  params: Promise<{
    recordingId: string;
  }>;
};

async function readDeleteOptions(request: Request) {
  if (!request.body) {
    return { confirmMetadataDelete: false, deleteStorage: false };
  }

  return (await request.json().catch(() => ({}))) as {
    confirmMetadataDelete?: boolean;
    deleteStorage?: boolean;
  };
}

export async function PATCH(
  _request: Request,
  { params }: RecordingRouteContext,
) {
  try {
    const writable = await getRecordingDashboardUser();

    if (writable.response) {
      return writable.response;
    }

    const { recordingId } = await params;
    const recording = await prisma.liveRecording.findFirst({
      where: {
        id: recordingId,
        userId: writable.user.sub,
      },
      select: {
        id: true,
        muxAssetId: true,
        playbackId: true,
        status: true,
        storageUrl: true,
        uploadProgress: true,
      },
    });

    if (!recording) {
      return jsonError("Recording not found.", 404);
    }

    if (recording.status !== LiveRecordingStatus.FAILED) {
      return jsonError("Only failed recordings can be retried.", 409);
    }

    const hasUploadedVideo =
      recording.uploadProgress >= 100 ||
      Boolean(recording.storageUrl) ||
      Boolean(recording.playbackId) ||
      Boolean(recording.muxAssetId);

    if (!hasUploadedVideo) {
      return jsonError(
        "This recording has no uploaded video metadata to process.",
        409,
      );
    }

    const updated = await prisma.liveRecording.update({
      where: { id: recording.id },
      data: {
        errorMessage: null,
        retryCount: { increment: 1 },
        status: recording.playbackId
          ? LiveRecordingStatus.READY
          : LiveRecordingStatus.PROCESSING,
      },
      select: {
        id: true,
        retryCount: true,
        status: true,
        updatedAt: true,
      },
    });

    revalidatePath("/dashboard/live/recordings");
    revalidatePath(`/live/replay/${recording.id}`);

    return Response.json({
      data: {
        ...updated,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: RecordingRouteContext,
) {
  try {
    const writable = await getRecordingDashboardUser();

    if (writable.response) {
      return writable.response;
    }

    const options = await readDeleteOptions(request);

    if (options.deleteStorage) {
      return jsonError(
        "Storage deletion is not enabled from this action. Delete metadata only or use a dedicated confirmed storage deletion flow.",
        400,
      );
    }

    if (!options.confirmMetadataDelete) {
      return jsonError("Metadata deletion must be confirmed.", 400);
    }

    const { recordingId } = await params;
    const recording = await prisma.liveRecording.findFirst({
      where: {
        id: recordingId,
        userId: writable.user.sub,
      },
      select: {
        id: true,
      },
    });

    if (!recording) {
      return jsonError("Recording not found.", 404);
    }

    await prisma.liveRecording.delete({
      where: { id: recording.id },
      select: { id: true },
    });

    revalidatePath("/dashboard/live/recordings");
    revalidatePath(`/live/replay/${recording.id}`);

    return Response.json({
      data: {
        deletedMetadata: true,
        deletedStorage: false,
        id: recording.id,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
