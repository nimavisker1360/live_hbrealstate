"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LikeApiResponse = {
  data?: { reelId: string; count: number; liked: boolean };
  error?: { message?: string };
};

type UseReelLikeOptions = {
  reelId: string;
  initialCount: number;
  initialLiked?: boolean;
  fetchInitialState?: boolean;
};

const LIKE_REFRESH_MS = 1000;

export function useReelLike({
  reelId,
  initialCount,
  initialLiked = false,
  fetchInitialState = true,
}: UseReelLikeOptions) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const inflightRef = useRef<AbortController | null>(null);
  const queuedToggleRef = useRef<boolean>(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const refreshLikeState = useCallback(
    async (signal?: AbortSignal) => {
      if (pendingRef.current) return;

      try {
        const res = await fetch(`/api/property-reels/${reelId}/like`, {
          method: "GET",
          credentials: "include",
          signal,
        });
        if (!res.ok) return;

        const json = (await res.json()) as LikeApiResponse;
        if (!json.data) return;

        setLiked(json.data.liked);
        setCount(json.data.count);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          // Ignore background refresh failures; direct user actions still sync.
        }
      }
    },
    [reelId],
  );

  useEffect(() => {
    if (!fetchInitialState) return;

    const controller = new AbortController();
    queueMicrotask(() => {
      void refreshLikeState(controller.signal);
    });

    const interval = window.setInterval(() => {
      if (
        typeof document === "undefined" ||
        document.visibilityState === "visible"
      ) {
        void refreshLikeState();
      }
    }, LIKE_REFRESH_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [fetchInitialState, refreshLikeState]);

  const sync = useCallback(
    async (intendedLiked: boolean, prevLiked: boolean, prevCount: number) => {
      inflightRef.current?.abort();
      const controller = new AbortController();
      inflightRef.current = controller;
      setPending(true);

      try {
        const res = await fetch(`/api/property-reels/${reelId}/like`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            // Server says slow down — keep the optimistic state but
            // don't trust the count; refetch via GET so UI reconciles.
            try {
              const getRes = await fetch(
                `/api/property-reels/${reelId}/like`,
                { method: "GET", credentials: "include" },
              );
              if (getRes.ok) {
                const json = (await getRes.json()) as LikeApiResponse;
                if (json.data) {
                  setLiked(json.data.liked);
                  setCount(json.data.count);
                }
              }
            } catch {
              // swallow
            }
            return;
          }
          throw new Error(`Like failed: ${res.status}`);
        }

        const json = (await res.json()) as LikeApiResponse;
        if (json.data) {
          setLiked(json.data.liked);
          setCount(json.data.count);
        }
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        // Rollback to pre-toggle state
        setLiked(prevLiked);
        setCount(prevCount);
      } finally {
        if (inflightRef.current === controller) {
          inflightRef.current = null;
          setPending(false);
        }

        if (queuedToggleRef.current) {
          queuedToggleRef.current = false;
          // user toggled again while we were syncing — reconcile from server.
          try {
            const getRes = await fetch(
              `/api/property-reels/${reelId}/like`,
              { method: "GET", credentials: "include" },
            );
            if (getRes.ok) {
              const json = (await getRes.json()) as LikeApiResponse;
              if (json.data) {
                setLiked(json.data.liked);
                setCount(json.data.count);
              }
            }
          } catch {
            // swallow
          }
        }
      }
    },
    [reelId],
  );

  const toggle = useCallback(() => {
    setLiked((prevLiked) => {
      const nextLiked = !prevLiked;
      let prevCount = 0;
      setCount((c) => {
        prevCount = c;
        return Math.max(0, nextLiked ? c + 1 : c - 1);
      });
      if (inflightRef.current) {
        queuedToggleRef.current = true;
      }
      void sync(nextLiked, prevLiked, prevCount);
      return nextLiked;
    });
  }, [sync]);

  const likeOnly = useCallback(() => {
    if (liked) return false;
    toggle();
    return true;
  }, [liked, toggle]);

  return { liked, count, pending, toggle, likeOnly };
}
