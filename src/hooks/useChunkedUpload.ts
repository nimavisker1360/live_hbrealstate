"use client";

import { useCallback, useRef, useState } from "react";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

export type UploadPhase =
  | "idle"
  | "preparing"
  | "uploading"
  | "paused"
  | "assembling"
  | "done"
  | "error";

export type UploadState =
  | { phase: "idle" }
  | { phase: "preparing" }
  | {
      phase: "uploading";
      uploadedChunks: number;
      totalChunks: number;
      percent: number;
      speed: string;
      eta: string;
    }
  | {
      phase: "paused";
      uploadedChunks: number;
      totalChunks: number;
      percent: number;
    }
  | { phase: "assembling" }
  | {
      phase: "done";
      recordingId: string;
      status: "UPLOADED" | "PROCESSING";
      playbackId: string | null;
    }
  | { phase: "error"; message: string; canRetry: boolean };

type ApiResponse<T> = {
  data?: T;
  error?: { message?: string };
};

type InitResponse = {
  recordingId: string;
  uploadSessionId: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number;
  isResume: boolean;
  expiresAt: string;
};

type ChunkResponse = {
  uploadedChunks: number;
  totalChunks: number;
  isComplete: boolean;
};

type CompleteResponse = {
  recordingId: string;
  status: "UPLOADED" | "PROCESSING";
  muxAssetId: string | null;
  playbackId: string | null;
};

