import { readFileSync, rmSync, readdirSync } from "fs";
import { join } from "path";
import { getCurrentSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";
import { createMuxAssetFromFile, MuxApiError, MuxConfigurationError } from "@/lib/mux";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const completeSchema = z.object({
  uploadSessionId: z.string().trim().min(1),
  createMuxAsset: z.boolean().default(false),
});

type CompleteResponse = {
  recordingId: string;
  uploadSessionId: string;
  status: "UPLOADED" | "PROCESSING";
  muxAssetId: string | null;
  playbackId: string | null;
  storageUrl: string;
  uploadedAt: string;
  message: string;
};

const UPLOAD_TEMP_DIR = "/tmp/uploads";

function getSessionUploadDir(uploadSessionId: string) {
  return join(UPLOAD_TEMP_DIR, uploadSessionId);
}

function getChunkPath(uploadSessionId: string, chunkIndex: number) {
  return join(getSessionUploadDir(uploadSessionId), `chunk-${chunkIndex}`);
}

function getFinalFilePath(uploadSessionId: string) {
  return join(getSessionUploadDir(uploadSessionId), "final.mp4");
}

async function assembleChunks(
  uploadSessionId: string,
  totalChunks: number,
): Promise<string> {
  const uploadDir = getSessionUploadDir(uploadSessionId);
  const finalFilePath = getFinalFilePath(uploadSessionId);

  // Read all chunks and concatenate
  const chunks: Buffer[] = [];

  for (let i = 0; i < totalChunks; i += 1) {
    const chunkPath = getChunkPath(uploadSessionId, i);
    try {
      const chunkData = readFileSync(chunkPath);
      chunks.push(chunkData);
    } catch {
      throw new Error(`Chunk ${i} not found at ${chunkPath}`);
    }
  }

  if (chunks.length !== totalChunks) {
    throw new Error(`Expected ${totalChunks} chunks, got ${chunks.length}`);
  }

  const finalBuffer = Buffer.concat(chunks);
  // Save final file (in production, this would upload to S3/CDN)
  const { writeFileSync } = await import("fs");
  writeFileSync(finalFilePath, finalBuffer);

  return finalFilePath;
}

function cleanupTempFiles(uploadSessionId: string) {
  const uploadDir = getSessionUploadDir(uploadSessionId);
  try {
    rmSync(uploadDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to cleanup temp files for ${uploadSessionId}:`, error);
  }
}

export async function POST(request: Request) {
  let uploadSessionId: string | null = null;

  try {
    const session = await getCurrentSession();

    if (!session) {
      return jsonError("Authentication required.", 401);
    }

    if (session.role === "BUYER") {
      return jsonError("Unauthorized.", 403);
    }

    const payload = completeSchema.parse(await request.json());
    uploadSessionId = payload.uploadSessionId;
    const userId = session.sub;

    // Find and verify upload session ownership
    const uploadSession = await prisma.uploadSession.findUnique({
      where: { id: payload.uploadSessionId },
      include: {
        recording: {
          select: {
            id: true,
            userId: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            title: true,
          },
        },
      },
    });

    if (!uploadSession) {
      return jsonError("Upload session not found.", 404);
    }

    if (uploadSession.userId !== userId) {
      return jsonError("Access denied to this upload session.", 403);
    }

    if (uploadSession.status !== "ACTIVE") {
      return jsonError("Upload session is not active.", 400);
    }

    // Verify all chunks are uploaded
    if (uploadSession.uploadedChunks !== uploadSession.totalChunks) {
      return jsonError(
        `Not all chunks uploaded. Expected ${uploadSession.totalChunks}, got ${uploadSession.uploadedChunks}.`,
        400,
      );
    }

    const recording = uploadSession.recording;

    // Assemble chunks into final file
    let finalFilePath: string;
    try {
      finalFilePath = await assembleChunks(
        payload.uploadSessionId,
        uploadSession.totalChunks,
      );
    } catch (error) {
      return jsonError(
        `Failed to assemble chunks: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }

    // Optionally create Mux asset
    let muxAssetId: string | null = null;
    let playbackId: string | null = null;
    let recordingStatus: "UPLOADED" | "PROCESSING" = "UPLOADED";

    if (payload.createMuxAsset) {
      try {
        const muxResult = await createMuxAssetFromFile(finalFilePath);
        muxAssetId = muxResult.muxAssetId;
        playbackId = muxResult.playbackId;
        recordingStatus = muxResult.status === "ready" ? "UPLOADED" : "PROCESSING";
      } catch (error) {
        if (error instanceof MuxConfigurationError) {
          console.warn("Mux not configured; skipping asset creation");
        } else if (error instanceof MuxApiError) {
          console.error("Mux asset creation failed:", error);
          return jsonError(
            `Mux asset creation failed: ${error.message}`,
            502,
            { muxStatus: error.status },
          );
        } else {
          throw error;
        }
      }
    }

    // Update database in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedRecording = await tx.liveRecording.update({
        where: { id: recording.id },
        data: {
          status: recordingStatus,
          muxAssetId: muxAssetId || undefined,
          playbackId: playbackId || undefined,
          storageUrl: finalFilePath,
          uploadProgress: 100,
          uploadedAt: new Date(),
          errorMessage: null,
        },
      });

      await tx.uploadSession.update({
        where: { id: payload.uploadSessionId },
        data: {
          status: "COMPLETED",
        },
      });

      return updatedRecording;
    });

    // Cleanup temporary files in background (non-blocking)
    cleanupTempFiles(payload.uploadSessionId);

    const response: CompleteResponse = {
      recordingId: result.id,
      uploadSessionId: payload.uploadSessionId,
      status: recordingStatus,
      muxAssetId,
      playbackId,
      storageUrl: finalFilePath,
      uploadedAt: result.uploadedAt?.toISOString() ?? new Date().toISOString(),
      message:
        recordingStatus === "PROCESSING"
          ? "Recording uploaded and queued for processing."
          : "Recording uploaded successfully.",
    };

    return Response.json({ data: response }, { status: 200 });
  } catch (error) {
    // Attempt cleanup on error
    if (uploadSessionId) {
      cleanupTempFiles(uploadSessionId);
    }

    return handleApiError(error);
  }
}
