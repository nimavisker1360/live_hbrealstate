"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PresenceChannel } from "pusher-js";
import {
  BadgeDollarSign,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  MapPin,
  MessageCircle,
  Radio,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createPusherClient } from "@/lib/pusher-client";
import {
  PUSHER_EVENTS,
  getLivePresenceChannel,
  type RealtimeCommentEvent,
  type RealtimeLikeEvent,
} from "@/lib/pusher-channels";
import { buildWhatsAppUrl, HB_LEAD_WHATSAPP } from "@/lib/hb-consultants";
import {
  LIVE_USER_UPDATED_EVENT,
  readStoredLiveUser,
  type SyncedLiveUser,
} from "@/lib/live-auth-client";
import { cn } from "@/lib/utils";
import type { LiveTour, Property } from "@/types/platform";
import { LiveActivityFeed } from "./LiveActivityFeed";
import { LiveMuxPlayerSurface } from "./LiveMuxPlayerSurface";

type LiveComment = {
  id: string;
  author: string;
  message: string;
  clientEventId?: string;
  createdAt?: string;
  expiresAt?: number;
  liveSessionId?: string;
  status?: "pending" | "failed";
};

type FloatingHeart = {
  id: number;
  x: number;
  y?: number;
  delay?: number;
};

type Activity = {
  id: string;
  type: "like" | "comment";
  author?: string;
  message?: string;
  timestamp: number;
  expiresAt: number;
};

type LeadIntent = "Citizenship" | "Investment" | "Living" | "Installment";

type LeadSource = "Get Details" | "Book Viewing";

type LiveActionModalState =
  | { type: "lead"; source: LeadSource }
  | { type: "offer" };

type ActiveModal =
  | LiveActionModalState
  | { type: "auth" }
  | null;

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

type LikeCountResponse = {
  count: number;
  retryAfterMs?: number;
};

type ClientAuthSession = {
  sub: string;
  name?: string;
  email?: string;
  phone?: string;
  role: "OWNER" | "AGENT" | "BUYER";
};

type AuthMeResponse = {
  session: ClientAuthSession | null;
};

type LiveViewer = ClientAuthSession | SyncedLiveUser;

type StreamStatus = "SCHEDULED" | "LIVE" | "ENDED";
type ShareStatus = "idle" | "sharing" | "shared" | "copied" | "failed";

type LiveStreamState = {
  playbackId?: string | null;
  provider?: string | null;
  startsAt?: string | null;
  status: StreamStatus;
};

type StreamStatusResponse = {
  id: string;
  playbackId: string | null;
  recordingPlaybackId: string | null;
  recordingStatus: string | null;
  roomId: string;
  startsAt: string | null;
  status: StreamStatus;
};

const VISITOR_ID_KEY = "hb-live-visitor-id";
const CALENDAR_WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
};

function getCalendarDays(monthDate: Date) {
  const firstDayOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const mondayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const firstVisibleDay = new Date(firstDayOfMonth);
  firstVisibleDay.setDate(firstDayOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index): CalendarDay => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);

    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function isSameCalendarDay(a: Date | null, b: Date) {
  return (
    Boolean(a) &&
    a?.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isPastCalendarDay(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidate = new Date(date);
  candidate.setHours(0, 0, 0, 0);

  return candidate < today;
}

function combineLocalDateAndTime(date: Date, time: string) {
  const [hours = "12", minutes = "00"] = time.split(":");
  const dateTime = new Date(date);
  dateTime.setHours(Number(hours), Number(minutes), 0, 0);

  return dateTime;
}

function formatBookingDisplay(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCalendarMonth(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatIsoDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

const LIKE_COOLDOWN_MS = 2_000;
const COMMENT_VISIBLE_MS = 5_000;

class ApiRequestError<T = unknown> extends Error {
  data?: T;
  status: number;

  constructor(message: string, status: number, data?: T) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
  }
}

function isLikeCountResponse(value: unknown): value is LikeCountResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof (value as LikeCountResponse).count === "number"
  );
}

async function getJson<T>(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiRequestError<T>(
      body.error?.message ?? "Request failed.",
      response.status,
      body.data,
    );
  }

  return body.data;
}

async function postJson<T>(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiRequestError<T>(
      body.error?.message ?? "Request failed.",
      response.status,
      body.data,
    );
  }

  return body.data;
}

function createVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `viewer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getLoginUrl() {
  if (typeof window === "undefined") {
    return "/api/auth/start?next=/live";
  }

  const loginUrl = new URL("/api/auth/start", window.location.origin);
  const nextPath = `${window.location.pathname}${window.location.search}`;

  loginUrl.searchParams.set("next", nextPath);

  return loginUrl.toString();
}

function getShareUrl(roomId: string) {
  if (typeof window === "undefined") {
    return `/live/${roomId}`;
  }

  return new URL(`/live/${roomId}`, window.location.origin).toString();
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");

  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand("copy");

    if (!copied) {
      throw new Error("Copy command failed.");
    }
  } finally {
    textarea.remove();
  }
}

function getSessionLabel(session: ClientAuthSession) {
  return session.name ?? session.email ?? session.phone ?? session.sub;
}

function getViewerLabel(viewer: LiveViewer) {
  return "auth0Id" in viewer ? viewer.name : getSessionLabel(viewer);
}

function getViewerTitle(viewer: LiveViewer | null) {
  if (!viewer) {
    return undefined;
  }

  return "auth0Id" in viewer
    ? (viewer.email ?? viewer.auth0Id)
    : (viewer.email ?? viewer.phone ?? viewer.sub);
}

function mergeComment(
  current: LiveComment[],
  incoming: LiveComment,
  clientEventId?: string,
) {
  const expiresAt = incoming.expiresAt ?? Date.now() + COMMENT_VISIBLE_MS;
  const nextComment = {
    ...incoming,
    clientEventId,
    expiresAt,
  };
  const existingIndex = current.findIndex(
    (item) =>
      item.id === incoming.id ||
      Boolean(clientEventId && item.clientEventId === clientEventId),
  );

  if (existingIndex === -1) {
    return [...current.slice(-99), nextComment];
  }

  return current.map((item, index) =>
    index === existingIndex
      ? {
          ...item,
          ...nextComment,
          status: undefined,
        }
      : item,
  );
}

export function LiveRoomScreen({
  databaseLiveSessionId,
  property,
  stream,
  tour,
}: {
  databaseLiveSessionId?: string;
  property?: Property;
  stream?: LiveStreamState;
  tour: LiveTour;
}) {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [comment, setComment] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [visitorId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    let storedVisitorId = window.localStorage.getItem(VISITOR_ID_KEY);

    if (!storedVisitorId) {
      storedVisitorId = createVisitorId();
      window.localStorage.setItem(VISITOR_ID_KEY, storedVisitorId);
    }

    return storedVisitorId;
  });
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewerCount, setViewerCount] = useState(tour.viewers);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [session, setSession] = useState<ClientAuthSession | null | undefined>(
    undefined,
  );
  const [syncedUser, setSyncedUser] = useState<
    SyncedLiveUser | null | undefined
  >(() => readStoredLiveUser());
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [commentsError, setCommentsError] = useState("");
  const [isLoadingLikes, setIsLoadingLikes] = useState(true);
  const [likeError, setLikeError] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isSavingLike, setIsSavingLike] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedLeadCount, setSavedLeadCount] = useState(0);
  const [savedOfferCount, setSavedOfferCount] = useState(0);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const lastLikeAtRef = useRef(0);
  const pendingLikeEventIdsRef = useRef(new Set<string>());
  const shareStatusTimeoutRef = useRef<number | null>(null);
  const [streamState, setStreamState] = useState<LiveStreamState>(() => ({
    playbackId: stream?.playbackId ?? null,
    provider: stream?.provider ?? null,
    startsAt: stream?.startsAt ?? null,
    status: stream?.status ?? (tour.status === "Live" ? "LIVE" : "SCHEDULED"),
  }));
  const streamStatus = streamState.status;
  const playbackId = streamState.playbackId ?? null;

  const setTemporaryShareStatus = useCallback((status: ShareStatus) => {
    setShareStatus(status);

    if (shareStatusTimeoutRef.current) {
      window.clearTimeout(shareStatusTimeoutRef.current);
    }

    shareStatusTimeoutRef.current = window.setTimeout(() => {
      setShareStatus("idle");
      shareStatusTimeoutRef.current = null;
    }, 2200);
  }, []);

  const spawnHeart = useCallback(() => {
    const baseId = Date.now() + Math.random();
    const x1 = Math.random() * 80 - 40;
    const x2 = Math.random() * 80 - 40;
    const y = Math.random() * 20 + 10;

    setHearts((current) => [
      ...current,
      { id: baseId, x: x1, y, delay: 0 },
      { id: baseId + 0.5, x: x2, y, delay: 50 },
    ]);

    window.setTimeout(() => {
      setHearts((current) =>
        current.filter((heart) => heart.id !== baseId && heart.id !== baseId + 0.5)
      );
    }, 1200);
  }, []);

  useEffect(() => {
    return () => {
      if (shareStatusTimeoutRef.current) {
        window.clearTimeout(shareStatusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const liveSessionId = databaseLiveSessionId ?? "";

    if (!liveSessionId) {
      return;
    }

    let ignore = false;

    async function syncStreamStatus() {
      try {
        const data = await getJson<StreamStatusResponse>(
          `/api/live-sessions/status?liveSessionId=${encodeURIComponent(
            liveSessionId,
          )}`,
        );

        if (!ignore && data) {
          const wasLive = streamState.status === "LIVE";
          const isNowEnded = data.status === "ENDED";

          setStreamState((current) => ({
            ...current,
            playbackId:
              data.status === "ENDED" && data.recordingPlaybackId
                ? data.recordingPlaybackId
                : data.playbackId,
            startsAt: data.startsAt,
            status: data.status,
          }));

          // Finalize session when it ends
          if (wasLive && isNowEnded) {
            try {
              await fetch(
                `/api/live-sessions/${encodeURIComponent(liveSessionId)}/finalize`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ viewers: viewerCount }),
                },
              );
            } catch (error) {
              console.error("Failed to finalize session:", error);
            }
          }
        }
      } catch {
        // Keep the current page state if Mux status sync is temporarily unavailable.
      }
    }

    void syncStreamStatus();
    const intervalId = window.setInterval(syncStreamStatus, 5_000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [databaseLiveSessionId, streamState.status, viewerCount]);

  useEffect(() => {
    function updateSyncedUser(event: Event) {
      const nextUser = (event as CustomEvent<SyncedLiveUser | null>).detail;

      setSyncedUser(nextUser);
    }

    window.addEventListener(LIVE_USER_UPDATED_EVENT, updateSyncedUser);

    return () => {
      window.removeEventListener(LIVE_USER_UPDATED_EVENT, updateSyncedUser);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const data = await getJson<AuthMeResponse>("/api/auth/me");

        if (!ignore) {
          setSession(data?.session ?? null);
        }
      } catch {
        if (!ignore) {
          setSession(null);
        }
      }
    }

    loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  const viewerUser = session ?? syncedUser ?? null;
  const isCheckingViewer = session === undefined && syncedUser === undefined;

  useEffect(() => {
    let ignore = false;

    async function loadComments() {
      if (!databaseLiveSessionId) {
        setCommentsError("Live session is not ready yet.");
        return;
      }

      setCommentsError("");

      try {
        await getJson<LiveComment[]>(
          `/api/comments?liveSessionId=${encodeURIComponent(databaseLiveSessionId)}`,
        );

        if (!ignore) {
          setComments([]);
        }
      } catch (error) {
        if (!ignore) {
          setCommentsError(
            error instanceof Error ? error.message : "Could not load comments.",
          );
        }
      }
    }

    loadComments();

    return () => {
      ignore = true;
    };
  }, [databaseLiveSessionId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now();

      setComments((current) =>
        current.filter(
          (item) => item.status === "pending" || (item.expiresAt ?? 0) > now,
        ),
      );
    }, 500);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadLikes() {
      if (!databaseLiveSessionId) {
        setLikeError("Live session is not ready yet.");
        setIsLoadingLikes(false);
        return;
      }

      setIsLoadingLikes(true);
      setLikeError("");

      try {
        const data = await getJson<LikeCountResponse>(
          `/api/likes?liveSessionId=${encodeURIComponent(databaseLiveSessionId)}`,
        );

        if (!ignore) {
          setLikeCount(data?.count ?? 0);
        }
      } catch (error) {
        if (!ignore) {
          setLikeError(
            error instanceof Error ? error.message : "Could not load likes.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoadingLikes(false);
        }
      }
    }

    loadLikes();

    return () => {
      ignore = true;
    };
  }, [databaseLiveSessionId]);

  useEffect(() => {
    if (!databaseLiveSessionId || !visitorId) {
      return;
    }

    const pusher = createPusherClient(visitorId);

    if (!pusher) {
      return;
    }

    const channelName = getLivePresenceChannel(databaseLiveSessionId);
    const channel = pusher.subscribe(channelName) as PresenceChannel;
    const syncViewerCount = () => {
      const memberCount = channel.members?.count;

      if (typeof memberCount === "number" && memberCount > 0) {
        setViewerCount(memberCount);
      }
    };

    channel.bind("pusher:subscription_succeeded", syncViewerCount);
    channel.bind("pusher:member_added", syncViewerCount);
    channel.bind("pusher:member_removed", syncViewerCount);
    channel.bind(PUSHER_EVENTS.COMMENT_CREATED, (event: RealtimeCommentEvent) => {
      setComments((current) =>
        mergeComment(
          current,
          {
            id: event.comment.id,
            author: event.comment.author,
            expiresAt: Date.now() + COMMENT_VISIBLE_MS,
            message: event.comment.message,
            createdAt: event.comment.createdAt,
            liveSessionId: event.comment.liveSessionId,
          },
          event.clientEventId,
        ),
      );

      const isOwnComment = event.clientEventId;
      if (!isOwnComment) {
        const now = Date.now();
        setActivities((current) => [
          ...current.slice(-9),
          {
            id: event.comment.id,
            type: "comment" as const,
            author: event.comment.author,
            message: event.comment.message,
            timestamp: now,
            expiresAt: now + 5000,
          },
        ]);
      }
    });
    channel.bind(PUSHER_EVENTS.LIKE_CREATED, (event: RealtimeLikeEvent) => {
      setLikeCount(event.count);

      const isOwnLike = event.clientEventId && pendingLikeEventIdsRef.current.has(event.clientEventId);

      if (isOwnLike && event.clientEventId) {
        pendingLikeEventIdsRef.current.delete(event.clientEventId);
      } else {
        spawnHeart();
        spawnHeart();

        const now = Date.now();
        setActivities((current) => [
          ...current.slice(-9),
          {
            id: `like-${now}-${Math.random()}`,
            type: "like" as const,
            author: event.userName ?? "Someone",
            timestamp: now,
            expiresAt: now + 4000,
          },
        ]);
      }
    });

    return () => {
      channel.unbind();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [databaseLiveSessionId, spawnHeart, visitorId]);

  async function addHeart() {
    if (isCheckingViewer || isSavingLike) {
      return;
    }

    if (!viewerUser) {
      setActiveModal({ type: "auth" });
      return;
    }

    if (!databaseLiveSessionId) {
      setLikeError("Live session is not ready yet.");
      return;
    }

    const now = Date.now();

    if (now - lastLikeAtRef.current < LIKE_COOLDOWN_MS) {
      setLikeError("Please wait before liking again.");
      return;
    }

    const clientEventId = createVisitorId();
    lastLikeAtRef.current = now;
    pendingLikeEventIdsRef.current.add(clientEventId);
    setLiked(true);
    setLikeCount((count) => count + 1);
    setLikeError("");
    spawnHeart();

    setIsSavingLike(true);

    try {
      const data = await postJson<LikeCountResponse>("/api/likes", {
        clientEventId,
        liveSessionId: databaseLiveSessionId,
        visitorId,
      });

      if (typeof data?.count === "number") {
        setLikeCount(data.count);
      }
    } catch (error) {
      pendingLikeEventIdsRef.current.delete(clientEventId);
      setLikeCount((count) => Math.max(0, count - 1));

      if (error instanceof ApiRequestError) {
        if (isLikeCountResponse(error.data)) {
          setLikeCount(error.data.count);
        }

        if (error.status === 401) {
          setActiveModal({ type: "auth" });
          setLikeError("");
          return;
        }

        if (error.status === 429) {
          setLikeError("Please wait before liking again.");
          return;
        }
      }

      setLikeError(
        error instanceof Error ? error.message : "Could not save like.",
      );
    } finally {
      setIsSavingLike(false);
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = comment.trim();

    if (!trimmed) {
      return;
    }

    if (!databaseLiveSessionId) {
      setCommentsError("Live session is not ready yet.");
      return;
    }

    const optimisticId = createVisitorId();
    setComment("");
    setCommentsError("");
    setIsSavingComment(true);
    setComments((current) => [
      ...current.slice(-99),
      {
        id: optimisticId,
        author: "You",
        clientEventId: optimisticId,
        expiresAt: Date.now() + COMMENT_VISIBLE_MS,
        message: trimmed,
        status: "pending",
      },
    ]);

    try {
      const savedComment = await postJson<LiveComment>("/api/comments", {
        author: "You",
        clientEventId: optimisticId,
        liveSessionId: databaseLiveSessionId,
        message: trimmed,
        propertyId: property?.id,
        propertyTitle: property?.title ?? tour.title,
        propertyLocation: property?.location ?? tour.location,
      });

      setComments((current) =>
        current.map((item) =>
          item.id === optimisticId || item.clientEventId === optimisticId
            ? {
                id: savedComment?.id ?? optimisticId,
                author: savedComment?.author ?? "You",
                clientEventId: optimisticId,
                createdAt: savedComment?.createdAt,
                expiresAt: Date.now() + COMMENT_VISIBLE_MS,
                liveSessionId: savedComment?.liveSessionId,
                message: savedComment?.message ?? trimmed,
              }
            : item,
        ),
      );
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : "Could not save comment.",
      );
      setComments((current) =>
        current.map((item) =>
          item.id === optimisticId || item.clientEventId === optimisticId
            ? { ...item, status: "failed" }
            : item,
        ),
      );
    } finally {
      setIsSavingComment(false);
    }
  }

  function openLeadModal(source: LeadSource) {
    setSuccessMessage("");
    setErrorMessage("");
    setActiveModal({ type: "lead", source });
  }

  function openOfferModal() {
    setSuccessMessage("");
    setErrorMessage("");
    setActiveModal({ type: "offer" });
  }

  function closeModal() {
    setActiveModal(null);
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function shareLiveRoom() {
    if (shareStatus === "sharing") {
      return;
    }

    const propertyTitle = property?.title ?? tour.title;
    const propertyLocation = property?.location ?? tour.location;
    const shareUrl = getShareUrl(tour.roomId);
    const shareData = {
      title: `${propertyTitle} | HB Live`,
      text: `Watch ${propertyTitle} in ${propertyLocation} on HB Live.`,
      url: shareUrl,
    };

    setShareStatus("sharing");

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setTemporaryShareStatus("shared");
        return;
      }

      await copyTextToClipboard(shareUrl);
      setTemporaryShareStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareStatus("idle");
        return;
      }

      try {
        await copyTextToClipboard(shareUrl);
        setTemporaryShareStatus("copied");
      } catch {
        setTemporaryShareStatus("failed");
      }
    }
  }

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const viewingAtValue = String(formData.get("viewingAt") ?? "");
    const leadSource =
      activeModal?.type === "lead" ? activeModal.source : "Get Details";

    if (leadSource === "Book Viewing" && !viewingAtValue) {
      setErrorMessage("Please select a viewing date and time.");
      setSuccessMessage("");
      return;
    }

    const viewingAt = viewingAtValue
      ? new Date(viewingAtValue).toISOString()
      : undefined;
    const payload = {
      source: leadSource,
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("whatsapp") ?? ""),
      budget: String(formData.get("budget") ?? ""),
      viewingAt,
      interestedIn: formData.getAll("interestedIn") as LeadIntent[],
      message: String(formData.get("message") ?? ""),
      roomId: tour.roomId,
      propertyId: property?.id,
      propertyTitle: property?.title ?? tour.title,
      propertyLocation: property?.location ?? tour.location,
      agentId: tour.agentId,
      agentName: tour.agent,
    };

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await postJson("/api/email/send", payload);
      setSavedLeadCount((count) => count + 1);
      form.reset();
      setSuccessMessage(
        "Thanks, your request has been received. The HB team will contact you shortly.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save lead.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitOffer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      buyerName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("whatsapp") ?? ""),
      offerAmount: String(formData.get("offerAmount") ?? ""),
      currency: String(formData.get("currency") ?? "USD") as
        | "USD"
        | "EUR"
        | "TRY",
      message: String(formData.get("message") ?? ""),
      roomId: tour.roomId,
      propertyId: property?.id,
      propertyTitle: property?.title ?? tour.title,
      propertyLocation: property?.location ?? tour.location,
      agentId: tour.agentId,
      agentName: tour.agent,
    };

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await postJson("/api/offers", payload);
      setSavedOfferCount((count) => count + 1);
      form.reset();
      setSuccessMessage(
        "Thanks, your offer has been received. An agent will review it shortly.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save offer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const advisorWhatsAppUrl = buildWhatsAppUrl({
    text: `Hello ${tour.agent}, I am interested in ${property?.title ?? tour.title} (${property?.location ?? tour.location}). Please send details.`,
    whatsapp: tour.agentWhatsapp ?? HB_LEAD_WHATSAPP,
  });

  return (
    <div className="min-h-svh overflow-hidden bg-black text-white">
      <div className="mx-auto min-h-svh max-w-[520px] bg-black lg:max-w-none">
        <section className="relative min-h-svh lg:mx-auto lg:max-w-[520px] lg:overflow-hidden lg:border-x lg:border-white/10">
          <LiveMuxPlayerSurface
            image={tour.image}
            key={`${playbackId ?? "no-playback"}-${streamStatus}`}
            playbackId={playbackId}
            startsAt={streamState.startsAt ?? null}
            status={streamStatus}
            title={tour.title}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/88" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />

          <TopOverlay
            hasPlaybackId={Boolean(playbackId)}
            isCheckingViewer={isCheckingViewer}
            streamStatus={streamStatus}
            tour={tour}
            viewer={viewerUser}
            viewerCount={viewerCount}
          />
          <PropertyOverlay property={property} tour={tour} />
          <LiveActivityFeed activities={activities} />
          <RightRail
            disableLike={isCheckingViewer || isSavingLike}
            likeCount={likeCount}
            likeError={likeError}
            likesLoading={isLoadingLikes}
            liked={liked}
            onLike={addHeart}
            onMakeOffer={openOfferModal}
            onShare={shareLiveRoom}
            shareStatus={shareStatus}
          />
          <HeartLayer hearts={hearts} />
          <BottomOverlay
            comment={comment}
            commentsError={commentsError}
            comments={comments}
            databaseLiveSessionId={databaseLiveSessionId}
            isSavingComment={isSavingComment}
            onCommentChange={setComment}
            onOpenLead={openLeadModal}
            onSubmit={submitComment}
            whatsappUrl={advisorWhatsAppUrl}
          />
          {activeModal?.type === "auth" ? (
            <AuthModal
              onClose={closeModal}
              onLogin={() => window.location.assign(getLoginUrl())}
            />
          ) : null}
          {activeModal && activeModal.type !== "auth" ? (
            <LiveActionModal
              errorMessage={errorMessage}
              isSubmitting={isSubmitting}
              leadCount={savedLeadCount}
              modal={activeModal}
              offerCount={savedOfferCount}
              onClose={closeModal}
              onSubmitLead={submitLead}
              onSubmitOffer={submitOffer}
              successMessage={successMessage}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function TopOverlay({
  hasPlaybackId,
  isCheckingViewer,
  streamStatus,
  tour,
  viewer,
  viewerCount,
}: {
  hasPlaybackId: boolean;
  isCheckingViewer: boolean;
  streamStatus: StreamStatus;
  tour: LiveTour;
  viewer: LiveViewer | null;
  viewerCount: number;
}) {
  const viewerLabel = isCheckingViewer
    ? "Checking account..."
    : viewer
      ? getViewerLabel(viewer)
      : "Guest viewer";
  const isPlayableLive = streamStatus === "LIVE" && hasPlaybackId;
  const streamLabel = isPlayableLive
    ? "Live"
    : streamStatus === "ENDED"
      ? "Ended"
      : hasPlaybackId
        ? "Offline"
        : "Scheduled";

  return (
    <div className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between gap-3 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          aria-label="Back to live tours"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-white/15"
          href="/live"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {tour.agent}
          </p>
          <p className="truncate text-xs text-white/58">
            My consultant = {tour.agent}
          </p>
          <div
            className="mt-1 flex max-w-[220px] items-center gap-1.5 rounded-full bg-black/42 px-2 py-1 text-[11px] font-medium text-white/76 backdrop-blur-md"
            title={getViewerTitle(viewer)}
          >
            <User aria-hidden className="size-3.5 shrink-0 text-[#d6b15f]" />
            <span className="min-w-0 truncate">{viewerLabel}</span>
            {viewer && "role" in viewer ? (
              <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/62">
                {viewer.role}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(0,0,0,0.35)]",
            isPlayableLive
              ? "bg-red-600 shadow-[0_0_24px_rgba(220,38,38,0.45)]"
              : "bg-black/58 backdrop-blur-md",
          )}
        >
          {isPlayableLive ? (
            <span className="size-1.5 rounded-full bg-white" />
          ) : (
            <Radio aria-hidden className="size-3.5 text-[#d6b15f]" />
          )}
          {streamLabel}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
          <Users aria-hidden className="size-3.5 text-[#d6b15f]" />
          {viewerCount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function PropertyOverlay({
  property,
  tour,
}: {
  property?: Property;
  tour: LiveTour;
}) {
  return (
    <div className="absolute left-4 top-24 z-10 w-[min(260px,calc(100%-6rem))]">
      <div className="rounded-lg border border-white/12 bg-black/34 p-2.5 shadow-[0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <p className="line-clamp-1 text-sm font-semibold text-white">
          {property?.title ?? tour.title}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-white/68">
          <MapPin aria-hidden className="size-3.5 shrink-0 text-[#d6b15f]" />
          {property?.location ?? tour.location}
        </p>
        <p className="mt-2 text-lg font-bold leading-tight text-[#f0cf79]">
          {property?.price ?? tour.price}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d6b15f]/40 bg-[#d6b15f]/14 px-2 py-0.5 text-[10px] font-medium text-[#f0cf79]">
            <ShieldCheck aria-hidden className="size-3" />
            Citizenship eligible
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/82">
            <Sparkles aria-hidden className="size-3 text-[#d6b15f]" />
            Installment available
          </span>
        </div>
      </div>
    </div>
  );
}

function RightRail({
  disableLike,
  likeCount,
  likeError,
  likesLoading,
  liked,
  onLike,
  onMakeOffer,
  onShare,
  shareStatus,
}: {
  disableLike: boolean;
  likeCount: number;
  likeError: string;
  likesLoading: boolean;
  liked: boolean;
  onLike: () => void;
  onMakeOffer: () => void;
  onShare: () => void;
  shareStatus: ShareStatus;
}) {
  const shareLabel =
    shareStatus === "sharing"
      ? "..."
      : shareStatus === "shared"
        ? "Shared"
        : shareStatus === "copied"
          ? "Copied"
          : shareStatus === "failed"
            ? "Retry"
            : "Share";

  return (
    <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-4">
      <FloatingAction
        active={liked}
        icon={
          <Heart
            aria-hidden
            className="size-6"
            fill={liked ? "currentColor" : "none"}
          />
        }
        disabled={disableLike}
        label={likesLoading ? "..." : likeCount.toLocaleString()}
        onClick={onLike}
      />
      {likeError ? (
        <p className="w-20 text-center text-[11px] leading-4 text-red-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          Like error
        </p>
      ) : null}
      <FloatingAction
        disabled={shareStatus === "sharing"}
        icon={
          shareStatus === "shared" || shareStatus === "copied" ? (
            <Check aria-hidden className="size-6" />
          ) : (
            <Share2 aria-hidden className="size-6" />
          )
        }
        label={shareLabel}
        onClick={onShare}
      />
      <FloatingAction
        featured
        icon={<BadgeDollarSign aria-hidden className="size-6" />}
        label="Offer"
        onClick={onMakeOffer}
      />
    </div>
  );
}

function FloatingAction({
  active,
  disabled,
  featured,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  featured?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className="group flex w-16 flex-col items-center gap-1 text-center text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full border border-white/14 bg-black/45 text-white shadow-[0_14px_38px_rgba(0,0,0,0.38)] backdrop-blur-md transition group-hover:scale-105",
          active && "border-red-400 bg-red-500 text-white",
          featured && "border-[#d6b15f]/60 bg-[#d6b15f] text-black",
        )}
      >
        {icon}
      </span>
      <span className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
        {label}
      </span>
    </button>
  );
}

function HeartLayer({ hearts }: { hearts: FloatingHeart[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {hearts.map((heart) => (
        <Heart
          aria-hidden
          className="absolute size-14 text-red-500 drop-shadow-[0_0_20px_rgba(239,63,86,0.6)]"
          fill="currentColor"
          key={heart.id}
          style={
            {
              "--heart-x": `${heart.x}px`,
              "--heart-y": `${heart.y ?? 50}%`,
              left: "50%",
              top: "var(--heart-y)",
              animation: `float-heart 1200ms ease-out forwards`,
              animationDelay: `${heart.delay ?? 0}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function BottomOverlay({
  comment,
  commentsError,
  comments,
  isSavingComment,
  onCommentChange,
  onOpenLead,
  onSubmit,
  databaseLiveSessionId,
  whatsappUrl,
}: {
  comment: string;
  commentsError: string;
  comments: LiveComment[];
  isSavingComment: boolean;
  onCommentChange: (value: string) => void;
  onOpenLead: (source: LeadSource) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  databaseLiveSessionId?: string;
  whatsappUrl: string;
}) {
  function handleWhatsAppClick() {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    if (!databaseLiveSessionId) return;

    fetch(
      `/api/live-sessions/${encodeURIComponent(databaseLiveSessionId)}/click`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "whatsapp" }),
      },
    ).catch((error) => {
      console.error("Failed to track WhatsApp click:", error);
    });
  }
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/82 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-24">
      <div className="pointer-events-none mb-4 flex max-h-40 flex-col-reverse gap-2 overflow-hidden pr-16">
        {comments.slice(-5).reverse().map((item) => (
          <div
            className={cn(
              "live-comment-toast w-fit max-w-[86%] rounded-2xl bg-black/38 px-3 py-2 text-sm leading-5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md",
              item.status === "pending" && "opacity-70",
              item.status === "failed" && "border border-red-400/35",
            )}
            key={item.id}
          >
            <span className="font-semibold text-[#f0cf79]">{item.author}</span>{" "}
            <span className="text-white/88">{item.message}</span>
            {item.status === "pending" ? (
              <span className="text-white/42"> sending...</span>
            ) : null}
            {item.status === "failed" ? (
              <span className="text-red-100"> not saved</span>
            ) : null}
          </div>
        ))}
      </div>
      {commentsError ? (
        <div className="mb-3 rounded-lg border border-red-400/35 bg-red-500/12 px-3 py-2 text-xs text-red-100">
          {commentsError}
        </div>
      ) : null}

      <form className="flex items-center gap-2" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="live-comment">
          Add a comment
        </label>
        <div className="flex h-12 flex-1 items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 backdrop-blur-md">
          <MessageCircle aria-hidden className="size-5 shrink-0 text-white/62" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
            id="live-comment"
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="Ask about this property..."
            value={comment}
          />
        </div>
        <button
          aria-label="Send comment"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#d6b15f] text-black transition hover:bg-[#f0cf79] disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-2 focus:ring-[#d6b15f] focus:ring-offset-2 focus:ring-offset-black"
          disabled={isSavingComment}
          type="submit"
        >
          <Send aria-hidden className="size-5" />
        </button>
      </form>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button
          className="h-11 px-2 text-xs sm:text-sm"
          onClick={handleWhatsAppClick}
          variant="secondary"
        >
          <MessageCircle aria-hidden className="size-4" />
          WhatsApp
        </Button>
        <Button
          className="h-11 px-2 text-xs sm:text-sm"
          onClick={() => onOpenLead("Book Viewing")}
        >
          <CalendarCheck aria-hidden className="size-4" />
          Book
        </Button>
        <Button
          className="h-11 px-2 text-xs sm:text-sm"
          onClick={() => onOpenLead("Get Details")}
          variant="secondary"
        >
          <FileText aria-hidden className="size-4" />
          Details
        </Button>
      </div>
    </div>
  );
}

