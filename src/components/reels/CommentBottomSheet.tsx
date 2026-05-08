"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  BadgeCheck,
  ChevronDown,
  Pin,
  Reply,
  Send,
  X,
} from "lucide-react";
import {
  PUSHER_EVENTS,
  getReelCommentsChannel,
  type RealtimeReelCommentEvent,
} from "@/lib/pusher-channels";
import { createPusherClient } from "@/lib/pusher-client";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 1;
const MAX_LENGTH = 500;
const SWIPE_DISMISS_THRESHOLD_PX = 120;
const SWIPE_DISMISS_VELOCITY = 0.6;
const REALTIME_FALLBACK_POLL_MS = 1000;

type ApiComment = {
  id: string;
  parentId: string | null;
  author: string;
  message: string;
  createdAt: string;
  isMember?: boolean;
  isAgent?: boolean;
  agentBadge?: "Official Agent" | "HB Agent" | null;
  isPinned?: boolean;
  likeCount?: number;
  replies?: ApiComment[];
};

type SheetComment = ApiComment & {
  pending?: boolean;
  replies?: SheetComment[];
};

type SortMode = "newest" | "mostLiked";

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

type ReplyTarget = {
  id: string;
  author: string;
};

type CommentBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  reelId: string;
  isAuthenticated: boolean;
  isAgent: boolean;
  onCommentAdded: (newCount: number) => void;
};

const cacheStore = new Map<
  string,
  { comments: ApiComment[]; commentCount: number; fetchedAt: number }
>();
const CACHE_TTL_MS = 60_000;

function cacheKey(reelId: string, sort: SortMode) {
  return `${reelId}:${sort}`;
}

function toApiComment(comment: SheetComment): ApiComment {
  return {
    id: comment.id,
    parentId: comment.parentId,
    author: comment.author,
    message: comment.message,
    createdAt: comment.createdAt,
    isMember: comment.isMember,
    isAgent: comment.isAgent,
    agentBadge: comment.agentBadge,
    isPinned: comment.isPinned,
    likeCount: comment.likeCount,
    replies: comment.replies?.map(toApiComment),
  };
}

function appendReply(
  comments: SheetComment[],
  parentId: string,
  reply: SheetComment,
) {
  return comments.map((comment) =>
    comment.id === parentId
      ? { ...comment, replies: [...(comment.replies ?? []), reply] }
      : comment,
  );
}

function replaceComment(
  comments: SheetComment[],
  tempId: string,
  created: SheetComment,
) {
  return comments.map((comment) => {
    if (comment.id === tempId) return created;

    return {
      ...comment,
      replies: comment.replies?.map((reply) =>
        reply.id === tempId ? created : reply,
      ),
    };
  });
}

function removeComment(comments: SheetComment[], id: string) {
  return comments
    .filter((comment) => comment.id !== id)
    .map((comment) => ({
      ...comment,
      replies: comment.replies?.filter((reply) => reply.id !== id),
    }));
}

function hasComment(comments: SheetComment[], id: string) {
  return comments.some(
    (comment) =>
      comment.id === id || comment.replies?.some((reply) => reply.id === id),
  );
}

function mergeIncomingComment(
  comments: SheetComment[],
  incoming: ApiComment,
  sort: SortMode,
) {
  if (hasComment(comments, incoming.id)) {
    return { comments, inserted: false, parentId: incoming.parentId };
  }

  if (incoming.parentId) {
    let inserted = false;
    const next = comments.map((comment) => {
      if (comment.id !== incoming.parentId) return comment;

      inserted = true;
      return {
        ...comment,
        replies: [...(comment.replies ?? []), incoming],
      };
    });

    return {
      comments: inserted ? next : comments,
      inserted,
      parentId: incoming.parentId,
    };
  }

  return {
    comments:
      sort === "newest" ? [incoming, ...comments] : [...comments, incoming],
    inserted: true,
    parentId: null,
  };
}

