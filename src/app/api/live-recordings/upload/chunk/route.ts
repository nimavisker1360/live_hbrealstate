import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { getCurrentSession } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const uploadChunkSchema = z.object({
  uploadSessionId: z.string().trim().min(1),
  chunkIndex: z.number().int().min(0),
});

const UPLOAD_TEMP_DIR = "/tmp/uploads";

function getSessionUploadDir(uploadSessionId: string) {
  return join(UPLOAD_TEMP_DIR, uploadSessionId);
}

function getChunkPath(uploadSessionId: string, chunkIndex: number) {
  return join(getSessionUploadDir(uploadSessionId), `chunk-${chunkIndex}`);
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return jsonError("Authentication required.", 401);
    }

    if (session.role === "BUYER") {
      return jsonError("Unauthorized.", 403);
    }

    const url = new URL(request.url);
    const uploadSessionId = url.searchParams.get("uploadSessionId");
    const chunkIndexStr = url.searchParams.get("chunkIndex");

    if (!uploadSessionId || !chunkIndexStr) {
      return jsonError("uploadSessionId and chunkIndex are required.", 400);
    }

    const payload = uploadChunkSchema.parse({
      uploadSessionId,
      chunkIndex: Number(chunkIndexStr),
    });

    const userId = session.sub;

    // Verify upload session exists and belongs to user
    const uploadSession = await prisma.uploadSession.findUnique({
      where: { id: payload.uploadSessionId },
      select: {
        id: true,
        userId: true,
        status: true,
        totalChunks: true,
        uploadedChunks: true,
        expiresAt: true,
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

    if (uploadSession.expiresAt < new Date()) {
      return jsonError("Upload session has expired.", 410);
    }

    if (payload.chunkIndex >= uploadSession.totalChunks) {
      return jsonError(
        `Chunk index ${payload.chunkIndex} exceeds total chunks ${uploadSession.totalChunks}.`,
        400,
      );
    }

    // Read chunk data from request body
    const chunkBuffer = await request.arrayBuffer();

    if (chunkBuffer.byteLength === 0) {
      return jsonError("Chunk data is required.", 400);
    }

    // Create upload directory if needed
    const uploadDir = getSessionUploadDir(payload.uploadSessionId);
    mkdirSync(uploadDir, { recursive: true });

    // Write chunk to disk
    const chunkPath = getChunkPath(
      payload.uploadSessionId,
      payload.chunkIndex,
    );
    try {
      writeFileSync(chunkPath, Buffer.from(chunkBuffer));
    } catch (error) {
      return jsonError(
        `Failed to save chunk: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }

    // Update upload session with new chunk count
    const updatedSession = await prisma.uploadSession.update({
      where: { id: payload.uploadSessionId },
      data: {
        uploadedChunks: Math.max(uploadSession.uploadedChunks, payload.chunkIndex + 1),
      },
      select: {
        uploadedChunks: true,
        totalChunks: true,
      },
    });

    return Response.json(
      {
        data: {
          uploadSessionId: payload.uploadSessionId,
          chunkIndex: payload.chunkIndex,
          uploadedChunks: updatedSession.uploadedChunks,
          totalChunks: updatedSession.totalChunks,
          isComplete: updatedSession.uploadedChunks === updatedSession.totalChunks,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
