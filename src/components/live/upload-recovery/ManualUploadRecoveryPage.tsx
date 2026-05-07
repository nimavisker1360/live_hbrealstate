"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileVideo,
  History,
  Loader2,
  Radio,
  RefreshCw,
  UploadCloud,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  listQueuedUploads,
  type QueuedUpload,
} from "./uploadQueue";
import { useNetworkStatus } from "./useNetworkStatus";
import { useRecordingUpload } from "./useRecordingUpload";
import { useVideoDuration } from "./useVideoDuration";

type LiveSessionOption = {
  id: string;
  propertyId: string;
  propertyLocation: string;
  propertyTitle: string;
  roomId: string;
  startsAt: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  title: string;
};

type PropertyOption = {
  id: string;
  location: string;
  title: string;
};

type UploadOptions = {
  liveSessions: LiveSessionOption[];
  properties: PropertyOption[];
};

type UploadHistoryItem = {
  id: string;
  createdAt: string;
  errorMessage: string | null;
  fileName: string;
  fileSize: string;
  mimeType: string;
  playbackId: string | null;
  status: "LOCAL_PENDING" | "UPLOADING" | "UPLOADED" | "FAILED" | "PROCESSING" | "READY";
  title: string | null;
  uploadProgress: number;
  uploadedAt: string | null;
  property: {
    location: string;
    title: string;
  } | null;
  stream: {
    roomId: string;
    title: string;
  } | null;
  uploadSessions: Array<{
    id: string;
    status: string;
    totalChunks: number;
    uploadedChunks: number;
  }>;
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

const ACCEPTED_VIDEO_TYPES = "video/mp4,video/quicktime,video/webm";

const statusLabels = {
  LOCAL_PENDING: "local_pending",
  UPLOADING: "uploading",
  UPLOADED: "uploaded",
  FAILED: "failed",
  PROCESSING: "processing",
  READY: "ready",
} as const;

const statusStyles: Record<string, string> = {
  failed: "border-red-400/35 bg-red-500/12 text-red-100",
  local_pending: "border-white/15 bg-white/[0.06] text-white/62",
  processing: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  ready: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  uploaded: "border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79]",
  uploading: "border-violet-300/30 bg-violet-400/10 text-violet-100",
};

function formatBytes(bytes: number | string) {
  const value = typeof bytes === "string" ? Number(bytes) : bytes;

  if (!Number.isFinite(value)) {
    return "Unknown size";
  }

  if (value >= 1024 * 1024 * 1024) {
    return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(duration: number | null) {
  if (!duration) {
    return "Reading video";
  }

  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getApiErrorMessage(body: unknown, fallback: string) {
  const response = body as ApiResponse<unknown>;

  return response.error?.message ?? fallback;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok || !body.data) {
    throw new Error(getApiErrorMessage(body, "Request failed."));
  }

  return body.data;
}

export function ManualUploadRecoveryPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const retryFileInputRef = useRef<HTMLInputElement | null>(null);
  const { clearRestoredMessage, isOnline, wasRestored } = useNetworkStatus();
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<UploadOptions>({
    liveSessions: [],
    properties: [],
  });
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [queue, setQueue] = useState<QueuedUpload[]>([]);
  const [pendingQueueRetry, setPendingQueueRetry] =
    useState<QueuedUpload | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const duration = useVideoDuration(file);
  const loadHistory = useCallback(async () => {
    const [data, queuedUploads] = await Promise.all([
      fetchJson<UploadHistoryItem[]>("/api/live-recordings/upload/history"),
      listQueuedUploads(),
    ]);

    setHistory(data);
    setQueue(queuedUploads);
  }, []);
  const uploadState = useRecordingUpload(() => {
    void loadHistory().catch(() => undefined);
  });

  useEffect(() => {
    let ignore = false;

    async function loadPageData() {
      setIsLoading(true);
      setLoadError("");

      try {
        const [nextOptions, nextHistory, queuedUploads] = await Promise.all([
          fetchJson<UploadOptions>("/api/live-recordings/upload/options"),
          fetchJson<UploadHistoryItem[]>("/api/live-recordings/upload/history"),
          listQueuedUploads(),
        ]);

        if (!ignore) {
          setOptions(nextOptions);
          setHistory(nextHistory);
          setQueue(queuedUploads);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load upload page.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadPageData();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedRelation = useMemo(() => {
    if (!selectedTarget) {
      return {};
    }

    const [kind, id] = selectedTarget.split(":");

    if (kind === "stream") {
      const stream = options.liveSessions.find((item) => item.id === id);

      return {
        propertyId: stream?.propertyId,
        streamId: stream?.id,
      };
    }

    if (kind === "property") {
      return { propertyId: id };
    }

    return {};
  }, [options.liveSessions, selectedTarget]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    setFile(nextFile);
  }

  async function handleRetryFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    const queuedUpload = pendingQueueRetry;

    if (!nextFile || !queuedUpload) {
      return;
    }

    if (
      nextFile.name !== queuedUpload.fileName ||
      nextFile.size !== queuedUpload.fileSize ||
      nextFile.lastModified !== queuedUpload.fileLastModified
    ) {
      setLoadError("That file does not match the saved upload. Choose the same video.");
      return;
    }

    setFile(nextFile);
    setSelectedTarget(queuedUpload.selectedTarget ?? "");
    setPendingQueueRetry(null);
    setLoadError("");
    await uploadState.upload({
      duration: queuedUpload.duration,
      file: nextFile,
      propertyId: queuedUpload.propertyId,
      selectedTarget: queuedUpload.selectedTarget,
      streamId: queuedUpload.streamId,
    });
    await loadHistory().catch(() => undefined);
  }

  async function startUpload() {
    if (!file) {
      return;
    }

    await uploadState.upload({
      duration,
      file,
      propertyId: selectedRelation.propertyId,
      selectedTarget,
      streamId: selectedRelation.streamId,
    });
    await loadHistory().catch(() => undefined);
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
              <UploadCloud aria-hidden className="size-4" />
              Upload recovery
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              Send a saved live video
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
              Use this when the phone kept the PRISM recording after a weak
              connection.
            </p>
          </div>
          <ConnectionBadge isOnline={isOnline} />
        </div>

        {wasRestored ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
            <p>Internet restored. You can continue upload.</p>
            <button
              className="text-xs font-semibold text-emerald-50 underline-offset-4 hover:underline"
              onClick={clearRestoredMessage}
              type="button"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {loadError ? (
          <div className="mb-4 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
            {loadError}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_0.82fr]">
          <Card className="p-4 sm:p-5">
            <div className="space-y-5">
              <input
                accept={ACCEPTED_VIDEO_TYPES}
                className="hidden"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <input
                accept={ACCEPTED_VIDEO_TYPES}
                className="hidden"
                onChange={handleRetryFileChange}
                ref={retryFileInputRef}
                type="file"
              />

              <button
                className="flex min-h-44 w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-white/16 bg-black/24 px-4 py-8 text-center transition hover:border-[#d6b15f]/55 hover:bg-[#d6b15f]/5"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <FileVideo aria-hidden className="size-10 text-[#d6b15f]" />
                <span className="mt-4 text-base font-semibold text-white">
                  Select video from phone
                </span>
                <span className="mt-2 max-w-xs text-sm leading-6 text-white/52">
                  Choose the MP4, MOV, or WebM saved by PRISM.
                </span>
              </button>

              {file ? (
                <div className="rounded-md border border-white/10 bg-black/22 p-4">
                  <p className="truncate text-sm font-semibold text-white">
                    {file.name}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <FileFact label="Size" value={formatBytes(file.size)} />
                    <FileFact
                      label="Duration"
                      value={formatDuration(duration)}
                    />
                  </div>
                </div>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white/72">
                  Connect to a live or property
                </span>
                <select
                  className="h-12 w-full rounded-md border border-white/10 bg-black px-3 text-sm text-white outline-none transition focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/20"
                  disabled={isLoading}
                  onChange={(event) => setSelectedTarget(event.target.value)}
                  value={selectedTarget}
                >
                  <option value="">No match selected</option>
                  {options.liveSessions.length > 0 ? (
                    <optgroup label="Live streams">
                      {options.liveSessions.map((session) => (
                        <option key={session.id} value={`stream:${session.id}`}>
                          {session.title} - {session.propertyTitle}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {options.properties.length > 0 ? (
                    <optgroup label="Properties">
                      {options.properties.map((property) => (
                        <option
                          key={property.id}
                          value={`property:${property.id}`}
                        >
                          {property.title} - {property.location}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-white/72">
                    Upload progress
                  </span>
                  <span className="text-[#f0cf79]">
                    {Math.round(uploadState.progress)}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#d6b15f] transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                {uploadState.totalChunks > 0 ? (
                  <p className="mt-2 text-xs text-white/42">
                    {uploadState.uploadedChunks} of {uploadState.totalChunks}{" "}
                    parts sent
                  </p>
                ) : null}
              </div>

              {uploadState.error ? (
                <div className="flex gap-3 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <p>{uploadState.error}</p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  className="h-12 w-full"
                  disabled={!file || uploadState.isUploading || !isOnline}
                  onClick={startUpload}
                  size="lg"
                >
                  {uploadState.isUploading ? (
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <UploadCloud aria-hidden className="size-4" />
                  )}
                  {uploadState.isUploading ? "Uploading" : "Start upload"}
                </Button>
                <Button
                  className="h-12 w-full"
                  disabled={uploadState.isUploading || !file || !isOnline}
                  onClick={uploadState.retry}
                  size="lg"
                  variant="secondary"
                >
                  <RefreshCw aria-hidden className="size-4" />
                  Try again
                </Button>
              </div>

              <div className="rounded-md border border-white/10 bg-black/18 p-3 text-xs leading-5 text-white/46">
                After a page refresh, choose the same video again to continue.
                Browsers do not let websites reopen phone videos by themselves.
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <History aria-hidden className="size-4 text-[#d6b15f]" />
                  Upload history
                </p>
                <p className="mt-1 text-xs text-white/46">
                  Recent videos from this account.
                </p>
              </div>
              <button
                aria-label="Refresh upload history"
                className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/12 hover:text-white"
                onClick={() => {
                  void loadHistory().catch((error) =>
                    setLoadError(
                      error instanceof Error
                        ? error.message
                        : "Could not refresh history.",
                    ),
                  );
                }}
                type="button"
              >
                <RefreshCw aria-hidden className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              {queue.length > 0 ? (
                <div className="rounded-md border border-[#d6b15f]/24 bg-[#d6b15f]/8 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f0cf79]">
                    Waiting to continue
                  </p>
                  <div className="mt-3 space-y-2">
                    {queue.map((item) => (
                      <QueuedUploadRow
                        isOnline={isOnline}
                        item={item}
                        key={item.id}
                        onReselect={() => {
                          setPendingQueueRetry(item);
                          retryFileInputRef.current?.click();
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {history.map((item) => (
                <HistoryRow item={item} key={item.id} />
              ))}
              {!isLoading && history.length === 0 ? (
                <div className="rounded-md border border-white/10 bg-black/20 p-4 text-sm text-white/52">
                  No uploads yet.
                </div>
              ) : null}
              {isLoading ? (
                <div className="rounded-md border border-white/10 bg-black/20 p-4 text-sm text-white/52">
                  Loading uploads...
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QueuedUploadRow({
  isOnline,
  item,
  onReselect,
}: {
  isOnline: boolean;
  item: QueuedUpload;
  onReselect: () => void;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-black/24 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {item.fileName}
          </p>
          <p className="mt-1 text-xs text-white/46">
            {formatBytes(item.fileSize)} - {Math.round(item.progress)}%
          </p>
        </div>
        <Button
          disabled={!isOnline}
          onClick={onReselect}
          size="sm"
          variant="secondary"
        >
          Reselect
        </Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-white/44">
        Choose the same saved video to continue this upload.
      </p>
    </div>
  );
}

function ConnectionBadge({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold",
        isOnline
          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
          : "border-red-400/35 bg-red-500/12 text-red-100",
      )}
    >
      {isOnline ? (
        <Wifi aria-hidden className="size-4" />
      ) : (
        <WifiOff aria-hidden className="size-4" />
      )}
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}

function FileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-white/36">
        {label}
      </p>
      <p className="mt-1 font-medium text-white">{value}</p>
    </div>
  );
}

function HistoryRow({ item }: { item: UploadHistoryItem }) {
  const status = statusLabels[item.status];
  const latestSession = item.uploadSessions[0];

  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {item.title ?? item.fileName}
          </p>
          <p className="mt-1 truncate text-xs text-white/48">
            {item.stream?.title ??
              item.property?.title ??
              item.property?.location ??
              item.fileName}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold",
            statusStyles[status],
          )}
        >
          {status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#d6b15f]"
            style={{ width: `${item.uploadProgress}%` }}
          />
        </div>
        <span className="w-10 text-right text-xs text-white/52">
          {item.uploadProgress}%
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/42">
        <span>{formatBytes(item.fileSize)}</span>
        <span>{formatDate(item.createdAt)}</span>
        {latestSession ? (
          <span>
            {latestSession.uploadedChunks}/{latestSession.totalChunks} parts
          </span>
        ) : null}
      </div>

      {item.errorMessage ? (
        <p className="mt-3 rounded-md border border-red-400/25 bg-red-500/10 p-2 text-xs text-red-100">
          {item.errorMessage}
        </p>
      ) : null}

      {status === "ready" ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-100">
          <CheckCircle2 aria-hidden className="size-4" />
          Ready for replay.
        </p>
      ) : status === "processing" ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-sky-100">
          <Clock3 aria-hidden className="size-4" />
          Preparing replay.
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-white/46">
          <Radio aria-hidden className="size-4" />
          Saved for recovery.
        </p>
      )}
    </div>
  );
}
