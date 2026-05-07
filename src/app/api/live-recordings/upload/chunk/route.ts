import { del, put } from "@vercel/blob";
import {
  LiveRecordingStatus,
  Prisma,
  UploadSessionStatus,
} from "@/generated/prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const STORAGE_PROVIDER = "vercel_blob";
const DEFAULT_MAX_CHUNK_UPLOAD_BYTES = 4 * 1024 * 1024;
const ACTIVE_UPLOAD_STATUSES = [
  UploadSessionStatus.PENDING,
  UploadSessionStatus.UPLOADING,
] as const;
const ACTIVE_UPLOAD_STATUS_SET: ReadonlySet<UploadSessionStatus> = new Set(
  ACTIVE_UPLOAD_STATUSES,
);

class ChunkUploadError extends Error {
  details?: unknown;
  status: number;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ChunkUploadError";
    this.status = status;
    this.details = details;
  }
}

function readMaxChunkUploadBytes() {
  const configured = process.env.LIVE_RECORDING_MAX_CHUNK_UPLOAD_BYTES?.trim();

  if (!configured || !/^\d+$/.test(configured)) {
    return DEFAULT_MAX_CHUNK_UPLOAD_BYTES;
  }

  const parsed = Number(configured);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_CHUNK_UPLOAD_BYTES;
}

const MAX_CHUNK_UPLOAD_BYTES = readMaxChunkUploadBytes();

const chunkUploadFieldsSchema = z.object({
  uploadSessionId: z.string().trim().min(1).max(160),
  chunkIndex: z.coerce.number().int().min(0),
});

function getBlobAccess() {
  return process.env.LIVE_RECORDING_BLOB_ACCESS === "public"
    ? "public"
    : "private";
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 160);
}

function getChunkPathname({
  chunkIndex,
  fileName,
  recordingId,
  uploadSessionId,
}: {
  chunkIndex: number;
  fileName: string;
  recordingId: string;
  uploadSessionId: string;
}) {
  return [
    "live-recordings",
    recordingId,
    uploadSessionId,
    "chunks",
    `${String(chunkIndex).padStart(8, "0")}-${sanitizePathPart(fileName)}.part`,
  ].join("/");
}

function calculateProgress(uploadedChunks: number, totalChunks: number) {
  return Math.min(100, Math.floor((uploadedChunks / totalChunks) * 100));
}

function getExpectedChunkSize({
  chunkIndex,
  chunkSize,
  fileSize,
  totalChunks,
}: {
  chunkIndex: number;
  chunkSize: number;
  fileSize: bigint;
  totalChunks: number;
}) {
  const isLastChunk = chunkIndex === totalChunks - 1;

  if (!isLastChunk) {
    return chunkSize;
  }

  const bytesBeforeLastChunk = BigInt(chunkSize) * BigInt(totalChunks - 1);
  const expectedLastChunkSize = fileSize - bytesBeforeLastChunk;

  if (expectedLastChunkSize <= BigInt(0)) {
    return chunkSize;
  }

  return Number(expectedLastChunkSize);
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

async function getAuthenticatedUserId() {
  const session = await getCurrentSession().catch(() => null);

  if (!session) {
    throw new ChunkUploadError("Authentication required.", 401);
  }

  const user = await getSessionBackedByDatabase(session);

  return user.sub;
}

async function parseMultipartRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new ChunkUploadError(
      "Request must use multipart/form-data with fields uploadSessionId, chunkIndex, and chunk.",
      415,
    );
  }

  const formData = await request.formData();
  const fields = chunkUploadFieldsSchema.parse({
    uploadSessionId: formData.get("uploadSessionId"),
    chunkIndex: formData.get("chunkIndex"),
  });
  const chunk = formData.get("chunk");

  if (!isFile(chunk)) {
    throw new ChunkUploadError("Missing chunk file data.", 400);
  }

  if (chunk.size <= 0) {
    throw new ChunkUploadError("Chunk file data is empty.", 400);
  }

  if (chunk.size > MAX_CHUNK_UPLOAD_BYTES) {
    throw new ChunkUploadError(
      `Chunk is too large. Maximum chunk upload size is ${MAX_CHUNK_UPLOAD_BYTES} bytes.`,
      413,
    );
  }

  return { ...fields, chunk };
}

async function loadUploadSession(uploadSessionId: string, userId: string) {
  const uploadSession = await prisma.uploadSession.findFirst({
    where: {
      id: uploadSessionId,
      userId,
    },
    include: {
      recording: {
        select: {
          fileName: true,
          id: true,
          mimeType: true,
          status: true,
        },
      },
    },
  });

  if (!uploadSession) {
    throw new ChunkUploadError("Upload session not found.", 404);
  }

  if (!ACTIVE_UPLOAD_STATUS_SET.has(uploadSession.status)) {
    throw new ChunkUploadError(
      `Upload session is ${uploadSession.status.toLowerCase()}.`,
      409,
    );
  }

  if (uploadSession.expiresAt <= new Date()) {
    await prisma.uploadSession.update({
      where: { id: uploadSession.id },
      data: { status: UploadSessionStatus.EXPIRED },
      select: { id: true },
    });

    throw new ChunkUploadError("Upload session has expired.", 410);
  }

  return uploadSession;
}

