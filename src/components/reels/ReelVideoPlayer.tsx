"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Loader2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "@/lib/i18n/client";

export type ReelVideoPlayerHandle = {
  play: () => void;
  pause: () => void;
};

type ReelVideoPlayerProps = {
  videoUrl: string;
  mimeType: string;
  poster: string;
  isProcessing: boolean;
  onDoubleTap: (x: number, y: number) => void;
};

const DOUBLE_TAP_THRESHOLD_MS = 280;

export const ReelVideoPlayer = forwardRef<
  ReelVideoPlayerHandle,
  ReelVideoPlayerProps
>(function ReelVideoPlayer(
  { videoUrl, mimeType, poster, isProcessing, onDoubleTap },
  ref,
) {
  const t = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedFrame, setHasLoadedFrame] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      play: () => {
        const v = videoRef.current;
        if (!v) return;
        v.play().catch(() => {
          /* autoplay may be blocked */
        });
      },
      pause: () => {
        videoRef.current?.pause();
      },
    }),
    [],
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v || isProcessing) return;
    v.muted = true;
    v.play().catch(() => {
      setIsPlaying(false);
    });
  }, [isProcessing]);

  const togglePlayback = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
    } else {
      v.pause();
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 500);
  }, []);

  const handleTap = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isProcessing || hasError) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const now = Date.now();
      const since = now - lastTapRef.current;

      if (since < DOUBLE_TAP_THRESHOLD_MS && since > 0) {
        if (tapTimerRef.current) {
          clearTimeout(tapTimerRef.current);
          tapTimerRef.current = null;
        }
        lastTapRef.current = 0;
        onDoubleTap(x, y);
        return;
      }

      lastTapRef.current = now;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        togglePlayback();
        tapTimerRef.current = null;
      }, DOUBLE_TAP_THRESHOLD_MS);
    },
    [hasError, isProcessing, onDoubleTap, togglePlayback],
  );

  return (
    <div
      className="absolute inset-0 z-10 select-none touch-manipulation"
      onPointerDown={handleTap}
    >
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain sm:object-cover"
        playsInline
        loop
        autoPlay
        muted={isMuted}
        poster={poster}
        preload="metadata"
        onLoadedData={() => {
          setHasLoadedFrame(true);
          setIsLoading(false);
        }}
        onWaiting={() => {
          if (!hasLoadedFrame) {
            setIsLoading(true);
          }
        }}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
      >
        <source src={videoUrl} type={mimeType} />
      </video>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          const v = videoRef.current;
          if (!v) return;
          const next = !v.muted;
          v.muted = next;
          setIsMuted(next);
        }}
        className="absolute bottom-32 left-4 z-20 inline-flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
        aria-label={isMuted ? t.reelViewer.unmuteVideo : t.reelViewer.muteVideo}
      >
        {isMuted ? (
          <VolumeX className="size-5" />
        ) : (
          <Volume2 className="size-5" />
        )}
      </button>

      {isProcessing ? (
        <CenteredOverlay>
          <Loader2 className="size-10 animate-spin text-[#d6b15f]" />
          <p className="mt-3 text-sm font-medium">
            {t.reelViewer.processingReel}
          </p>
        </CenteredOverlay>
      ) : hasError ? (
        <CenteredOverlay>
          <p className="text-base font-semibold">
            {t.reelViewer.couldNotLoadVideo}
          </p>
        </CenteredOverlay>
      ) : isLoading ? (
        <CenteredOverlay subtle>
          <Loader2 className="size-9 animate-spin text-white/80" />
        </CenteredOverlay>
      ) : null}

      {showPlayIcon && !isProcessing && !hasError ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 animate-reel-fade rounded-full bg-black/55 p-5 backdrop-blur-md"
          aria-hidden
        >
          {isPlaying ? (
            <Play className="size-10 text-white" fill="currentColor" />
          ) : (
            <Pause className="size-10 text-white" fill="currentColor" />
          )}
        </div>
      ) : null}
    </div>
  );
});

function CenteredOverlay({
  children,
  subtle = false,
}: {
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center text-center ${
        subtle ? "bg-black/30" : "bg-black/65 backdrop-blur-sm"
      }`}
    >
      {children}
    </div>
  );
}