export function CommentBottomSheet({
  open,
  onClose,
  reelId,
  isAuthenticated,
  isAgent,
  onCommentAdded,
}: CommentBottomSheetProps) {
  const [sort, setSort] = useState<SortMode>("newest");
  const cached = cacheStore.get(cacheKey(reelId, sort));
  const [comments, setComments] = useState<SheetComment[]>(
    () => cached?.comments ?? [],
  );
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(() => !cached);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [closing, setClosing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientEventIdRef = useRef(0);
  const pendingClientEventIdsRef = useRef<Set<string>>(new Set());
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

  const persistCache = useCallback(
    (next: SheetComment[], commentCount: number) => {
      cacheStore.set(cacheKey(reelId, sort), {
        comments: next.map(toApiComment),
        commentCount,
        fetchedAt: Date.now(),
      });
    },
    [reelId, sort],
  );

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
      setReplyTo(null);
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
    const key = cacheKey(reelId, sort);
    const cachedComments = cacheStore.get(key);
    const fresh =
      cachedComments && Date.now() - cachedComments.fetchedAt < CACHE_TTL_MS;

    queueMicrotask(() => {
      if (cancelled) return;
      if (cachedComments) {
        setComments(cachedComments.comments);
        setLoading(false);
      } else {
        setComments([]);
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
        const res = await fetch(
          `/api/property-reels/${reelId}/comments?take=100&sort=${sort}`,
          { cache: "no-store", credentials: "include" },
        );
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const json = (await res.json()) as CommentsResponse;
        if (cancelled || !json.data) return;

        cacheStore.set(key, {
          comments: json.data.comments,
          commentCount: json.data.commentCount,
          fetchedAt: Date.now(),
        });
        setComments(json.data.comments);
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
  }, [open, reelId, sort]);

  useEffect(() => {
    if (!open) return;

    const pusher = createPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(getReelCommentsChannel(reelId));
    const onCommentCreated = (payload: RealtimeReelCommentEvent) => {
      if (payload.reelId !== reelId) return;
      if (
        payload.clientEventId &&
        pendingClientEventIdsRef.current.has(payload.clientEventId)
      ) {
        return;
      }

      setComments((prev) => {
        const merged = mergeIncomingComment(prev, payload.comment, sort);
        if (!merged.inserted) return prev;

        persistCache(merged.comments, payload.commentCount);
        return merged.comments;
      });

      const parentId = payload.comment.parentId;
      if (parentId) {
        setCollapsed((prev) => {
          const next = new Set(prev);
          next.delete(parentId);
          return next;
        });
      }

      onCommentAdded(payload.commentCount);
    };

    channel.bind(PUSHER_EVENTS.COMMENT_CREATED, onCommentCreated);

    return () => {
      channel.unbind(PUSHER_EVENTS.COMMENT_CREATED, onCommentCreated);
      pusher.unsubscribe(getReelCommentsChannel(reelId));
      pusher.disconnect();
    };
  }, [onCommentAdded, open, persistCache, reelId, sort]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const refresh = async () => {
      if (posting) return;

      try {
        const res = await fetch(
          `/api/property-reels/${reelId}/comments?take=100&sort=${sort}`,
          { cache: "no-store", credentials: "include" },
        );
        if (!res.ok) return;

        const json = (await res.json()) as CommentsResponse;
        if (cancelled || !json.data) return;

        cacheStore.set(cacheKey(reelId, sort), {
          comments: json.data.comments,
          commentCount: json.data.commentCount,
          fetchedAt: Date.now(),
        });
        setComments(json.data.comments);
        onCommentAdded(json.data.commentCount);
      } catch {
        // Pusher is primary when configured; polling failures should not block use.
      }
    };

    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, REALTIME_FALLBACK_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [onCommentAdded, open, posting, reelId, sort]);

  useLayoutEffect(() => {
    if (!open || !replyTo) return;
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [comments.length, open, replyTo]);

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
  }, [open, replyTo]);

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

  const startReply = useCallback((comment: ApiComment, parentId: string) => {
    setReplyTo({ id: parentId, author: comment.author });
    setError(null);
    inputRef.current?.focus();
  }, []);

  const toggleReplies = useCallback((commentId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const message = draft.trim();
      if (!message || message.length > MAX_LENGTH || posting) return;

      const tempId = `temp-${Date.now()}`;
      const clientEventId = `comment-sheet-${Date.now()}-${++clientEventIdRef.current}`;
      const optimistic: SheetComment = {
        id: tempId,
        parentId: replyTo?.id ?? null,
        author: isAgent ? "Official Agent" : isAuthenticated ? "You" : "Guest",
        message,
        createdAt: new Date().toISOString(),
        pending: true,
        isMember: isAuthenticated,
        isAgent,
        agentBadge: isAgent ? "Official Agent" : null,
        isPinned: false,
        likeCount: 0,
        replies: [],
      };

      const parentId = replyTo?.id ?? null;
      setComments((prev) =>
        parentId
          ? appendReply(prev, parentId, optimistic)
          : [optimistic, ...prev],
      );
      if (parentId) {
        setCollapsed((prev) => {
          const next = new Set(prev);
          next.delete(parentId);
          return next;
        });
      }
      setDraft("");
      setError(null);
      setPosting(true);
      pendingClientEventIdsRef.current.add(clientEventId);

      try {
        const endpoint = parentId
          ? `/api/property-reels/${reelId}/comments/${parentId}/replies`
          : `/api/property-reels/${reelId}/comments`;
        const res = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientEventId, message, parentId }),
        });
        const json = (await res.json().catch(() => ({}))) as PostResponse;

        if (!res.ok || !json.data) {
          setError(
            json.error?.message ?? "Could not post comment. Please try again.",
          );
          setComments((prev) => removeComment(prev, tempId));
          setDraft(message);
          return;
        }

        setComments((prev) => {
          const next = replaceComment(prev, tempId, {
            ...json.data!.comment,
            pending: false,
          });
          persistCache(next, json.data!.commentCount);
          return next;
        });
        setReplyTo(null);
        onCommentAdded(json.data.commentCount);
      } catch {
        setComments((prev) => removeComment(prev, tempId));
        setDraft(message);
        setError("Network error. Please try again.");
      } finally {
        pendingClientEventIdsRef.current.delete(clientEventId);
        setPosting(false);
      }
    },
    [
      draft,
      isAgent,
      isAuthenticated,
      onCommentAdded,
      persistCache,
      posting,
      reelId,
      replyTo,
    ],
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
          "absolute inset-0 bg-black/45 transition-opacity duration-300",
          open && !closing ? "pointer-events-auto opacity-100" : "opacity-0",
        )}
        onClick={triggerClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        className={cn(
          "absolute inset-x-0 bottom-0 mx-auto flex h-[78vh] max-h-[78vh] max-w-[480px] flex-col rounded-t-3xl border-t border-[#d6b15f]/20 bg-[#080706]/98 text-white shadow-[0_-22px_60px_rgba(0,0,0,0.75)] will-change-transform pointer-events-auto",
          dragOffset === 0 &&
            "transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
        style={{ transform: `translate3d(0, ${translate}, 0)` }}
      >
        <div className="flex select-none items-center justify-between border-b border-white/8 px-5 py-2">
          <div
            className="flex flex-1 flex-col items-center touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <span className="mb-2 h-1 w-10 rounded-full bg-white/25" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/85">
              Comments
            </h2>
          </div>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              triggerClose();
            }}
            aria-label="Close comments"
            className="ml-2 inline-flex size-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
          <SortButton
            active={sort === "newest"}
            onClick={() => setSort("newest")}
          >
            Newest
          </SortButton>
          <SortButton
            active={sort === "mostLiked"}
            onClick={() => setSort("mostLiked")}
          >
            Most liked
          </SortButton>
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
            <ul className="space-y-5">
              {comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  collapsed={collapsed.has(comment.id)}
                  onReply={startReply}
                  onToggleReplies={toggleReplies}
                />
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
          className="border-t border-[#d6b15f]/15 bg-[#080706]/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3"
        >
          {replyTo ? (
            <div className="mb-2 flex items-center justify-between rounded-md border border-[#d6b15f]/20 bg-[#d6b15f]/10 px-3 py-2 text-xs text-[#f0cf79]">
              <span className="truncate">Replying to {replyTo.author}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="ml-3 text-white/60 transition hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder={replyTo ? "Add a reply..." : "Add a comment..."}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_LENGTH}
              autoComplete="off"
              className="h-11 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white placeholder-white/40 focus:border-[#d6b15f]/60 focus:outline-none"
              aria-label={replyTo ? "Write a reply" : "Write a comment"}
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label={replyTo ? "Post reply" : "Post comment"}
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

function SortButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3 text-xs font-semibold transition",
        active
          ? "bg-[#d6b15f] text-black"
          : "border border-white/10 bg-white/[0.04] text-white/60 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function CommentThread({
  comment,
  collapsed,
  onReply,
  onToggleReplies,
}: {
  comment: SheetComment;
  collapsed: boolean;
  onReply: (comment: ApiComment, parentId: string) => void;
  onToggleReplies: (commentId: string) => void;
}) {
  const replies = comment.replies ?? [];

  return (
    <li>
      <CommentRow
        comment={comment}
        onReply={() => onReply(comment, comment.id)}
      />

      {replies.length > 0 ? (
        <div className="ml-6 mt-3 border-l border-[#d6b15f]/20 pl-4">
          <button
            type="button"
            onClick={() => onToggleReplies(comment.id)}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#d6b15f] transition hover:text-[#f0cf79]"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                collapsed && "-rotate-90",
              )}
            />
            {collapsed
              ? `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`
              : "Hide replies"}
          </button>
          <div
            className={cn(
              "space-y-3 overflow-hidden transition-all duration-300 ease-out",
              collapsed ? "max-h-0 opacity-0" : "max-h-[720px] opacity-100",
            )}
          >
            {replies.map((reply) => (
              <CommentRow
                key={reply.id}
                comment={reply}
                compact
                onReply={() => onReply(reply, comment.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function CommentRow({
  comment,
  compact,
  onReply,
}: {
  comment: SheetComment;
  compact?: boolean;
  onReply: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 transition-all duration-200",
        comment.pending && "opacity-60",
      )}
    >
      <div
        className={cn(
          "flex flex-none items-center justify-center rounded-full text-sm font-semibold",
          compact ? "size-8" : "size-9",
          comment.isAgent
            ? "border border-[#d6b15f]/70 bg-[#d6b15f]/18 text-[#f0cf79]"
            : comment.isMember
              ? "border border-white/15 bg-white/8 text-white/90"
              : "bg-white/8 text-white/80",
        )}
      >
        {comment.author.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-white">{comment.author}</p>
          {comment.agentBadge ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#d6b15f]/35 bg-[#d6b15f]/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#f0cf79]">
              <BadgeCheck className="size-3" />
              {comment.agentBadge}
            </span>
          ) : comment.isMember ? (
            <span className="inline-block size-1.5 rounded-full bg-white/45" />
          ) : null}
          {comment.isPinned ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#d6b15f]">
              <Pin className="size-3" />
              Pinned
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 break-words text-sm leading-snug text-white/85">
          {comment.message}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          <span>{comment.pending ? "Sending..." : formatRelative(comment.createdAt)}</span>
          <button
            type="button"
            onClick={onReply}
            className="inline-flex items-center gap-1 text-white/45 transition hover:text-[#f0cf79]"
          >
            <Reply className="size-3" />
            Reply
          </button>
          {comment.likeCount ? <span>{comment.likeCount} likes</span> : null}
        </div>
      </div>
    </div>
  );
}

function CommentsSkeleton() {
  return (
    <ul className="space-y-5 animate-pulse">
      {Array.from({ length: 5 }).map((_, idx) => (
        <li key={idx} className="flex items-start gap-3">
          <div className="size-9 flex-none rounded-full bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-3 w-3/4 rounded bg-white/10" />
            <div className="h-2 w-20 rounded bg-white/10" />
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
