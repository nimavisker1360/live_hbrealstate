"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type ReelActionBarProps = {
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onOffer: () => void;
  agent: {
    name: string;
    image?: string;
  };
};

function formatCount(count: number) {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}K`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

export function ReelActionBar({
  likeCount,
  commentCount,
  hasLiked,
  onLike,
  onComment,
  onShare,
  onOffer,
  agent,
}: ReelActionBarProps) {
  return (
    <div className="pointer-events-none absolute bottom-32 right-3 z-30 flex flex-col items-center gap-5">
      <div className="pointer-events-auto flex flex-col items-center">
        <div className="size-12 overflow-hidden rounded-full border-2 border-[#d6b15f] bg-black/50">
          {agent.image ? (
            <img
              alt={agent.name}
              src={agent.image}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#d6b15f]/20 text-sm font-bold text-[#d6b15f]">
              {agent.name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      <LikeButton
        hasLiked={hasLiked}
        likeCount={likeCount}
        onLike={onLike}
      />

      <ActionButton
        label={formatCount(commentCount)}
        ariaLabel="Open comments"
        onClick={onComment}
      >
        <MessageCircle className="size-7 text-white" />
      </ActionButton>

      <ActionButton label="Share" ariaLabel="Share reel" onClick={onShare}>
        <Send className="size-7 text-white" />
      </ActionButton>

      <ActionButton
        label="Offer"
        ariaLabel="Make an offer"
        onClick={onOffer}
        accent
      >
        <Tag className="size-7 text-[#d6b15f]" />
      </ActionButton>
    </div>
  );
}

function LikeButton({
  hasLiked,
  likeCount,
  onLike,
}: {
  hasLiked: boolean;
  likeCount: number;
  onLike: () => void;
}) {
  const [popKey, setPopKey] = useState(0);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    setPopKey((k) => k + 1);
  }, [hasLiked]);

  return (
    <button
      type="button"
      onClick={onLike}
      aria-label={hasLiked ? "Unlike video" : "Like video"}
      aria-pressed={hasLiked}
      className="pointer-events-auto flex flex-col items-center gap-1 active:scale-95 transition"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md transition hover:bg-black/65">
        <Heart
          key={popKey}
          className={cn(
            "size-7 animate-reel-heart-pop transition-colors",
            hasLiked
              ? "fill-[#ff3b5c] text-[#ff3b5c] drop-shadow-[0_0_10px_rgba(255,60,90,0.5)]"
              : "text-white",
          )}
        />
      </span>
      <span
        key={`count-${likeCount}`}
        className="animate-reel-count-flip text-xs font-semibold text-white drop-shadow tabular-nums"
      >
        {formatCount(likeCount)}
      </span>
    </button>
  );
}

function ActionButton({
  children,
  label,
  ariaLabel,
  onClick,
  accent,
}: {
  children: React.ReactNode;
  label: string;
  ariaLabel: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="pointer-events-auto flex flex-col items-center gap-1 active:scale-95 transition"
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full bg-black/45 backdrop-blur-md transition hover:bg-black/65",
          accent && "ring-1 ring-[#d6b15f]/60",
        )}
      >
        {children}
      </span>
      <span className="text-xs font-semibold text-white drop-shadow">
        {label}
      </span>
    </button>
  );
}
