"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useChunkedUpload } from "@/hooks/useChunkedUpload";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { VideoFileSelector } from "./VideoFileSelector";
import { StreamSelector } from "./StreamSelector";
import { UploadProgressCard } from "./UploadProgressCard";
import { UploadHistoryList } from "./UploadHistoryList";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type LiveSessionInfo = {
  id: string;
  title: string;
  status: string;
  property: { title: string; location: string };
};

type Recording = {
  id: string;
  fileName: string;
  status: string;
  uploadedAt: string | null;
  createdAt: string;
  playbackId: string | null;
};

type UploadRecoveryClientProps = {
  initialSessions: LiveSessionInfo[];
};

type ApiResponse<T> = {
  data?: T;
  error?: { message?: string };
};

export function UploadRecoveryClient({ initialSessions }: UploadRecoveryClientProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string | undefined>();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const { state: uploadState, start, pause, resume, cancel, retry } = useChunkedUpload();
  const { isOnline } = useNetworkStatus();

  const isUploading =
    uploadState.phase === "uploading" || uploadState.phase === "preparing" || uploadState.phase === "assembling";

  // Auto-pause on offline, auto-resume on online
  useEffect(() => {
    if (!isOnline && uploadState.phase === "uploading") {
      pause();
    }
  }, [isOnline, uploadState.phase, pause]);

  // Load upload history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/live-recordings");
        const body = (await response.json().catch(() => ({}))) as ApiResponse<Recording[]>;

        if (response.ok && body.data) {
          setRecordings(body.data);
        }
      } catch (error) {
        console.error("Failed to load upload history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();

    // Poll every 5 seconds to update status
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  // Refetch history after successful upload
  useEffect(() => {
    if (uploadState.phase === "done") {
      const timer = setTimeout(() => {
        fetch("/api/live-recordings")
          .then((r) => r.json())
          .then((body) => {
            if (body.data) setRecordings(body.data);
          })
          .catch(() => {});
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [uploadState]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleStart = async () => {
    if (!selectedFile) return;

    try {
      await start(selectedFile, selectedStreamId);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handleRetry = async (recordingId: string) => {
    // Retry for failed recordings - would need additional logic
    // For now, just refetch history
    const response = await fetch("/api/live-recordings");
    const body = (await response.json().catch(() => ({}))) as ApiResponse<Recording[]>;
    if (response.ok && body.data) {
      setRecordings(body.data);
    }
  };

  const canStartUpload = selectedFile && !isUploading && uploadState.phase === "idle";

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#050505]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/agent/dashboard" className="text-white/52 hover:text-white transition">
              <ChevronLeft className="size-5" />
            </Link>
            <h1 className="text-lg font-semibold text-white">Upload Recovery</h1>
          </div>
        </div>
      </div>

      <ConnectionStatusBadge />

      {/* Main content */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
            Recovery
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Select & Upload Recording
          </h2>
          <p className="mt-1 text-sm text-white/52">
            Upload video files saved locally when your internet connection was lost.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: File Selection */}
          <VideoFileSelector selectedFile={selectedFile} onFileSelect={handleFileSelect} />

          {/* Step 2: Stream Selector */}
          {selectedFile && (
            <StreamSelector
              sessions={initialSessions}
              selectedStreamId={selectedStreamId}
              onStreamSelect={setSelectedStreamId}
            />
          )}

          {/* Step 3: Upload Progress */}
          {selectedFile && (
            <>
              <UploadProgressCard
                state={uploadState}
                isUploading={isUploading}
                onPause={pause}
                onResume={resume}
                onCancel={cancel}
                onRetry={retry}
              />

              {/* Start button */}
              {uploadState.phase === "idle" && (
                <button
                  onClick={handleStart}
                  disabled={!canStartUpload}
                  className="w-full h-14 rounded-lg bg-[#d6b15f] text-black font-semibold shadow-[0_0_30px_rgba(214,177,95,0.22)] hover:bg-[#f0cf79] disabled:opacity-55 disabled:cursor-not-allowed transition"
                >
                  Start Upload
                </button>
              )}
            </>
          )}
        </div>

        {/* History */}
        <div className="mt-12">
          <UploadHistoryList
            recordings={recordings}
            isLoading={isLoadingHistory}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </div>
  );
}