function AuthModal({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: () => void;
}) {
  return (
    <div
      aria-modal="true"
      className="absolute inset-0 z-50 flex items-end bg-black/68 px-3 pb-3 backdrop-blur-sm sm:items-center sm:px-5 sm:pb-5"
      role="dialog"
    >
      <button
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="relative w-full rounded-t-2xl border border-white/12 bg-[#080808] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
              HB Live
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Sign in required
            </h2>
            <p className="mt-1 text-sm text-white/58">
              Sign in to like this live room.
            </p>
          </div>
          <button
            aria-label="Close"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/12"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <Button className="w-full" onClick={onLogin} type="button">
          Sign in
        </Button>
      </div>
    </div>
  );
}

function LiveActionModal({
  errorMessage,
  isSubmitting,
  leadCount,
  modal,
  offerCount,
  onClose,
  onSubmitLead,
  onSubmitOffer,
  successMessage,
}: {
  errorMessage: string;
  isSubmitting: boolean;
  leadCount: number;
  modal: LiveActionModalState;
  offerCount: number;
  onClose: () => void;
  onSubmitLead: (event: React.FormEvent<HTMLFormElement>) => void;
  onSubmitOffer: (event: React.FormEvent<HTMLFormElement>) => void;
  successMessage: string;
}) {
  const isOffer = modal.type === "offer";
  const title = isOffer ? "Make an offer" : modal.source;
  const subtitle = isOffer
    ? "Submit a private offer for agent review."
    : "Share your details and buying intent.";

  return (
    <div
      className="absolute inset-0 z-50 flex items-end bg-black/68 px-3 pb-3 backdrop-blur-sm sm:items-center sm:px-5 sm:pb-5"
      role="dialog"
      aria-modal="true"
    >
      <button
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="relative max-h-[88svh] w-full overflow-y-auto rounded-t-2xl border border-white/12 bg-[#080808] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
              HB Live
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-white/58">{subtitle}</p>
          </div>
          <button
            aria-label="Close"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/12"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        {successMessage ? (
          <div className="mb-4 rounded-lg border border-[#d6b15f]/40 bg-[#d6b15f]/12 p-3 text-sm text-[#f0cf79]">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-red-400/35 bg-red-500/12 p-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {isOffer ? (
          <OfferForm isSubmitting={isSubmitting} onSubmit={onSubmitOffer} />
        ) : (
          <LeadForm
            isSubmitting={isSubmitting}
            key={`${modal.source}-${leadCount}`}
            source={modal.source}
            onSubmit={onSubmitLead}
          />
        )}

        <p className="mt-4 text-center text-xs text-white/42">
          Saved to database this session: {leadCount} leads, {offerCount}{" "}
          offers.
        </p>
      </div>
    </div>
  );
}

