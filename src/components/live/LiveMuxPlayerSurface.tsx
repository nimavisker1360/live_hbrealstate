/* eslint-disable @next/next/no-img-element */
"use client";

import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";
import Image from "next/image";
import { useEffect, useReducer, useRef, useState } from "react";
import { Loader2, Play, WifiOff } from "lucide-react";
import { isInlineImageSrc } from "@/lib/live-media";
import { cn } from "@/lib/utils";

type StreamStatus = "SCHEDULED" | "LIVE" | "ENDED";

export type LivePlayerState =
  | "live"
  | "buffering"
  | "reconnecting"
  | "connection_lost"
  | "offline"
  | "replay_available";

type LivePlayerEvent =
  | { type: "BUFFERING" }
  | { type: "CONNECTION_LOST" }
  | { type: "LIVE_READY" }
  | { type: "LIVE_REQUESTED" }
  | { type: "OFFLINE" }
  | { type: "RECONNECTING" }
  | { type: "REPLAY_AVAILABLE" }
  | { type: "STREAM_UNAVAILABLE" };

const BUFFERING_GRACE_MS = 4_500;
const CONNECTION_LOST_GRACE_MS = 2_000;
const MAX_RECONNECT_ATTEMPTS = 8;

export function livePlayerReducer(
  state: LivePlayerState,
  event: LivePlayerEvent,
): LivePlayerState {
  switch (event.type) {
    case "LIVE_REQUESTED":
      return state === "live" ? "live" : "buffering";
    case "LIVE_READY":
      return "live";
    case "BUFFERING":
      return state === "live" ? "buffering" : state;
    case "RECONNECTING":
      return "reconnecting";
    case "CONNECTION_LOST":
      return "connection_lost";
    case "REPLAY_AVAILABLE":
      return "replay_available";
    case "OFFLINE":
    case "STREAM_UNAVAILABLE":
      return "offline";
    default:
      return state;
  }
}

export function LiveMuxPlayerSurface({
  image,
  playbackId,
  startsAt,
  status,
  title,
}: {
  image: string;
  playbackId?: string | null;
  startsAt?: string | null;
  status: StreamStatus;
  title: string;
}) {
  const playerRef = useRef<MuxPlayerElement | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [playerState, dispatch] = useReducer(livePlayerReducer, "offline");
  const [hasRenderedPlayback, setHasRenderedPlayback] = useState(false);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);

  const isLivePlayback = status === "LIVE" && Boolean(playbackId);
  const isReplayPlayback = status === "ENDED" && Boolean(playbackId);
  const shouldRenderPlayer = isLivePlayback || isReplayPlayback;

  useEffect(() => {
    reconnectAttemptsRef.current = 0;

    if (isReplayPlayback) {
      dispatch({ type: "REPLAY_AVAILABLE" });
      return;
    }

    if (isLivePlayback) {
      dispatch({ type: "LIVE_REQUESTED" });
      return;
    }

    dispatch({ type: "STREAM_UNAVAILABLE" });
  }, [isLivePlayback, isReplayPlayback, playbackId, status]);

  useEffect(() => {
    function handleOnline() {
      if (isLivePlayback) {
        dispatch({ type: "RECONNECTING" });
      }
    }

    function handleOffline() {
      dispatch({ type: "OFFLINE" });
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      dispatch({ type: "OFFLINE" });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isLivePlayback]);

  useEffect(() => {
    if (playerState !== "buffering" || !isLivePlayback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "RECONNECTING" });
    }, BUFFERING_GRACE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isLivePlayback, playerState]);

  useEffect(() => {
    if (playerState !== "reconnecting" || !isLivePlayback) {
      return;
    }

    if (!navigator.onLine) {
      dispatch({ type: "OFFLINE" });
      return;
    }

    let timeoutId: number | undefined;
    let isCancelled = false;

    function scheduleReconnect() {
      const currentAttempt = reconnectAttemptsRef.current;

      if (currentAttempt >= MAX_RECONNECT_ATTEMPTS) {
        dispatch({ type: "CONNECTION_LOST" });
        return;
      }

      const retryDelay = Math.min(1_000 + currentAttempt * 900, 5_000);

      timeoutId = window.setTimeout(() => {
        if (isCancelled) {
          return;
        }

        reconnectAttemptsRef.current += 1;
        const player = playerRef.current;

        player?.load();
        void player?.play().catch(() => undefined);
        scheduleReconnect();
      }, retryDelay);
    }

    scheduleReconnect();

    return () => {
      isCancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isLivePlayback, playerState]);

  useEffect(() => {
    if (playerState !== "connection_lost") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dispatch({ type: "REPLAY_AVAILABLE" });
    }, CONNECTION_LOST_GRACE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [playerState]);

  function markPlayerReady() {
    reconnectAttemptsRef.current = 0;
    setHasRenderedPlayback(true);

    if (isLivePlayback) {
      dispatch({ type: "LIVE_READY" });
      return;
    }

    if (isReplayPlayback) {
      dispatch({ type: "REPLAY_AVAILABLE" });
    }
  }

  function recoverPlayback() {
    if (!isLivePlayback) {
      return;
    }

    if (!navigator.onLine) {
      dispatch({ type: "OFFLINE" });
      return;
    }

    dispatch({ type: "RECONNECTING" });
  }

  function playReplay() {
    const player = playerRef.current;

    if (!player) {
      return;
    }

    setIsReplayPlaying(true);
    void player.play().catch(() => setIsReplayPlaying(false));
  }

  const showPoster = !hasRenderedPlayback || playerState === "offline";
  const overlay = getOverlayContent({
    isReplayPlayback,
    playerState,
    startsAt,
    status,
  });

  return (
    <div className="absolute inset-0 bg-black">
      {isInlineImageSrc(image) ? (
        <img
          alt={title}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            showPoster ? "opacity-100" : "opacity-0",
          )}
          src={image}
        />
      ) : (
        <Image
          alt={title}
          className={cn(
            "object-cover transition-opacity duration-500",
            showPoster ? "opacity-100" : "opacity-0",
          )}
          fill
          priority
          sizes="(min-width: 1024px) 520px, 100vw"
          src={image}
        />
      )}

      {shouldRenderPlayer ? (
        <MuxPlayer
          accentColor="#d6b15f"
          autoPlay={isLivePlayback}
          className="absolute inset-0 h-full w-full"
          key={`${playbackId}-${status}`}
          metadataVideoTitle={title}
          muted={false}
          onEnded={() => {
            if (isReplayPlayback) {
              setIsReplayPlaying(false);
              dispatch({ type: "REPLAY_AVAILABLE" });
            }
          }}
          onError={recoverPlayback}
          onLoadedData={markPlayerReady}
          onPlaying={markPlayerReady}
          onPlay={() => {
            if (isReplayPlayback) {
              setIsReplayPlaying(true);
            }
          }}
          onStalled={recoverPlayback}
          onWaiting={() => {
            if (isLivePlayback) {
              dispatch({ type: "BUFFERING" });
            }
          }}
          playbackId={playbackId ?? undefined}
          playsInline
          poster={image}
          preload="auto"
          primaryColor="#f4f0e8"
          ref={playerRef}
          secondaryColor="#050505"
          streamType={isLivePlayback ? "ll-live" : "on-demand"}
          style={{
            "--media-object-fit": "cover",
            "--media-object-position": "center",
          }}
          title={title}
        />
      ) : null}

      {overlay && !isReplayPlaying ? (
        <LivePlayerOverlay
          actionLabel={
            playerState === "replay_available" && isReplayPlayback
              ? "Watch replay"
              : undefined
          }
          icon={overlay.icon}
          isLoading={overlay.isLoading}
          onAction={
            playerState === "replay_available" && isReplayPlayback
              ? playReplay
              : undefined
          }
          subtitle={overlay.subtitle}
          title={overlay.title}
        />
      ) : null}
    </div>
  );
}

