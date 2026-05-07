import { randomUUID } from "node:crypto";
import {
  LiveRecordingStatus,
  Prisma,
  RecordingSourceType,
  UploadSessionStatus,
} from "@/generated/prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
const DEFAULT_MAX_FILE_SIZE_BYTES =
  BigInt(5) * BigInt(1024) * BigInt(1024) * BigInt(1024);
const UPLOAD_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_CHUNK_SIZE_BYTES = 256 * 1024;
const DEFAULT_MAX_CHUNK_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_CHUNKS = 20_000;
const ACTIVE_UPLOAD_STATUSES = [
  UploadSessionStatus.PENDING,
  UploadSessionStatus.UPLOADING,
] as const;
const FINISHED_RECORDING_STATUSES: ReadonlySet<LiveRecordingStatus> = new Set([
  LiveRecordingStatus.UPLOADED,
  LiveRecordingStatus.PROCESSING,
  LiveRecordingStatus.READY,
]);

class UploadInitError extends Error {
  details?: unknown;
  status: number;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "UploadInitError";
    this.status = status;
    this.details = details;
  }
}

function readMaxFileSizeBytes() {
  const configured = process.env.LIVE_RECORDING_MAX_FILE_SIZE_BYTES?.trim();

  if (!configured) {
    return DEFAULT_MAX_FILE_SIZE_BYTES;
  }

  if (!/^\d+$/.test(configured)) {
    return DEFAULT_MAX_FILE_SIZE_BYTES;
  }

  const parsed = BigInt(configured);

  return parsed > BigInt(0) ? parsed : DEFAULT_MAX_FILE_SIZE_BYTES;
}

const MAX_FILE_SIZE_BYTES = readMaxFileSizeBytes();

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

const MAX_CHUNK_SIZE_BYTES = readMaxChunkUploadBytes();

function formatBytes(bytes: bigint) {
  const gb = Number(bytes) / 1024 / 1024 / 1024;

  if (gb >= 1) {
    return `${Number.isInteger(gb) ? gb : gb.toFixed(2)} GB`;
  }

  const mb = Number(bytes) / 1024 / 1024;

  return `${Number.isInteger(mb) ? mb : mb.toFixed(2)} MB`;
}

function normalizeOptionalId(value: string | undefined) {
  return value?.trim() || undefined;
}

function normalizeFileName(value: string) {
  const fileName = value.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";

  return fileName.replace(/[\u0000-\u001f\u007f]/g, "");
}

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .optional()
  .transform(normalizeOptionalId);

const fileSizeSchema = z
  .union([
    z.number().int().positive().safe(),
    z.string().trim().regex(/^\d+$/, "fileSize must be a positive integer."),
  ])
  .transform((value) => BigInt(value))
  .refine((value) => value > BigInt(0), "fileSize must be greater than zero.")
  .refine(
    (value) => value <= MAX_FILE_SIZE_BYTES,
    `File exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} upload limit.`,
  );

const initUploadSchema = z
  .object({
    streamId: idSchema,
    propertyId: idSchema,
    fileName: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .transform(normalizeFileName)
      .pipe(
        z
          .string()
          .min(1, "fileName must include a valid filename.")
          .max(255),
      ),
    fileSize: fileSizeSchema,
    mimeType: z.enum(ALLOWED_VIDEO_MIME_TYPES, {
      message: "Unsupported video type. Use MP4, QuickTime, or WebM.",
    }),
    totalChunks: z.number().int().positive().max(MAX_TOTAL_CHUNKS),
    chunkSize: z
      .number()
      .int()
      .min(MIN_CHUNK_SIZE_BYTES)
      .max(MAX_CHUNK_SIZE_BYTES),
  })
  .superRefine((payload, context) => {
    const expectedTotalChunks = Number(
      (payload.fileSize + BigInt(payload.chunkSize) - BigInt(1)) /
        BigInt(payload.chunkSize),
    );

    if (payload.totalChunks !== expectedTotalChunks) {
      context.addIssue({
        code: "custom",
        message: `totalChunks must equal ${expectedTotalChunks} for the provided fileSize and chunkSize.`,
        path: ["totalChunks"],
      });
    }
  });

type InitUploadPayload = z.infer<typeof initUploadSchema>;

type InitUploadResult = {
  alreadyUploaded: boolean;
  chunkSize: number;
  recordingId: string;
  reusedUploadSession: boolean;
  uploadedChunks: number;
  uploadSessionId: string;
};

async function getAuthenticatedUser() {
  const session = await getCurrentSession().catch(() => null);

  if (!session) {
    throw new UploadInitError("Authentication required.", 401);
  }

  return getSessionBackedByDatabase(session);
}