async function getDuplicateChunkResponse(
  uploadSessionId: string,
  chunkIndex: number,
) {
  const [uploadSession, uploadedChunks] = await Promise.all([
    prisma.uploadSession.findUnique({
      where: { id: uploadSessionId },
      select: {
        id: true,
        recordingId: true,
        status: true,
        totalChunks: true,
      },
    }),
    prisma.uploadChunk.count({
      where: { uploadSessionId },
    }),
  ]);

  if (!uploadSession) {
    throw new ChunkUploadError("Upload session not found.", 404);
  }

  const progress = calculateProgress(uploadedChunks, uploadSession.totalChunks);

  return {
    chunkIndex,
    duplicate: true,
    progress,
    recordingId: uploadSession.recordingId,
    status: uploadSession.status,
    uploadedChunks,
    uploadSessionId: uploadSession.id,
  };
}

async function saveChunkMetadata({
  chunk,
  chunkIndex,
  pathname,
  recordingId,
  storageUrl,
  uploadSessionId,
  userId,
}: {
  chunk: File;
  chunkIndex: number;
  pathname: string;
  recordingId: string;
  storageUrl: string;
  uploadSessionId: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.uploadChunk.create({
      data: {
        chunkIndex,
        contentType: chunk.type || "application/octet-stream",
        fileSize: chunk.size,
        pathname,
        storageProvider: STORAGE_PROVIDER,
        storageUrl,
        uploadSessionId,
        userId,
      },
      select: { id: true },
    });

    const uploadedChunks = await tx.uploadChunk.count({
      where: { uploadSessionId },
    });
    const uploadSession = await tx.uploadSession.findUnique({
      where: { id: uploadSessionId },
      select: {
        totalChunks: true,
      },
    });

    if (!uploadSession) {
      throw new ChunkUploadError("Upload session not found.", 404);
    }

    const progress = calculateProgress(
      uploadedChunks,
      uploadSession.totalChunks,
    );
    const isComplete = uploadedChunks >= uploadSession.totalChunks;

    await tx.uploadSession.update({
      where: { id: uploadSessionId },
      data: {
        status: isComplete
          ? UploadSessionStatus.COMPLETED
          : UploadSessionStatus.UPLOADING,
        uploadedChunks,
      },
      select: { id: true },
    });

    await tx.liveRecording.update({
      where: { id: recordingId },
      data: {
        errorMessage: null,
        status: isComplete
          ? LiveRecordingStatus.UPLOADED
          : LiveRecordingStatus.UPLOADING,
        storageProvider: STORAGE_PROVIDER,
        uploadProgress: progress,
        uploadedAt: isComplete ? new Date() : undefined,
      },
      select: { id: true },
    });

    return {
      complete: isComplete,
      progress,
      uploadedChunks,
    };
  });
}

async function deleteUploadedBlob(pathname: string) {
  try {
    await del(pathname);
  } catch (error) {
    console.error("Could not delete orphaned upload chunk.", error);
  }
}

export async function POST(request: Request) {
  let uploadedPathname: string | null = null;

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ChunkUploadError("Vercel Blob storage is not configured.", 500);
    }

    const userId = await getAuthenticatedUserId();
    const { chunk, chunkIndex, uploadSessionId } =
      await parseMultipartRequest(request);
    const uploadSession = await loadUploadSession(uploadSessionId, userId);

    if (chunkIndex >= uploadSession.totalChunks) {
      throw new ChunkUploadError("chunkIndex is outside this upload session.", 400);
    }

    const expectedChunkSize = getExpectedChunkSize({
      chunkIndex,
      chunkSize: uploadSession.chunkSize,
      fileSize: uploadSession.fileSize,
      totalChunks: uploadSession.totalChunks,
    });

    if (chunk.size !== expectedChunkSize) {
      throw new ChunkUploadError(
        `Chunk ${chunkIndex} has invalid size. Expected ${expectedChunkSize} bytes.`,
        400,
      );
    }

    const duplicateChunk = await prisma.uploadChunk.findUnique({
      where: {
        uploadSessionId_chunkIndex: {
          chunkIndex,
          uploadSessionId,
        },
      },
      select: { id: true },
    });

    if (duplicateChunk) {
      const data = await getDuplicateChunkResponse(uploadSessionId, chunkIndex);

      return Response.json({ data });
    }

    const pathname = getChunkPathname({
      chunkIndex,
      fileName: uploadSession.recording.fileName,
      recordingId: uploadSession.recordingId,
      uploadSessionId: uploadSession.id,
    });
    const blob = await put(pathname, chunk, {
      access: getBlobAccess(),
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: chunk.type || "application/octet-stream",
    });

    uploadedPathname = blob.pathname;

    try {
      const saved = await saveChunkMetadata({
        chunk,
        chunkIndex,
        pathname: blob.pathname,
        recordingId: uploadSession.recordingId,
        storageUrl: blob.url,
        uploadSessionId: uploadSession.id,
        userId,
      });

      return Response.json({
        data: {
          chunkIndex,
          complete: saved.complete,
          duplicate: false,
          progress: saved.progress,
          recordingId: uploadSession.recordingId,
          status: saved.complete
            ? UploadSessionStatus.COMPLETED
            : UploadSessionStatus.UPLOADING,
          uploadedChunks: saved.uploadedChunks,
          uploadSessionId: uploadSession.id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const data = await getDuplicateChunkResponse(uploadSessionId, chunkIndex);

        return Response.json({ data });
      }

      if (uploadedPathname) {
        await deleteUploadedBlob(uploadedPathname);
      }

      throw error;
    }
  } catch (error) {
    if (error instanceof ChunkUploadError) {
      return jsonError(error.message, error.status, error.details);
    }

    return handleApiError(error);
  }
}
