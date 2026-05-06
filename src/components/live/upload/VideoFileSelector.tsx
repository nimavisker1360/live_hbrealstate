"use client";

import { useRef } from "react";
import { useVideoMetadata } from "@/hooks/useVideoMetadata";
import { Upload } from "lucide-react";

type VideoFileSelectorProps = {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
};

export function VideoFileSelector({
  selectedFile,
  onFileSelect,
}: VideoFileSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const metadata = useVideoMetadata(selectedFile);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("video/")) {
        onFileSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4 rounded-md border border-white/10 bg-black/18 p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-[#d6b15f] text-sm font-bold text-black">
          1
        </div>
        <h3 className="text-sm font-semibold text-white">Select Video File</h3>
      </div>

      {selectedFile ? (
        <div className="space-y-3 rounded-md border border-[#d6b15f]/24 bg-[#d6b15f]/8 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-white/52 mt-1">
                {metadata.sizeLabel}
                {metadata.durationLabel && ` · ${metadata.durationLabel}`}
              </p>
            </div>
            <button
              onClick={() => {
                onFileSelect(null as unknown as File);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="text-xs font-semibold text-[#d6b15f] hover:text-[#f0cf79]"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-white/20 bg-white/[0.02] p-8 transition hover:border-[#d6b15f]/50 hover:bg-[#d6b15f]/5"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-8 text-white/32" />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Tap to select video</p>
            <p className="text-xs text-white/52 mt-1">or drag & drop</p>
          </div>
          <p className="text-xs text-white/40 mt-2">
            MP4, QuickTime, or WebM · Up to 10 GB
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
