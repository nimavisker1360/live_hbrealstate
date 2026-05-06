"use client";

import { useEffect, useState } from "react";

export type VideoMetadata = {
  duration: number | null;
  durationLabel: string | null;
  sizeLabel: string;
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function useVideoMetadata(file: File | null): VideoMetadata {
  const [metadata, setMetadata] = useState<VideoMetadata>({
    duration: null,
    durationLabel: null,
    sizeLabel: formatFileSize(0),
  });

  useEffect(() => {
    if (!file) {
      setMetadata({
        duration: null,
        durationLabel: null,
        sizeLabel: formatFileSize(0),
      });
      return;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    const handleLoadedMetadata = () => {
      const duration = video.duration;
      if (Number.isFinite(duration)) {
        setMetadata({
          duration,
          durationLabel: formatDuration(duration),
          sizeLabel: formatFileSize(file.size),
        });
      }
      URL.revokeObjectURL(url);
    };

    const handleError = () => {
      setMetadata({
        duration: null,
        durationLabel: null,
        sizeLabel: formatFileSize(file.size),
      });
      URL.revokeObjectURL(url);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    video.addEventListener("error", handleError, { once: true });

    // Set timeout to cleanup if metadata never loads (corrupt file)
    const timeoutId = setTimeout(() => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
      setMetadata({
        duration: null,
        durationLabel: null,
        sizeLabel: formatFileSize(file.size),
      });
      URL.revokeObjectURL(url);
    }, 5000);

    video.src = url;

    return () => {
      clearTimeout(timeoutId);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return metadata;
}
