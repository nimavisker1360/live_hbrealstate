"use client";

import MuxPlayer from "@mux/mux-player-react";
import { PlayCircle } from "lucide-react";

export function ReplayVideoPlayer({
  playbackId,
  poster,
  storageUrl,
  title,
}: {
  playbackId?: string | null;
  poster: string;
  storageUrl?: string | null;
  title: string;
}) {
  if (playbackId) {
    return (
      <MuxPlayer
        accentColor="#d6b15f"
        className="aspect-video w-full overflow-hidden rounded-md bg-black"
        metadataVideoTitle={title}
        playbackId={playbackId}
        poster={poster}
        preload="metadata"
        primaryColor="#f4f0e8"
        secondaryColor="#050505"
        streamType="on-demand"
        style={{
          "--media-object-fit": "cover",
          "--media-object-position": "center",
        }}
        title={title}
      />
    );
  }

  if (storageUrl) {
    return (
      <video
        className="aspect-video w-full rounded-md bg-black object-cover"
        controls
        poster={poster}
        preload="metadata"
        src={storageUrl}
        title={title}
      />
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-md bg-black">
      <div className="max-w-64 px-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-[#d6b15f]/30 bg-[#d6b15f]/12 text-[#f0cf79]">
          <PlayCircle aria-hidden className="size-6" />
        </div>
        <p className="text-base font-semibold text-white">
          Replay is being prepared
        </p>
        <p className="mt-2 text-sm leading-5 text-white/58">
          The recording is uploaded and will play here as soon as processing is
          complete.
        </p>
      </div>
    </div>
  );
}
