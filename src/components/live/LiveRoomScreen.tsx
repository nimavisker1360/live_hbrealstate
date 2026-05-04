"use client";

import Hls from "hls.js";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PresenceChannel } from "pusher-js";
import {
  BadgeDollarSign,
  CalendarCheck,
  ChevronLeft,
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
  WifiOff,
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
import {
  LIVE_USER_UPDATED_EVENT,
  readStoredLiveUser,
  type SyncedLiveUser,
} from "@/lib/live-auth-client";
import { cn } from "@/lib/utils";
import type { LiveTour, Property } from "@/types/platform";

type LiveComment = {
  id: string;
  author: string;
  message: string;
  clientEventId?: string;
  createdAt?: string;
  liveSessionId?: string;
  status?: "pending" | "failed";
};

type FloatingHeart = {
  id: number;
  x: number;
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

type LiveStreamState = {
  playbackId?: string | null;
  provider?: string | null;
  startsAt?: string | null;
  status: StreamStatus;
};

type StreamStatusResponse = {
  id: string;
  playbackId: string | null;
  roomId: string;
  startsAt: string | null;
  status: StreamStatus;
};

const VISITOR_ID_KEY = "hb-live-visitor-id";
const LIKE_COOLDOWN_MS = 2_000;

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
  const nextComment = {
    ...incoming,
    clientEventId,
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
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isLoadingLikes, setIsLoadingLikes] = useState(true);
  const [likeError, setLikeError] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isSavingLike, setIsSavingLike] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedLeadCount, setSavedLeadCount] = useState(0);
  const [savedOfferCount, setSavedOfferCount] = useState(0);
  const lastLikeAtRef = useRef(0);
  const pendingLikeEventIdsRef = useRef(new Set<string>());
  const [streamState, setStreamState] = useState<LiveStreamState>(() => ({
    playbackId: stream?.playbackId ?? null,
    provider: stream?.provider ?? null,
    startsAt: stream?.startsAt ?? null,
    status: stream?.status ?? (tour.status === "Live" ? "LIVE" : "SCHEDULED"),
  }));
  const streamStatus = streamState.status;
  const playbackId = streamState.playbackId ?? null;

  const spawnHeart = useCallback(() => {
    const id = Date.now() + Math.random();
    setHearts((current) => [...current, { id, x: Math.random() * 52 - 26 }]);

    window.setTimeout(() => {
      setHearts((current) => current.filter((heart) => heart.id !== id));
    }, 950);
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
          setStreamState((current) => ({
            ...current,
            playbackId: data.playbackId,
            startsAt: data.startsAt,
            status: data.status,
          }));
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
  }, [databaseLiveSessionId]);

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
        setIsLoadingComments(false);
        return;
      }

      setIsLoadingComments(true);
      setCommentsError("");

      try {
        const data = await getJson<LiveComment[]>(
          `/api/comments?liveSessionId=${encodeURIComponent(databaseLiveSessionId)}`,
        );

        if (!ignore) {
          setComments(data ?? []);
        }
      } catch (error) {
        if (!ignore) {
          setCommentsError(
            error instanceof Error ? error.message : "Could not load comments.",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoadingComments(false);
        }
      }
    }

    loadComments();

    return () => {
      ignore = true;
    };
  }, [databaseLiveSessionId]);

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
            message: event.comment.message,
            createdAt: event.comment.createdAt,
            liveSessionId: event.comment.liveSessionId,
          },
          event.clientEventId,
        ),
      );
    });
    channel.bind(PUSHER_EVENTS.LIKE_CREATED, (event: RealtimeLikeEvent) => {
      setLikeCount(event.count);

      if (
        event.clientEventId &&
        pendingLikeEventIdsRef.current.has(event.clientEventId)
      ) {
        pendingLikeEventIdsRef.current.delete(event.clientEventId);
        return;
      }

      spawnHeart();
    });

    return () => {
      channel.unbind();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [databaseLiveSessionId, spawnHeart, visitorId]);

  async function addHeart() {
    if (session === undefined || isSavingLike) {
      return;
    }

    if (!session) {
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

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      source: activeModal?.type === "lead" ? activeModal.source : "Get Details",
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("whatsapp") ?? ""),
      budget: String(formData.get("budget") ?? ""),
      interestedIn: formData.getAll("interestedIn") as LeadIntent[],
      message: String(formData.get("message") ?? ""),
      roomId: tour.roomId,
      propertyId: property?.id,
      propertyTitle: property?.title ?? tour.title,
      propertyLocation: property?.location ?? tour.location,
      agentName: tour.agent,
    };

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await postJson("/api/leads", payload);
      setSavedLeadCount((count) => count + 1);
      form.reset();
      setSuccessMessage(
        "Lead saved to PostgreSQL. The HB team will follow up soon.",
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
        "Offer saved to PostgreSQL. An agent can review it next.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save offer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh overflow-hidden bg-black text-white">
      <div className="mx-auto min-h-svh max-w-[520px] bg-black lg:max-w-none">
        <section className="relative min-h-svh lg:mx-auto lg:max-w-[520px] lg:overflow-hidden lg:border-x lg:border-white/10">
          <LiveVideoSurface
            image={tour.image}
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
          <RightRail
            disableLike={session === undefined || isSavingLike}
            likeCount={likeCount}
            likeError={likeError}
            likesLoading={isLoadingLikes}
            liked={liked}
            onLike={addHeart}
            onMakeOffer={openOfferModal}
          />
          <HeartLayer hearts={hearts} />
          <BottomOverlay
            comment={comment}
            commentsError={commentsError}
            comments={comments}
            commentsLoading={isLoadingComments}
            isSavingComment={isSavingComment}
            onCommentChange={setComment}
            onOpenLead={openLeadModal}
            onSubmit={submitComment}
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

function getHlsUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

function getOfflineTitle(status: StreamStatus) {
  if (status === "ENDED") {
    return "Live session ended";
  }

  return "Stream offline";
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

function LiveVideoSurface({
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failedHlsUrl, setFailedHlsUrl] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const shouldPlay = status === "LIVE" && Boolean(playbackId);
  const hlsUrl = playbackId ? getHlsUrl(playbackId) : null;
  const playerError = Boolean(hlsUrl && failedHlsUrl === hlsUrl);
  const showOfflineState = !shouldPlay || playerError;

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !hlsUrl || !shouldPlay) {
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.load();
      void video.play().catch(() => undefined);

      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    if (!Hls.isSupported()) {
      const timeoutId = window.setTimeout(() => setFailedHlsUrl(hlsUrl), 0);

      return () => window.clearTimeout(timeoutId);
    }

    const hls = new Hls({
      liveDurationInfinity: true,
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        setFailedHlsUrl(hlsUrl);
      }
    });

    return () => {
      hls.destroy();
    };
  }, [hlsUrl, shouldPlay]);

  return (
    <div className="absolute inset-0 bg-black">
      <Image
        alt={title}
        className={cn(
          "object-cover transition-opacity duration-500",
          videoReady && !showOfflineState && "opacity-0",
        )}
        fill
        priority
        sizes="(min-width: 1024px) 520px, 100vw"
        src={image}
      />

      {shouldPlay && !playerError ? (
        <video
          aria-label={title}
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          key={hlsUrl}
          muted
          onError={() => setFailedHlsUrl(hlsUrl)}
          onPlaying={() => setVideoReady(true)}
          playsInline
          ref={videoRef}
        />
      ) : null}

      {showOfflineState ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-8 text-center">
          <div className="rounded-lg border border-white/12 bg-black/46 px-5 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl">
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-white/14 bg-white/10 text-[#f0cf79]">
              <WifiOff aria-hidden className="size-5" />
            </div>
            <p className="text-base font-semibold text-white">
              {getOfflineTitle(status)}
            </p>
            <p className="mt-1 max-w-56 text-sm leading-5 text-white/64">
              {getOfflineDetail(status, startsAt)}
            </p>
          </div>
        </div>
      ) : null}
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
          <p className="truncate text-xs text-white/58">HB Real Estate</p>
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
    <div className="absolute left-4 right-20 top-24 z-10 sm:right-24">
      <div className="rounded-lg border border-white/12 bg-black/38 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl">
        <p className="line-clamp-1 text-lg font-semibold text-white">
          {property?.title ?? tour.title}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
          <MapPin aria-hidden className="size-4 text-[#d6b15f]" />
          {property?.location ?? tour.location}
        </p>
        <p className="mt-3 text-2xl font-bold text-[#f0cf79]">
          {property?.price ?? tour.price}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d6b15f]/40 bg-[#d6b15f]/14 px-2.5 py-1 text-xs font-medium text-[#f0cf79]">
            <ShieldCheck aria-hidden className="size-3.5" />
            Citizenship eligible
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/82">
            <Sparkles aria-hidden className="size-3.5 text-[#d6b15f]" />
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
}: {
  disableLike: boolean;
  likeCount: number;
  likeError: string;
  likesLoading: boolean;
  liked: boolean;
  onLike: () => void;
  onMakeOffer: () => void;
}) {
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
        icon={<Share2 aria-hidden className="size-6" />}
        label="Share"
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
    <div className="pointer-events-none absolute bottom-48 right-8 z-30">
      {hearts.map((heart) => (
        <Heart
          aria-hidden
          className="absolute size-10 text-red-500"
          fill="currentColor"
          key={heart.id}
          style={
            {
              "--heart-x": `${heart.x}px`,
              animation: "float-heart 950ms ease-out forwards",
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
  commentsLoading,
  isSavingComment,
  onCommentChange,
  onOpenLead,
  onSubmit,
}: {
  comment: string;
  commentsError: string;
  comments: LiveComment[];
  commentsLoading: boolean;
  isSavingComment: boolean;
  onCommentChange: (value: string) => void;
  onOpenLead: (source: LeadSource) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/82 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-24">
      <div className="mb-4 max-h-40 space-y-2 overflow-hidden pr-16">
        {commentsLoading ? (
          <div className="w-fit rounded-2xl bg-black/38 px-3 py-2 text-sm text-white/58 backdrop-blur-md">
            Loading comments...
          </div>
        ) : null}
        {!commentsLoading && comments.length === 0 ? (
          <div className="w-fit rounded-2xl bg-black/38 px-3 py-2 text-sm text-white/58 backdrop-blur-md">
            No comments yet.
          </div>
        ) : null}
        {comments.slice(-5).map((item) => (
          <div
            className={cn(
              "w-fit max-w-[86%] rounded-2xl bg-black/38 px-3 py-2 text-sm leading-5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md",
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
        <Button className="h-11 px-2 text-xs sm:text-sm" variant="secondary">
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
