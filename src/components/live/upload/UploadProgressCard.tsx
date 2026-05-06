"use client";

import { Button } from "@/components/ui/Button";
import type { UploadState } from "@/hooks/useChunkedUpload";
import { Pause, Play, X } from "lucide-react";

type UploadProgressCardProps = {
  state: UploadState;
  isUploading: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => Promise<void>;
};

export function UploadProgressCard({
  state,
  isUploading,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: UploadProgressCardProps) {
  return (
    <div className="space-y-4 rounded-md border border-white/10 bg-black/18 p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-[#d6b15f] text-sm font-bold text-black">
          3
        </div>
        <h3 className="text-sm font-semibold text-white">Upload</h3>
      </div>

      {state.phase === "idle" && (
        <div className="text-center space-y-3">
          <p className="text-sm text-white/52">Select a file and choose a stream to begin.</p>
        </div>
      )}

      {state.phase === "preparing" && (
        <div className="text-center space-y-3">
          <div className="inline-block">
            <div className="h-2 w-32 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#d6b15f] to-[#f0cf79] animate-pulse"
                style={{ width: "33%" }}
              />
            </div>
          </div>
          <p className="text-sm text-white/72">Preparing upload...</p>
        </div>
      )}

      {(state.phase === "uploading" || state.phase === "paused") && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white/72">
                {state.phase === "uploading"
                  ? `Uploading ${state.uploadedChunks}/${state.totalChunks} chunks`
                  : `Paused at ${state.uploadedChunks}/${state.totalChunks} chunks`}
              </p>
              <p className="text-xs font-semibold text-[#d6b15f]">{state.percent}%</p>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#d6b15f] to-[#f0cf79] transition-all duration-300"
                style={{ width: `${state.percent}%` }}
              />
            </div>
          </div>

          {state.phase === "uploading" && (
            <div className="flex items-center justify-between text-xs text-white/52">
              <span>{state.speed}</span>
              <span>{state.eta}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {state.phase === "uploading" ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onPause}
                  className="gap-2"
                >
                  <Pause className="size-4" />
                  Pause
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onCancel}
                  className="gap-2"
                >
                  <X className="size-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={onResume}
                  className="gap-2"
                >
                  <Play className="size-4" />
                  Resume
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={onCancel}
                  className="gap-2"
                >
                  <X className="size-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {state.phase === "assembling" && (
        <div className="text-center space-y-3">
          <div className="inline-block">
            <div className="h-2 w-32 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#d6b15f] to-[#f0cf79] animate-pulse"
                style={{ width: "66%" }}
              />
            </div>
          </div>
          <p className="text-sm text-white/72">Assembling video...</p>
        </div>
      )}

      {state.phase === "done" && (
        <div className="space-y-3 rounded-md border border-[#d6b15f]/24 bg-[#d6b15f]/8 p-4">
          <p className="text-sm font-semibold text-white">✓ Upload Complete!</p>
          <p className="text-xs text-white/72">
            {state.status === "PROCESSING"
              ? "Your video is being processed. Check back shortly for the playback link."
              : "Your video is ready to view."}
          </p>
          {state.playbackId && (
            <a
              href={`/live/${state.recordingId}`}
              className="inline-block text-xs font-semibold text-[#d6b15f] hover:text-[#f0cf79]"
            >
              View recording →
            </a>
          )}
        </div>
      )}

      {state.phase === "error" && (
        <div className="space-y-3 rounded-md border border-red-400/30 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-100">✗ Upload Failed</p>
          <p className="text-xs text-red-100/72">{state.message}</p>
          {state.canRetry && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRetry}
              disabled={isUploading}
              className="mt-2"
            >
              Retry Upload
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
