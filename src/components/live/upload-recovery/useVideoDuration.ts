"use client";

import { useEffect, useState } from "react";

export function useVideoDuration(file: File | null) {
  const [metadata, setMetadata] = useState<{
    duration: number;
    file: File;
  } | null>(null);

  useEffect(() => {
    if (!file) {
      return;
    }

    const selectedFile = file;
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(selectedFile);
    let ignore = false;

    video.preload = "metadata";
    video.src = objectUrl;

    function handleLoadedMetadata() {
      if (!ignore && Number.isFinite(video.duration)) {
        setMetadata({ duration: video.duration, file: selectedFile });
      }
    }

    function handleError() {
      if (!ignore) {
        setMetadata(null);
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("error", handleError);

    return () => {
      ignore = true;
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return metadata?.file === file ? metadata.duration : null;
}
