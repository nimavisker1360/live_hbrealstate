"use client";

import { useCallback, useRef, useState } from "react";
import {
  createQueueId,
  removeQueuedUpload,
  saveQueuedUpload,
  type QueuedUpload,
} from "./uploadQueue";

const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;

type UploadStatus =
  | "local_pending"
  | "uploading"
  | "uploaded"
  | "failed"
  | "processing"
  | "ready";

type InitUploadResponse = {
  alreadyUploaded: boolean;
  chunkSize: number;
  recordingId: string;
  reusedUploadSession: boolean;
  uploadedChunks: number;
  uploadSessionId: string;
};

type ChunkUploadResponse = {
  complete: boolean;
  progress: number;
  uploadedChunks: number;
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type UploadInput = {
  duration?: number | null;
  file: File;
  propertyId?: string;
  selectedTarget?: string;
  streamId?: string;
};

type LastUpload = UploadInput & {
  chunkSize: number;
  queueId: string;
  uploadSessionId?: string;
};

class UploadRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UploadRequestError";
    this.status = status;
  }
}

function getTotalChunks(fileSize: number, chunkSize: number) {
  return Math.ceil(fileSize / chunkSize);
}

async function readJsonResponse<T>(response: Response) {
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok || !body.data) {
    throw new UploadRequestError(
      body.error?.message ?? "Upload request failed.",
      response.status,
    );
  }

  return body.data;
}

export function useRecordingUpload(onHistoryRefresh?: () => void) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("local_pending");
  const [uploadedChunks, setUploadedChunks] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [recordingId, setRecordingId] = useState("");
  const isUploadingRef = useRef(false);
  const lastUploadRef = useRef<LastUpload | null>(null);

  const persistQueueItem = useCallback(
    async (
      input: UploadInput,
      patch: Partial<QueuedUpload> & { id: string },
    ) => {
      const now = new Date().toISOString();

      await saveQueuedUpload({
        chunkSize: DEFAULT_CHUNK_SIZE,
        createdAt: patch.createdAt ?? now,
        duration: input.duration ?? null,
        fileLastModified: input.file.lastModified,
        fileName: input.file.name,
        fileSize: input.file.size,
        id: patch.id,
        mimeType: input.file.type,
        progress: patch.progress ?? 0,
        propertyId: input.propertyId,
        recordingId: patch.recordingId,
        selectedTarget: input.selectedTarget,
        status: patch.status ?? "local_pending",
        streamId: input.streamId,
        uploadSessionId: patch.uploadSessionId,
        uploadedChunks: patch.uploadedChunks ?? 0,
        updatedAt: now,
      });
    },
    [],
  );

  const upload = useCallback(
    async (input: UploadInput) => {
      if (isUploadingRef.current) {
        return;
      }

      const queueId = createQueueId({
        fileLastModified: input.file.lastModified,
        fileName: input.file.name,
        fileSize: input.file.size,
        propertyId: input.propertyId,
        streamId: input.streamId,
      });

      await persistQueueItem(input, {
        id: queueId,
        status: "local_pending",
      });

      if (!navigator.onLine) {
        setStatus("failed");
        setError("Internet is offline. Reconnect and try again.");
        await persistQueueItem(input, {
          id: queueId,
          status: "failed",
        });
        return;
      }

      isUploadingRef.current = true;
      setError("");
      setStatus("uploading");

      let latestProgress = 0;
      let latestUploadedChunks = 0;
      let latestRecordingId: string | undefined;
      let latestUploadSessionId: string | undefined;

      try {
        const total = getTotalChunks(input.file.size, DEFAULT_CHUNK_SIZE);
        const initResponse = await fetch("/api/live-recordings/upload/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chunkSize: DEFAULT_CHUNK_SIZE,
            fileName: input.file.name,
            fileSize: input.file.size,
            mimeType: input.file.type,
            propertyId: input.propertyId,
            streamId: input.streamId,
            totalChunks: total,
          }),
        });
        const initData = await readJsonResponse<InitUploadResponse>(
          initResponse,
        );

        setRecordingId(initData.recordingId);
        setUploadedChunks(initData.uploadedChunks);
        setTotalChunks(total);
        latestRecordingId = initData.recordingId;
        latestUploadedChunks = initData.uploadedChunks;
        latestUploadSessionId = initData.uploadSessionId;
        latestProgress = initData.alreadyUploaded
          ? 100
          : (initData.uploadedChunks / total) * 100;
        setProgress(latestProgress);
        lastUploadRef.current = {
          ...input,
          chunkSize: initData.chunkSize,
          queueId,
          uploadSessionId: initData.uploadSessionId,
        };
        await persistQueueItem(input, {
          id: queueId,
          progress: latestProgress,
          recordingId: initData.recordingId,
          status: initData.alreadyUploaded ? "uploaded" : "uploading",
          uploadSessionId: initData.uploadSessionId,
          uploadedChunks: initData.uploadedChunks,
        });

        if (initData.alreadyUploaded) {
          setStatus("uploaded");
          await removeQueuedUpload(queueId);
          onHistoryRefresh?.();
          return;
        }

        for (
          let chunkIndex = initData.uploadedChunks;
          chunkIndex < total;
          chunkIndex += 1
        ) {
          if (!navigator.onLine) {
            throw new UploadRequestError(
              "Internet dropped. Reconnect and try again.",
              0,
            );
          }

          const start = chunkIndex * initData.chunkSize;
          const end = Math.min(start + initData.chunkSize, input.file.size);
          const formData = new FormData();

          formData.set("uploadSessionId", initData.uploadSessionId);
          formData.set("chunkIndex", String(chunkIndex));
          formData.set(
            "chunk",
            input.file.slice(start, end, input.file.type),
            input.file.name,
          );

          const chunkResponse = await fetch(
            "/api/live-recordings/upload/chunk",
            {
              method: "POST",
              body: formData,
            },
          );
          const chunkData = await readJsonResponse<ChunkUploadResponse>(
            chunkResponse,
          );

          setUploadedChunks(chunkData.uploadedChunks);
          setProgress(chunkData.progress);
          latestProgress = chunkData.progress;
          latestUploadedChunks = chunkData.uploadedChunks;
          await persistQueueItem(input, {
            id: queueId,
            progress: chunkData.progress,
            recordingId: initData.recordingId,
            status: chunkData.complete ? "uploaded" : "uploading",
            uploadSessionId: initData.uploadSessionId,
            uploadedChunks: chunkData.uploadedChunks,
          });

          if (chunkData.complete) {
            break;
          }
        }

        setProgress(100);
        setStatus("uploaded");
        await removeQueuedUpload(queueId);
        onHistoryRefresh?.();
      } catch (error) {
        setStatus("failed");
        setError(
          error instanceof Error
            ? error.message
            : "Upload failed. Try again when the connection is stable.",
        );
        await persistQueueItem(input, {
          id: queueId,
          progress: latestProgress,
          recordingId: latestRecordingId,
          status: "failed",
          uploadSessionId: latestUploadSessionId,
          uploadedChunks: latestUploadedChunks,
        });
      } finally {
        isUploadingRef.current = false;
      }
    },
    [onHistoryRefresh, persistQueueItem],
  );

  const retry = useCallback(async () => {
    if (!lastUploadRef.current) {
      setError("Choose a video first.");
      return;
    }

    await upload(lastUploadRef.current);
  }, [upload]);

  return {
    error,
    isUploading: status === "uploading",
    progress,
    recordingId,
    retry,
    status,
    totalChunks,
    upload,
    uploadedChunks,
  };
}
