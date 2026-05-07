"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 1;
const MAX_LENGTH = 500;
const SWIPE_DISMISS_THRESHOLD_PX = 120;
const SWIPE_DISMISS_VELOCITY = 0.6;

type ApiComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
  isMember?: boolean;
};

type SheetComment = ApiComment & { pending?: boolean };

type CommentsResponse = {
  data?: {
    reelId: string;
    commentCount: number;
    comments: ApiComment[];
    nextCursor: string | null;
  };
};

type PostResponse = {
  data?: { comment: ApiComment; commentCount: number };
  error?: { message?: string };
};

type CommentBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  reelId: string;
  isAuthenticated: boolean;
  onCommentAdded: (newCount: number) => void;
};

const cacheStore = new Map<
  string,
  { comments: ApiComment[]; commentCount: number; fetchedAt: number }
>();
const CACHE_TTL_MS = 60_000;

function toApiComment(comment: SheetComment): ApiComment {
  return {
    id: comment.id,
    author: comment.author,
    message: comment.message,
    createdAt: comment.createdAt,
    isMember: comment.isMember,
  };
}

export function CommentBottomSheet({
  open,
  onClose,
  reelId,
  isAuthenticated,
  onCommentAdded,
}: CommentBottomSheetProps) {
  const cached = cacheStore.get(reelId);
  const [comments, setComments] = useState<SheetComment[]>(
    () => cached?.comments ?? [],
  );
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(() => !cached);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [closing, setClosing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStateRef = useRef<{
    startY: number;
    startTime: number;
    pointerId: number;
    lastY: number;
  } | null>(null);

  const trimmedDraft = draft.trim();
  const canSend =
    trimmedDraft.length >= MIN_LENGTH &&
    trimmedDraft.length <= MAX_LENGTH &&
    !posting;

  const triggerClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    setClosing(true);
    setDragOffset(0);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
      setClosing(false);
    }, 240);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    queueMicrotask(() => {
      setClosing(false);
      setDragOffset(0);
    });
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const cachedComments = cacheStore.get(reelId);
    const fresh =
      cachedComments && Date.now() - cachedComments.fetchedAt < CACHE_TTL_MS;

    queueMicrotask(() => {
      if (cancelled) return;
      if (cachedComments) {
        setComments(cachedComments.comments);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
    });

    if (fresh) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const res = await fetch(`/api/property-reels/${reelId}/comments`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const json = (await res.json()) as CommentsResponse;
        if (cancelled || !json.data) return;

        const ordered = [...json.data.comments].reverse();
        cacheStore.set(reelId, {
          comments: ordered,
          commentCount: json.data.commentCount,
          fetchedAt: Date.now(),
        });
        setComments(ordered);
      } catch {
        if (!cancelled && !cachedComments) {
          setError("Could not load comments.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, reelId]);

  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [comments.length, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") triggerClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, triggerClose]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragStateRef.current = {
        startY: event.clientY,
        startTime: performance.now(),
        pointerId: event.pointerId,
        lastY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) return;

      const delta = event.clientY - state.startY;
      state.lastY = event.clientY;
      setDragOffset(Math.max(0, delta));
    },
    [],
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) return;

      const delta = state.lastY - state.startY;
      const elapsed = performance.now() - state.startTime;
      const velocity = elapsed > 0 ? delta / elapsed : 0;

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }

      dragStateRef.current = null;

      if (
        delta > SWIPE_DISMISS_THRESHOLD_PX ||
        velocity > SWIPE_DISMISS_VELOCITY
      ) {
        triggerClose();
        return;
      }

      setDragOffset(0);
    },
    [triggerClose],
  );

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const message = draft.trim();
      if (!message || message.length > MAX_LENGTH || posting) return;

      const tempId = `temp-${Date.now()}`;
      const optimistic: SheetComment = {
        id: tempId,
        author: isAuthenticated ? "You" : "Guest",
        message,
        createdAt: new Date().toISOString(),
        pending: true,
        isMember: isAuthenticated,
      };

      setComments((prev) => [...prev, optimistic]);
      setDraft("");
      setError(null);
      setPosting(true);

      try {
        const res = await fetch(`/api/property-reels/${reelId}/comments`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        const json = (await res.json().catch(() => ({}))) as PostResponse;

        if (!res.ok || !json.data) {
          setError(
            json.error?.message ?? "Could not post comment. Please try again.",
          );
          setComments((prev) => prev.filter((comment) => comment.id !== tempId));
          setDraft(message);
          return;
        }

        setComments((prev) => {
          const next = prev.map((comment) =>
            comment.id === tempId
              ? { ...json.data!.comment, pending: false }
              : comment,
          );
          cacheStore.set(reelId, {
            comments: next.map(toApiComment),
            commentCount: json.data!.commentCount,
            fetchedAt: Date.now(),
          });
          return next;
        });
        onCommentAdded(json.data.commentCount);
      } catch {
        setComments((prev) => prev.filter((comment) => comment.id !== tempId));
        setDraft(message);
        setError("Network error. Please try again.");
      } finally {
        setPosting(false);
      }
    },
    [draft, isAuthenticated, onCommentAdded, posting, reelId],
  );

  const isVisible = open || closing;

  if (!isVisible) {
    return null;
  }

  const translate = closing ? "100%" : `${dragOffset}px`;

  return (
    <div aria-hidden={!open} className="fixed inset-0 z-50 pointer-events-none">
      <div
        className={cn(
          "absolute inset-0 bg-black/35 transition-opacity duration-300",
          open && !closing ? "pointer-events-auto opacity-100" : "opacity-0",
        )}
        onClick={triggerClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto flex h-[70vh] max-h-[70vh] max-w-[480px] flex-col rounded-t-3xl border-t border-white/10 bg-[#0c0a09]/98 text-white shadow-[0_-18px_50px_rgba(0,0,0,0.65)] will-change-transform pointer-events-auto",
          dragOffset === 0 &&
            "transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
        style={{ transform: `translate3d(0, ${translate}, 0)` }}
      >
        <div
          className="flex select-none items-center justify-between border-b border-white/8 px-5 py-2 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex flex-1 flex-col items-center">
            <span className="mb-2 h-1 w-10 rounded-full bg-white/25" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/85">
              Comments
            </h2>
          </div>
          <button
            type="button"
            onClick={triggerClose}
            aria-label="Close comments"
            className="ml-2 inline-flex size-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]"
        >
          {loading && comments.length === 0 ? (
            <CommentsSkeleton />
          ) : comments.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/55">
              Be the first to comment on this property reel.
            </p>
          ) : (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <CommentRow key={comment.id} comment={comment} />
              ))}
            </ul>
          )}
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            >
              {error}
            </p>
          ) : null}
        </div>

        <form
          onSubmit={submit}
          className="border-t border-white/8 bg-[#0c0a09]/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a comment..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_LENGTH}
              autoComplete="off"
              className="h-11 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-white/40 focus:border-[#d6b15f]/60 focus:outline-none"
              aria-label="Write a comment"
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Post comment"
              className={cn(
                "inline-flex size-11 flex-none items-center justify-center rounded-full transition",
                canSend
                  ? "bg-[#d6b15f] text-black shadow-[0_0_18px_rgba(214,177,95,0.35)] hover:bg-[#f0cf79] active:scale-95"
                  : "cursor-not-allowed bg-white/10 text-white/40",
              )}
            >
              <Send className="size-4" />
            </button>
          </div>
          {trimmedDraft.length > MAX_LENGTH * 0.8 ? (
            <p className="mt-1 text-right text-[11px] text-white/45 tabular-nums">
              {trimmedDraft.length}/{MAX_LENGTH}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function CommentRow({ comment }: { comment: SheetComment }) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 transition-opacity",
        comment.pending && "opacity-60",
      )}
    >
      <div
        className={cn(
          "flex size-9 flex-none items-center justify-center rounded-full text-sm font-semibold",
          comment.isMember
            ? "border border-[#d6b15f]/60 bg-[#d6b15f]/15 text-[#f0cf79]"
            : "bg-white/8 text-white/80",
        )}
      >
        {comment.author.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">
          {comment.author}
          {comment.isMember ? (
            <span className="ml-1.5 inline-block size-1.5 rounded-full bg-[#d6b15f] align-middle" />
          ) : null}
        </p>
        <p className="mt-0.5 break-words text-sm leading-snug text-white/85">
          {comment.message}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-white/40">
          {comment.pending ? "Sending..." : formatRelative(comment.createdAt)}
        </p>
      </div>
    </li>
  );
}

function CommentsSkeleton() {
  return (
    <ul className="space-y-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, idx) => (
        <li key={idx} className="flex items-start gap-3">
          <div className="size-9 flex-none rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-3 w-3/4 rounded bg-white/10" />
            <div className="h-2 w-12 rounded bg-white/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}
