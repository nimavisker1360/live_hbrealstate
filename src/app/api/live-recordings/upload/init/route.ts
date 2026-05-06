import { randomUUID } from "node:crypto";
import { getCurrentSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { uploadInitSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type UploadInitResponse = {
  recordingId: string;
  uploadSessionId: string;
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number;
  isResume: boolean;
  expiresAt: string;
};

const UPLOAD_SESSION_EXPIRY_HOURS = 24;

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return jsonError("Authentication required.", 401);
    }

    if (session.role === "BUYER") {
      return jsonError("Unauthorized.", 403);
    }

    const payload = uploadInitSchema.parse(await request.json());
    const userId = session.sub;

    // Verify streamId ownership if provided
    let propertyId = payload.propertyId;
    if (payload.streamId) {
      const liveSession = await prisma.liveSession.findFirst({
        where: {
          id: payload.streamId,
          agentId: userId,
        },
        select: {
          id: true,
          propertyId: true,
        },
      });

      if (!liveSession) {
        return jsonError(
          "Live session not found or access denied.",
          404,
        );
      }

      propertyId = liveSession.propertyId;
    }

    // Find existing recording with same userId + fileName + fileSize
    const existingRecording = await prisma.liveRecording.findFirst({
      where: {
        userId,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
      },
      select: {
        id: true,
        status: true,
      },
    });

    // Handle existing recording states
    if (existingRecording) {
      const { id: recordingId, status } = existingRecording;

      // Completed recordings: cannot re-upload
      if (
        status === "READY" ||
        status === "PROCESSING" ||
        status === "UPLOADED"
      ) {
        return jsonError(
          "A completed recording already exists for this file.",
          409,
        );
      }

      // Failed recordings: reset and retry
      if (status === "FAILED") {
        const resetResult = await prisma.$transaction(async (tx) => {
          await tx.liveRecording.update({
            where: { id: recordingId },
            data: {
              status: "LOCAL_PENDING",
              retryCount: { increment: 1 },
              errorMessage: null,
            },
          });

          const uploadId = randomUUID();
          const expiresAt = new Date();
          expiresAt.setHours(
            expiresAt.getHours() + UPLOAD_SESSION_EXPIRY_HOURS,
          );

          const session = await tx.uploadSession.create({
            data: {
              recordingId,
              userId,
              uploadId,
              status: "ACTIVE",
              totalChunks: payload.totalChunks,
              chunkSize: payload.chunkSize,
              fileSize: payload.fileSize,
              expiresAt,
            },
          });

          return session;
        });

        return Response.json(
          {
            data: {
              recordingId,
              uploadSessionId: resetResult.id,
              uploadId: resetResult.uploadId,
              chunkSize: payload.chunkSize,
              totalChunks: payload.totalChunks,
              uploadedChunks: 0,
              isResume: false,
              expiresAt: resetResult.expiresAt.toISOString(),
            },
          },
          { status: 201 },
        );
      }

      // Pending or uploading: check for active session
      if (status === "LOCAL_PENDING" || status === "UPLOADING") {
        const activeSession = await prisma.uploadSession.findFirst({
          where: {
            recordingId,
            status: "ACTIVE",
            expiresAt: {
              gt: new Date(),
            },
          },
          select: {
            id: true,
            uploadId: true,
            uploadedChunks: true,
            expiresAt: true,
          },
        });

        if (activeSession) {
          return Response.json(
            {
              data: {
                recordingId,
                uploadSessionId: activeSession.id,
                uploadId: activeSession.uploadId,
                chunkSize: payload.chunkSize,
                totalChunks: payload.totalChunks,
                uploadedChunks: activeSession.uploadedChunks,
                isResume: true,
                expiresAt: activeSession.expiresAt.toISOString(),
              },
            },
            { status: 200 },
          );
        }

        // No active session: create new one
        const newSessionResult = await prisma.$transaction(async (tx) => {
          await tx.liveRecording.update({
            where: { id: recordingId },
            data: {
              status: "UPLOADING",
            },
          });

          const uploadId = randomUUID();
          const expiresAt = new Date();
          expiresAt.setHours(
            expiresAt.getHours() + UPLOAD_SESSION_EXPIRY_HOURS,
          );

          const uploadSession = await tx.uploadSession.create({
            data: {
              recordingId,
              userId,
              uploadId,
              status: "ACTIVE",
              totalChunks: payload.totalChunks,
              chunkSize: payload.chunkSize,
              fileSize: payload.fileSize,
              expiresAt,
            },
          });

          return uploadSession;
        });

        return Response.json(
          {
            data: {
              recordingId,
              uploadSessionId: newSessionResult.id,
              uploadId: newSessionResult.uploadId,
              chunkSize: payload.chunkSize,
              totalChunks: payload.totalChunks,
              uploadedChunks: 0,
              isResume: false,
              expiresAt: newSessionResult.expiresAt.toISOString(),
            },
          },
          { status: 200 },
        );
      }
    }

    // No existing recording: create new one with upload session
    const createResult = await prisma.$transaction(async (tx) => {
      const recording = await tx.liveRecording.create({
        data: {
          userId,
          streamId: payload.streamId || undefined,
          propertyId,
          title: payload.fileName,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          mimeType: payload.mimeType,
          status: "LOCAL_PENDING",
          sourceType: "LIVE_RECORDING",
        },
      });

      const uploadId = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(
        expiresAt.getHours() + UPLOAD_SESSION_EXPIRY_HOURS,
      );

      const uploadSession = await tx.uploadSession.create({
        data: {
          recordingId: recording.id,
          userId,
          uploadId,
          status: "ACTIVE",
          totalChunks: payload.totalChunks,
          chunkSize: payload.chunkSize,
          fileSize: payload.fileSize,
          expiresAt,
        },
      });

      return { recording, uploadSession };
    });

    return Response.json(
      {
        data: {
          recordingId: createResult.recording.id,
          uploadSessionId: createResult.uploadSession.id,
          uploadId: createResult.uploadSession.uploadId,
          chunkSize: payload.chunkSize,
          totalChunks: payload.totalChunks,
          uploadedChunks: 0,
          isResume: false,
          expiresAt: createResult.uploadSession.expiresAt.toISOString(),
        } satisfies UploadInitResponse,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
