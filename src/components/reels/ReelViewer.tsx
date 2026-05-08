"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Heart, MapPin } from "lucide-react";
import Link from "next/link";
import { ReelVideoPlayer, type ReelVideoPlayerHandle } from "./ReelVideoPlayer";
import { ReelActionBar } from "./ReelActionBar";
import { ReelBottomCTA } from "./ReelBottomCTA";
import {
  InlineReelComments,
  type InlineReelCommentsHandle,
} from "./InlineReelComments";
import { CommentBottomSheet } from "./CommentBottomSheet";
import { OfferSheet } from "./OfferSheet";
import { BookingSheet } from "./BookingSheet";
import { DetailsSheet } from "./DetailsSheet";
import { buildWhatsAppUrl } from "@/lib/hb-consultants";
import { useReelLike } from "@/hooks/useReelLike";

export type ReelViewerData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  videoUrl: string;
  mimeType: string;
  poster: string;
  isProcessing: boolean;
  isAuthenticated: boolean;
  isAgent: boolean;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  property: {
    id: string;
    title: string;
    location: string;
    price: string;
  };
  agent: {
    id: string;
    name: string;
    displayName?: string;
    image?: string;
    phone?: string;
    whatsapp?: string;
    specialty?: string;
  };
};

type Sheet = "offer" | "booking" | "details" | null;