function LeadForm({
  isSubmitting,
  onSubmit,
  source,
}: {
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  source: LeadSource;
}) {
  const isBooking = source === "Book Viewing";

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Full name" name="fullName" required />
        <FormField
          inputMode="tel"
          label="WhatsApp number"
          name="whatsapp"
          placeholder="+90 555 000 0000"
          required
        />
      </div>
      <FormField
        label="Budget"
        name="budget"
        placeholder="$500,000 - $1,000,000"
        required
      />
      {isBooking ? (
        <BookingDateTimeField name="viewingAt" />
      ) : null}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-white/78">
          Interested in
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(["Citizenship", "Investment", "Living", "Installment"] as const).map(
            (interest) => (
              <label
                className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white/76"
                key={interest}
              >
                <input
                  className="size-4 accent-[#d6b15f]"
                  name="interestedIn"
                  type="checkbox"
                  value={interest}
                />
                {interest}
              </label>
            ),
          )}
        </div>
      </fieldset>
      <FormTextarea
        label="Message"
        name="message"
        placeholder={`I want to ${source.toLowerCase()} for this property.`}
      />
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving lead..." : "Submit lead"}
      </Button>
    </form>
  );
}

function OfferForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Full name" name="fullName" required />
        <FormField
          inputMode="tel"
          label="WhatsApp number"
          name="whatsapp"
          placeholder="+90 555 000 0000"
          required
        />
      </div>
      <div className="grid grid-cols-[1fr_112px] gap-3">
        <FormField
          inputMode="decimal"
          label="Offer amount"
          name="offerAmount"
          placeholder="4850000"
          required
        />
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/78">
            Currency
          </span>
          <select
            className="h-12 w-full rounded-md border border-white/10 bg-black px-3 text-sm text-white outline-none transition focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/20"
            defaultValue="USD"
            name="currency"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="TRY">TRY</option>
          </select>
        </label>
      </div>
      <FormTextarea
        label="Message"
        name="message"
        placeholder="Share terms, timing, or any conditions for the offer."
      />
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving offer..." : "Submit offer"}
      </Button>
    </form>
  );
}