export type UseChunkedUpload = {
  state: UploadState;
  start: (file: File, streamId?: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  retry: () => Promise<void>;
};

export function useChunkedUpload(): UseChunkedUpload {
  const [state, setState] = useState<UploadState>({ phase: "idle" });

  const uploadSessionRef = useRef<string | null>(null);
  const recordingIdRef = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const streamIdRef = useRef<string | undefined>();
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const speedBufferRef = useRef<Array<{ timestamp: number; bytes: number }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateSpeed = useCallback(() => {
    const now = Date.now();
    const fiveSecondsAgo = now - 5000;

    // Remove old entries
    speedBufferRef.current = speedBufferRef.current.filter(
      (item) => item.timestamp > fiveSecondsAgo,
    );

    const totalBytes = speedBufferRef.current.reduce((sum, item) => sum + item.bytes, 0);
    const elapsedSeconds = Math.max(1, (now - speedBufferRef.current[0]?.timestamp || now) / 1000);
    const bytesPerSecond = totalBytes / elapsedSeconds;

    // Format as MB/s
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }, []);

  const calculateEta = useCallback(
    (remainingBytes: number, speed: string) => {
      const speedStr = speed.replace(" MB/s", "");
      const speedMbps = parseFloat(speedStr);
      if (!speedMbps || speedMbps === 0) return "calculating...";

      const secondsRemaining = remainingBytes / (1024 * 1024) / speedMbps;
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = Math.floor(secondsRemaining % 60);

      if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m left`;
      }

      return `${minutes}m ${seconds}s left`;
    },
    [],
  );

  const start = useCallback(
    async (file: File, streamId?: string) => {
      try {
        isCancelledRef.current = false;
        isPausedRef.current = false;
        fileRef.current = file;
        streamIdRef.current = streamId;

        setState({ phase: "preparing" });

        // Call init endpoint
        const initResponse = await fetch("/api/live-recordings/upload/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            streamId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            totalChunks: Math.ceil(file.size / CHUNK_SIZE),
            chunkSize: CHUNK_SIZE,
          }),
        });

        const initBody = (await initResponse.json().catch(() => ({}))) as ApiResponse<
          InitResponse
        >;

        if (!initResponse.ok || !initBody.data) {
          throw new Error(
            initBody.error?.message ?? "Failed to initialize upload.",
          );
        }

        uploadSessionRef.current = initBody.data.uploadSessionId;
        recordingIdRef.current = initBody.data.recordingId;

        const totalChunks = initBody.data.totalChunks;
        let startChunkIndex = initBody.data.uploadedChunks;

        // If resuming, skip to next chunk
        if (initBody.data.isResume && startChunkIndex < totalChunks) {
          // Continue from where we left off
        } else if (startChunkIndex >= totalChunks) {
          // All chunks already uploaded, go straight to assembly
          setState({ phase: "assembling" });
          await completeUpload();
          return;
        }

        // Upload chunks
        speedBufferRef.current = [];

        for (let i = startChunkIndex; i < totalChunks; i += 1) {
          if (isCancelledRef.current) {
            throw new Error("Upload cancelled.");
          }

          while (isPausedRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            if (isCancelledRef.current) throw new Error("Upload cancelled.");
          }

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          const arrayBuffer = await chunk.arrayBuffer();

          // Track speed
          const beforeTime = Date.now();

          abortControllerRef.current = new AbortController();

          const chunkResponse = await fetch(
            `/api/live-recordings/upload/chunk?uploadSessionId=${uploadSessionRef.current}&chunkIndex=${i}`,
            {
              method: "POST",
              body: arrayBuffer,
              signal: abortControllerRef.current.signal,
            },
          );

          const afterTime = Date.now();
          speedBufferRef.current.push({
            timestamp: afterTime,
            bytes: end - start,
          });

          const chunkBody = (await chunkResponse.json().catch(() => ({}))) as ApiResponse<
            ChunkResponse
          >;

          if (!chunkResponse.ok || !chunkBody.data) {
            throw new Error(
              chunkBody.error?.message ??
                `Failed to upload chunk ${i}.`,
            );
          }

          const uploadedChunks = chunkBody.data.uploadedChunks;
          const percent = Math.round((uploadedChunks / totalChunks) * 100);
          const speed = calculateSpeed();
          const remainingBytes = (totalChunks - uploadedChunks) * CHUNK_SIZE;
          const eta = calculateEta(remainingBytes, speed);

          setState({
            phase: "uploading",
            uploadedChunks,
            totalChunks,
            percent,
            speed,
            eta,
          });
        }

        setState({ phase: "assembling" });
        await completeUpload();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An error occurred during upload.";
        const canRetry = !message.includes("cancelled");

        setState({
          phase: "error",
          message,
          canRetry,
        });
      }
    },
    [calculateSpeed, calculateEta],
  );

  const completeUpload = useCallback(async () => {
    if (!uploadSessionRef.current) throw new Error("No upload session found.");

    const completeResponse = await fetch("/api/live-recordings/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadSessionId: uploadSessionRef.current,
        createMuxAsset: true,
      }),
    });

    const completeBody = (await completeResponse.json().catch(() => ({}))) as ApiResponse<
      CompleteResponse
    >;

    if (!completeResponse.ok || !completeBody.data) {
      throw new Error(
        completeBody.error?.message ?? "Failed to complete upload.",
      );
    }

    setState({
      phase: "done",
      recordingId: completeBody.data.recordingId,
      status: completeBody.data.status,
      playbackId: completeBody.data.playbackId,
    });
  }, []);

  const pause = useCallback(() => {
    isPausedRef.current = true;

    if (state.phase === "uploading") {
      setState((prev) => {
        if (prev.phase === "uploading") {
          return {
            phase: "paused",
            uploadedChunks: prev.uploadedChunks,
            totalChunks: prev.totalChunks,
            percent: prev.percent,
          };
        }
        return prev;
      });
    }
  }, [state.phase]);

  const resume = useCallback(async () => {
    isPausedRef.current = false;

    if (state.phase === "paused" && fileRef.current) {
      setState({
        phase: "uploading",
        uploadedChunks:
          state.phase === "paused" ? state.uploadedChunks : 0,
        totalChunks:
          state.phase === "paused" ? state.totalChunks : 0,
        percent: state.phase === "paused" ? state.percent : 0,
        speed: "0 MB/s",
        eta: "calculating...",
      });

      // Retry will be called explicitly; resume just unpauses
    }
  }, [state]);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    abortControllerRef.current?.abort();

    setState({ phase: "idle" });
    uploadSessionRef.current = null;
    recordingIdRef.current = null;
    fileRef.current = null;
  }, []);

  const retry = useCallback(async () => {
    if (fileRef.current) {
      await start(fileRef.current, streamIdRef.current);
    }
  }, [start]);

  return {
    state,
    start,
    pause,
    resume,
    cancel,
    retry,
  };
}