async function initializeUpload(
  payload: InitUploadPayload,
  userId: string,
): Promise<InitUploadResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + UPLOAD_SESSION_TTL_MS);

  return prisma.$transaction(async (tx) => {
    const stream = payload.streamId
      ? await tx.liveSession.findUnique({
          where: { id: payload.streamId },
          select: {
            id: true,
            propertyId: true,
            title: true,
          },
        })
      : null;

    if (payload.streamId && !stream) {
      throw new UploadInitError("Live stream not found.", 404);
    }

    if (
      payload.propertyId &&
      stream?.propertyId &&
      payload.propertyId !== stream.propertyId
    ) {
      throw new UploadInitError(
        "propertyId does not match the live stream property.",
        400,
      );
    }

    const propertyId = payload.propertyId ?? stream?.propertyId ?? null;

    if (propertyId) {
      const property = await tx.property.findUnique({
        where: { id: propertyId },
        select: { id: true },
      });

      if (!property) {
        throw new UploadInitError("Property not found.", 404);
      }
    }

    const recording = await tx.liveRecording.findFirst({
      where: {
        userId,
        streamId: payload.streamId ?? null,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
      },
      select: {
        id: true,
        status: true,
        retryCount: true,
      },
    });

    if (recording) {
      const activeUploadSession = await tx.uploadSession.findFirst({
        where: {
          recordingId: recording.id,
          userId,
          status: { in: [...ACTIVE_UPLOAD_STATUSES] },
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          chunkSize: true,
          uploadedChunks: true,
        },
      });

      if (activeUploadSession) {
        return {
          alreadyUploaded: false,
          chunkSize: activeUploadSession.chunkSize,
          recordingId: recording.id,
          reusedUploadSession: true,
          uploadedChunks: activeUploadSession.uploadedChunks,
          uploadSessionId: activeUploadSession.id,
        };
      }

      const latestUploadSession = await tx.uploadSession.findFirst({
        where: {
          recordingId: recording.id,
          userId,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          chunkSize: true,
          status: true,
          uploadedChunks: true,
        },
      });

      if (
        FINISHED_RECORDING_STATUSES.has(recording.status) &&
        latestUploadSession?.status === UploadSessionStatus.COMPLETED
      ) {
        return {
          alreadyUploaded: true,
          chunkSize: latestUploadSession.chunkSize,
          recordingId: recording.id,
          reusedUploadSession: true,
          uploadedChunks: latestUploadSession.uploadedChunks,
          uploadSessionId: latestUploadSession.id,
        };
      }

      const uploadSession = await tx.uploadSession.create({
        data: {
          chunkSize: payload.chunkSize,
          expiresAt,
          fileSize: payload.fileSize,
          recordingId: recording.id,
          totalChunks: payload.totalChunks,
          uploadId: randomUUID(),
          userId,
        },
        select: {
          id: true,
          chunkSize: true,
          uploadedChunks: true,
        },
      });

      await tx.liveRecording.update({
        where: { id: recording.id },
        data: {
          errorMessage: null,
          retryCount: {
            increment: recording.status === LiveRecordingStatus.FAILED ? 1 : 0,
          },
          status: LiveRecordingStatus.UPLOADING,
          uploadProgress: 0,
        },
        select: { id: true },
      });

      return {
        alreadyUploaded: false,
        chunkSize: uploadSession.chunkSize,
        recordingId: recording.id,
        reusedUploadSession: false,
        uploadedChunks: uploadSession.uploadedChunks,
        uploadSessionId: uploadSession.id,
      };
    }

    const sourceType = payload.streamId
      ? RecordingSourceType.LIVE_RECORDING
      : RecordingSourceType.MANUAL_UPLOAD;
    const createdRecording = await tx.liveRecording.create({
      data: {
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        mimeType: payload.mimeType,
        propertyId,
        sourceType,
        status: LiveRecordingStatus.UPLOADING,
        streamId: payload.streamId ?? null,
        title: stream?.title ?? payload.fileName,
        userId,
      },
      select: { id: true },
    });
    const uploadSession = await tx.uploadSession.create({
      data: {
        chunkSize: payload.chunkSize,
        expiresAt,
        fileSize: payload.fileSize,
        recordingId: createdRecording.id,
        totalChunks: payload.totalChunks,
        uploadId: randomUUID(),
        userId,
      },
      select: {
        id: true,
        chunkSize: true,
        uploadedChunks: true,
      },
    });

    return {
      alreadyUploaded: false,
      chunkSize: uploadSession.chunkSize,
      recordingId: createdRecording.id,
      reusedUploadSession: false,
      uploadedChunks: uploadSession.uploadedChunks,
      uploadSessionId: uploadSession.id,
    };
  });
}

async function initializeUploadWithDuplicateRetry(
  payload: InitUploadPayload,
  userId: string,
) {
  try {
    return await initializeUpload(payload, userId);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return initializeUpload(payload, userId);
    }

    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const payload = initUploadSchema.parse(await request.json());
    const result = await initializeUploadWithDuplicateRetry(payload, user.sub);

    return Response.json(
      { data: result },
      { status: result.reusedUploadSession ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof UploadInitError) {
      return jsonError(error.message, error.status, error.details);
    }

    return handleApiError(error);
  }
}