function BookingDateTimeField({ name }: { name: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [committedValue, setCommittedValue] = useState("");
  const [minimumBookingTime, setMinimumBookingTime] = useState(0);
  const calendarDays = getCalendarDays(visibleMonth);
  const selectedDateTime = selectedDate
    ? combineLocalDateAndTime(selectedDate, selectedTime)
    : null;
  const isSelectedInPast =
    selectedDateTime !== null &&
    minimumBookingTime > 0 &&
    selectedDateTime.getTime() < minimumBookingTime;
  const displayValue = formatBookingDisplay(committedValue);

  function commitSelection() {
    if (!selectedDate) {
      return;
    }

    const nextValue = combineLocalDateAndTime(selectedDate, selectedTime);

    if (nextValue.getTime() < Date.now()) {
      setMinimumBookingTime(Date.now());
      return;
    }

    setCommittedValue(nextValue.toISOString());
    setIsOpen(false);
  }

  function openCalendar() {
    setMinimumBookingTime(Date.now());
    setIsOpen(true);
  }

  function moveMonth(direction: -1 | 1) {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-white/78">
        Viewing date and time
      </span>
      <input name={name} readOnly type="hidden" value={committedValue} />
      <button
        className="flex h-12 w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-3 text-left text-sm text-white outline-none transition hover:border-[#d6b15f]/70 focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/20"
        onClick={openCalendar}
        type="button"
      >
        <span className={displayValue ? "text-white" : "text-white/32"}>
          {displayValue || "Select viewing date and time"}
        </span>
        <CalendarCheck aria-hidden className="size-4 text-[#d6b15f]" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/62 px-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <button
            aria-label="Close calendar"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="relative w-full max-w-[550px] rounded-[4px] bg-white p-5 text-[#151515] shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-6">
            <div className="mb-7 flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold">Ziyaret Tarihi Seçin</h3>
              <button
                aria-label="Close calendar"
                className="flex size-9 items-center justify-center rounded-full text-[#5f6670] transition hover:bg-black/5"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            <div className="mx-auto max-w-[360px]">
              <div className="mb-5 flex items-center justify-between">
                <button
                  aria-label="Previous month"
                  className="flex size-9 items-center justify-center rounded-full text-[#8b949e] transition hover:bg-black/5"
                  onClick={() => moveMonth(-1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden className="size-5" />
                </button>
                <p className="text-lg font-semibold">{formatCalendarMonth(visibleMonth)}</p>
                <button
                  aria-label="Next month"
                  className="flex size-9 items-center justify-center rounded-full text-[#151515] transition hover:bg-black/5"
                  onClick={() => moveMonth(1)}
                  type="button"
                >
                  <ChevronRight aria-hidden className="size-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-y-3 text-center">
                {CALENDAR_WEEKDAYS.map((weekday) => (
                  <div className="text-base font-medium text-[#89929c]" key={weekday}>
                    {weekday}
                  </div>
                ))}
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isPast = isPastCalendarDay(date);
                  const isSelected = isSameCalendarDay(selectedDate, date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <button
                      className={cn(
                        "mx-auto flex size-9 items-center justify-center rounded-full text-base transition",
                        isCurrentMonth ? "text-[#151515]" : "text-[#c6ccd2]",
                        isWeekend && isCurrentMonth ? "text-[#ff4d4f]" : "",
                        isPast ? "cursor-not-allowed text-[#c6ccd2]" : "hover:bg-[#eef1f4]",
                        isSelected ? "bg-[#d6b15f] font-semibold text-black hover:bg-[#d6b15f]" : "",
                      )}
                      disabled={isPast}
                      key={formatIsoDate(date)}
                      onClick={() => {
                        setSelectedDate(date);
                        if (!isCurrentMonth) {
                          setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                        }
                      }}
                      type="button"
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-semibold text-[#5f6670]">
                  Viewing time
                </span>
                <input
                  className="h-11 w-full rounded-md border border-[#dfe4ea] bg-white px-3 text-base text-[#151515] outline-none transition focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/25"
                  onChange={(event) => setSelectedTime(event.target.value)}
                  type="time"
                  value={selectedTime}
                />
              </label>

              <Button
                className="mt-5 w-full bg-[#d6b15f] text-black hover:bg-[#e0bd6a] disabled:bg-[#edf0f3] disabled:text-[#b8c0c8]"
                disabled={!selectedDate || isSelectedInPast}
                onClick={commitSelection}
                type="button"
              >
                Ziyareti Rezerve Et
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormField({
  inputMode,
  label,
  name,
  placeholder,
  required,
}: {
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/78">
        {label}
      </span>
      <input
        className="h-12 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/20"
        inputMode={inputMode}
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function FormTextarea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/78">
        {label}
      </span>
      <textarea
        className="min-h-24 w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/20"
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}