function getOfflineDetail(status: StreamStatus, startsAt?: string | null) {
  if (status === "ENDED") {
    return "The agent has closed this room.";
  }

  if (!startsAt) {
    return "The agent has not started broadcasting yet.";
  }

  return `Scheduled for ${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(startsAt))}`;
}

function getOverlayContent({
  isReplayPlayback,
  playerState,
  startsAt,
  status,
}: {
  isReplayPlayback: boolean;
  playerState: LivePlayerState;
  startsAt?: string | null;
  status: StreamStatus;
}) {
  if (playerState === "live") {
    return null;
  }

  if (playerState === "buffering") {
    return {
      icon: "loading" as const,
      isLoading: true,
      subtitle: "Keeping the tour ready on this device.",
      title: "Loading live video",
    };
  }

  if (playerState === "reconnecting") {
    return {
      icon: "loading" as const,
      isLoading: true,
      subtitle: "Please stay on this page.",
      title: "Connection lost. Trying to reconnect…",
    };
  }

  if (playerState === "connection_lost") {
    return {
      icon: "offline" as const,
      isLoading: true,
      subtitle: "One more moment while we check the live room.",
      title: "Connection lost. Trying to reconnect…",
    };
  }

  if (playerState === "replay_available") {
    return {
      icon: isReplayPlayback ? ("play" as const) : ("offline" as const),
      isLoading: !isReplayPlayback,
      subtitle: isReplayPlayback
        ? "Watch the tour again from the beginning."
        : "The recording is being prepared.",
      title: isReplayPlayback
        ? "Replay available"
        : "Replay will be available soon",
    };
  }

  return {
    icon: "offline" as const,
    isLoading: false,
    subtitle: getOfflineDetail(status, startsAt),
    title: status === "ENDED" ? "Live session ended" : "Stream offline",
  };
}

function LivePlayerOverlay({
  actionLabel,
  icon,
  isLoading,
  onAction,
  subtitle,
  title,
}: {
  actionLabel?: string;
  icon: "loading" | "offline" | "play";
  isLoading: boolean;
  onAction?: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/34 px-6 text-center opacity-100 backdrop-blur-[2px] transition-opacity duration-300">
      <div className="w-full max-w-72 rounded-lg border border-white/12 bg-black/58 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-[#d6b15f]/30 bg-[#d6b15f]/12 text-[#f0cf79]">
          {icon === "loading" || isLoading ? (
            <Loader2 aria-hidden className="size-5 animate-spin" />
          ) : icon === "play" ? (
            <Play aria-hidden className="ml-0.5 size-5" fill="currentColor" />
          ) : (
            <WifiOff aria-hidden className="size-5" />
          )}
        </div>
        <p className="text-base font-semibold text-white">{title}</p>
        <p className="mx-auto mt-2 max-w-56 text-sm leading-5 text-white/64">
          {subtitle}
        </p>
        {onAction && actionLabel ? (
          <button
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#d6b15f] px-4 text-sm font-semibold text-black transition hover:bg-[#f0cf79] focus:outline-none focus:ring-2 focus:ring-[#f0cf79] focus:ring-offset-2 focus:ring-offset-black"
            onClick={onAction}
            type="button"
          >
            <Play aria-hidden className="size-4" fill="currentColor" />
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
