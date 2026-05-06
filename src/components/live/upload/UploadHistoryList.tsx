"use client";

import { Button } from "@/components/ui/Button";
import { RefreshCw } from "lucide-react";

type Recording = {
  id: string;
  fileName: string;
  status: string;
  uploadedAt: string | null;
  createdAt: string;
  playbackId: string | null;
};

type UploadHistoryListProps = {
  recordings: Recording[];
  isLoading: boolean;
  onRetry: (recordingId: string) => Promise<void>;
};

const STATUS_LABELS: Record<string, string> = {
  LOCAL_PENDING: "Pending",
  UPLOADING: "Uploading",
  UPLOADED: "Uploaded",
  FAILED: "Failed",
  PROCESSING: "Processing",
  READY: "Ready",
};

const STATUS_COLORS: Record<string, string> = {
  LOCAL_PENDING: "bg-violet-500/20 border-violet-500/40 text-violet-100",
  UPLOADING: "bg-sky-500/20 border-sky-500/40 text-sky-100",
  UPLOADED: "bg-[#d6b15f]/20 border-[#d6b15f]/40 text-[#f0cf79]",
  FAILED: "bg-red-500/20 border-red-500/40 text-red-100",
  PROCESSING: "bg-amber-500/20 border-amber-500/40 text-amber-100",
  READY: "bg-emerald-500/20 border-emerald-500/40 text-emerald-100",
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function UploadHistoryList({
  recordings,
  isLoading,
  onRetry,
}: UploadHistoryListProps) {
  if (recordings.length === 0 && !isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Upload History</h3>
        <div className="rounded-md border border-white/10 bg-black/18 p-6 text-center">
          <p className="text-sm text-white/52">No uploads yet. Start with step 1 above.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Upload History</h3>
        {recordings.length > 0 && (
          <p className="text-xs text-white/52">{recordings.length} total</p>
        )}
      </div>

      <div className="divide-y divide-white/10 rounded-md border border-white/10 bg-black/18">
        {isLoading && (
          <div className="p-6 text-center">
            <p className="text-sm text-white/52">Loading...</p>
          </div>
        )}

        {!isLoading &&
          recordings.map((recording) => {
            const statusLabel = STATUS_LABELS[recording.status] || recording.status;
            const statusColor = STATUS_COLORS[recording.status] || STATUS_COLORS.LOCAL_PENDING;
            const uploadedDate = recording.uploadedAt
              ? formatDate(recording.uploadedAt)
              : formatDate(recording.createdAt);

            return (
              <div
                key={recording.id}
                className="flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 gap-y-1">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                    <p className="text-sm font-medium text-white truncate">
                      {recording.fileName}
                    </p>
                  </div>
                  <p className="text-xs text-white/52 mt-1">{uploadedDate}</p>
                </div>

                <div className="flex items-center gap-2">
                  {recording.status === "FAILED" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRetry(recording.id)}
                      className="gap-1"
                    >
                      <RefreshCw className="size-3" />
                      Retry
                    </Button>
                  )}

                  {recording.status === "READY" && recording.playbackId && (
                    <a
                      href={`/live/${recording.id}`}
                      className="text-xs font-semibold text-[#d6b15f] hover:text-[#f0cf79]"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