export function ReelViewer({ reel }: { reel: ReelViewerData }) {
  const playerRef = useRef<ReelVideoPlayerHandle | null>(null);
  const commentsRef = useRef<InlineReelCommentsHandle | null>(null);
  const [openSheet, setOpenSheet] = useState<Sheet>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(reel.commentCount);
  const {
    liked: hasLiked,
    count: likeCount,
    toggle: toggleLike,
    likeOnly,
  } = useReelLike({ reelId: reel.id, initialCount: reel.likeCount });
  const previousLikeCountRef = useRef(likeCount);
  const likeFloatIdRef = useRef(0);
  const [heartBursts, setHeartBursts] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const [likeFloatBursts, setLikeFloatBursts] = useState<
    Array<{ id: number; offset: number }>
  >([]);
  const burstIdRef = useRef(0);

  useEffect(() => {
    if (openSheet || commentsOpen) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
  }, [commentsOpen, openSheet]);

  const triggerHeartBurst = useCallback((x: number, y: number) => {
    const id = ++burstIdRef.current;
    setHeartBursts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setHeartBursts((prev) => prev.filter((b) => b.id !== id));
    }, 900);
  }, []);

  const triggerLikeFloat = useCallback((amount = 1) => {
    const bursts = Array.from({ length: amount }, (_, offset) => ({
      id: ++likeFloatIdRef.current,
      offset,
    }));

    setLikeFloatBursts((prev) => [...prev, ...bursts].slice(-6));
    bursts.forEach((burst) => {
      setTimeout(() => {
        setLikeFloatBursts((prev) =>
          prev.filter((item) => item.id !== burst.id),
        );
      }, 1150);
    });
  }, []);

  useEffect(() => {
    const previous = previousLikeCountRef.current;
    if (likeCount > previous) {
      triggerLikeFloat(Math.min(likeCount - previous, 3));
    }
    previousLikeCountRef.current = likeCount;
  }, [likeCount, triggerLikeFloat]);

  const handleDoubleTap = useCallback(
    (x: number, y: number) => {
      triggerHeartBurst(x, y);
      // Instagram: double-tap always likes (never unlikes).
      likeOnly();
    },
    [likeOnly, triggerHeartBurst],
  );

  const handleLikeClick = useCallback(() => {
    toggleLike();
  }, [toggleLike]);

  const handleCommentAdded = useCallback((newCount: number) => {
    setCommentCount(newCount);
  }, []);

  const handleCommentClick = useCallback(() => {
    setCommentsOpen(true);
  }, []);

  const handleShare = useCallback(async () => {
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : `https://hb.example/reels/${reel.slug}`;
    const shareData = {
      title: reel.property.title,
      text: `${reel.property.title} — ${reel.property.location}`,
      url,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  }, [reel.property.location, reel.property.title, reel.slug]);

  const whatsappUrl = buildWhatsAppUrl({
    text: `Hi, I'm interested in ${reel.property.title} in ${reel.property.location}.`,
    whatsapp: reel.agent.whatsapp ?? reel.agent.phone,
  });
  const consultantName = reel.agent.displayName ?? reel.agent.name;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black via-[#0a0707] to-black" />

      <div className="relative mx-auto flex h-full w-full max-w-[480px] flex-col">
        <ReelVideoPlayer
          ref={playerRef}
          poster={reel.poster}
          videoUrl={reel.videoUrl}
          mimeType={reel.mimeType}
          isProcessing={reel.isProcessing}
          onDoubleTap={handleDoubleTap}
        />

        {heartBursts.map((burst) => (
          <FloatingHeart
            key={burst.id}
            x={burst.x}
            y={burst.y}
          />
        ))}

        {likeFloatBursts.map((burst) => (
          <FloatingLikeHeart
            key={burst.id}
            offset={burst.offset}
          />
        ))}

        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 via-black/30 to-transparent px-4 pb-10 pt-[max(env(safe-area-inset-top),1rem)]">
          <Link
            href="/reels"
            className="pointer-events-auto inline-flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
            aria-label="Back to reels"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="pointer-events-auto flex max-w-[260px] flex-col items-end gap-2">
            <div className="rounded-2xl bg-black/35 px-3 py-2 text-right backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
                {reel.property.price}
              </p>
              <p className="mt-0.5 line-clamp-1 text-sm font-semibold">
                {reel.property.title}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-white/70">
                <MapPin aria-hidden className="-mt-0.5 mr-1 inline size-3" />
                {reel.property.location}
              </p>
            </div>

            <div className="flex max-w-full items-center gap-2 rounded-full bg-black/35 py-1 pl-1 pr-3 backdrop-blur-md">
              <div className="size-9 shrink-0 overflow-hidden rounded-full border border-[#d6b15f]/70 bg-black/50">
                {reel.agent.image ? (
                  <span
                    aria-label={consultantName}
                    className="block h-full w-full bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url('${reel.agent.image}')` }}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[#d6b15f]/20 text-xs font-bold text-[#d6b15f]">
                    {consultantName.charAt(0)}
                  </span>
                )}
              </div>
              <span className="min-w-0 text-right">
                <span className="block truncate text-xs font-semibold text-white">
                  {consultantName}
                </span>
                {reel.agent.specialty ? (
                  <span className="block max-w-40 truncate text-[0.65rem] text-white/58">
                    {reel.agent.specialty}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        </header>

        <ReelActionBar
          likeCount={likeCount}
          commentCount={commentCount}
          hasLiked={hasLiked}
          onLike={handleLikeClick}
          onComment={handleCommentClick}
          onShare={handleShare}
          onOffer={() => setOpenSheet("offer")}
          agent={reel.agent}
        />

        <InlineReelComments
          ref={commentsRef}
          reelId={reel.id}
          isAuthenticated={reel.isAuthenticated}
          onCommentCountChange={handleCommentAdded}
        />

        <ReelBottomCTA
          whatsappUrl={whatsappUrl}
          onBook={() => setOpenSheet("booking")}
          onDetails={() => setOpenSheet("details")}
        />
      </div>

      <OfferSheet
        open={openSheet === "offer"}
        onClose={() => setOpenSheet(null)}
        slug={reel.slug}
        property={reel.property}
        agent={reel.agent}
      />
      <BookingSheet
        open={openSheet === "booking"}
        onClose={() => setOpenSheet(null)}
        property={reel.property}
        agent={reel.agent}
      />
      <DetailsSheet
        open={openSheet === "details"}
        onClose={() => setOpenSheet(null)}
        title={reel.title}
        description={reel.description}
        property={reel.property}
        agent={reel.agent}
      />
      <CommentBottomSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        reelId={reel.id}
        isAuthenticated={reel.isAuthenticated}
        isAgent={reel.isAgent}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
}

function FloatingLikeHeart({ offset }: { offset: number }) {
  return (
    <div
      className="pointer-events-none absolute bottom-[24rem] right-[4.05rem] z-40 animate-reel-like-float"
      style={{
        marginBottom: offset * 10,
        marginRight: offset * 4,
      }}
      aria-hidden
    >
      <Heart
        className="size-10 text-[#ff3b5c] drop-shadow-[0_0_16px_rgba(255,59,92,0.75)]"
        fill="currentColor"
        strokeWidth={1.8}
      />
    </div>
  );
}

function FloatingHeart({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="size-28 animate-reel-heart drop-shadow-[0_0_25px_rgba(255,60,90,0.8)]"
        fill="#ff3b5c"
      >
        <path d="M12 21s-7.5-4.6-9.6-9.2C.7 7.7 3.5 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.7 0 6.5 3.7 4.8 7.8C19.5 16.4 12 21 12 21z" />
      </svg>
    </div>
  );
}
