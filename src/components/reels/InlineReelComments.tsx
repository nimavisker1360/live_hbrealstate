"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 500;
const POLL_MS = 1000;
const TOAST_MS = 4000;

export type InlineReelCommentsHandle = {
  focus: () => void;
};

type ApiComment = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
  isMember?: boolean;
};

type CommentToast = ApiComment & {
  optimistic?: boolean;
};

type CommentsResponse = {
  data?: {
    commentCount: number;
    comments: ApiComment[];
  };
};

type PostResponse = {
  data?: {
    comment: ApiComment;
    commentCount: number;
  };
  error?: { message?: string };
};

type InlineReelCommentsProps = {
  reelId: string;
  isAuthenticated: boolean;
  onCommentCountChange: (newCount: number) => void;
};

export const InlineReelComments = forwardRef<
  InlineReelCommentsHandle,
  InlineReelCommentsProps
>(function InlineReelComments(
  { reelId, isAuthenticated, onCommentCountChange },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const seenCommentIdsRef = useRef<Set<string>>(new Set());
  const removeTimersRef = useRef<Map<string, number>>(new Map());
  const hasLoadedInitialCommentsRef = useRef(false);
  const [toasts, setToasts] = useState<CommentToast[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduleToastRemoval = useCallback((id: string) => {
    const existing = removeTimersRef.current.get(id);
    if (existing) {
      window.clearTimeout(existing);
    }

    const timer = window.setTimeout(() => {
      removeTimersRef.current.delete(id);
      setToasts((prev) => prev.filter((comment) => comment.id !== id));
    }, TOAST_MS);

    removeTimersRef.current.set(id, timer);
  }, []);

  const showToast = useCallback(
    (comment: CommentToast) => {
      setToasts((prev) => [...prev.filter((item) => item.id !== comment.id), comment].slice(-4));
      scheduleToastRemoval(comment.id);
    },
    [scheduleToastRemoval],
  );

  const loadComments = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/property-reels/${reelId}/comments`, {
          credentials: "include",
          signal,
        });
        if (!res.ok) return;

        const json = (await res.json()) as CommentsResponse;
        if (!json.data) return;

        const ordered = [...json.data.comments].reverse();
        if (!hasLoadedInitialCommentsRef.current) {
          ordered.forEach((comment) => seenCommentIdsRef.current.add(comment.id));
          hasLoadedInitialCommentsRef.current = true;
        } else {
          ordered.forEach((comment) => {
            if (!seenCommentIdsRef.current.has(comment.id)) {
              seenCommentIdsRef.current.add(comment.id);
              showToast(comment);
            }
          });
        }

        onCommentCountChange(json.data.commentCount);
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          // Keep the reel usable if background refresh fails.
        }
      }
    },
    [onCommentCountChange, reelId, showToast],
  );

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        inputRef.current?.focus();
      },
    }),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const removeTimers = removeTimersRef.current;
    void loadComments(controller.signal);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadComments();
      }
    }, POLL_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
      removeTimers.forEach((timer) => window.clearTimeout(timer));
      removeTimers.clear();
    };
  }, [loadComments]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const message = draft.trim();
    if (!message || message.length > MAX_LENGTH || posting) return;

    const optimistic: CommentToast = {
      id: `temp-${Date.now()}`,
      author: isAuthenticated ? "You" : "Guest",
      message,
      createdAt: new Date().toISOString(),
      isMember: isAuthenticated,
      optimistic: true,
    };

    seenCommentIdsRef.current.add(optimistic.id);
    showToast(optimistic);
    setDraft("");
    setPosting(true);
    setError(null);

    try {
      const res = await fetch(`/api/property-reels/${reelId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const json = (await res.json().catch(() => ({}))) as PostResponse;

      if (!res.ok || !json.data) {
        setDraft(message);
        setToasts((prev) =>
          prev.filter((comment) => comment.id !== optimistic.id),
        );
        setError(
          json.error?.message ?? "Could not post comment. Please try again.",
        );
        return;
      }

      seenCommentIdsRef.current.add(json.data.comment.id);
      setToasts((prev) =>
        prev.map((comment) =>
          comment.id === optimistic.id ? json.data!.comment : comment,
        ),
      );
      scheduleToastRemoval(json.data.comment.id);
      onCommentCountChange(json.data.commentCount);
      window.setTimeout(() => void loadComments(), 250);
    } catch {
      setDraft(message);
      setToasts((prev) =>
        prev.filter((comment) => comment.id !== optimistic.id),
      );
      setError("Network error. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  const canSend = draft.trim().length > 0 && !posting;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[5.25rem] z-30 px-4">
      <div className="mr-20 max-w-[350px]">
        <div className="mb-2 space-y-1.5">
          {toasts.map((comment) => (
            <div
              key={comment.id}
              className="animate-reel-comment-toast w-fit max-w-full rounded-2xl bg-black/45 px-3 py-1.5 text-sm text-white shadow-lg backdrop-blur-md"
            >
              <span className="mr-2 font-semibold">
                {comment.author}
              </span>
              <span className="break-words text-white/90">
                {comment.message}
              </span>
            </div>
          ))}
        </div>

        <form
          onSubmit={submit}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/12 bg-black/48 p-1.5 shadow-xl backdrop-blur-md"
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            maxLength={MAX_LENGTH}
            autoComplete="off"
            aria-label="Write a comment"
            placeholder="Add a comment..."
            className="h-9 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/45"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Post comment"
            className={cn(
              "inline-flex size-9 flex-none items-center justify-center rounded-full transition",
              canSend
                ? "bg-[#d6b15f] text-black active:scale-95"
                : "cursor-not-allowed bg-white/10 text-white/35",
            )}
          >
            <Send className="size-4" />
          </button>
        </form>

        {error ? (
          <p className="pointer-events-none mt-1.5 rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-100">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
});
