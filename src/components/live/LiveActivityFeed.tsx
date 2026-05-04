"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityType = "like" | "comment";

type Activity = {
  id: string;
  type: ActivityType;
  author?: string;
  message?: string;
  timestamp: number;
  expiresAt: number;
};

export function LiveActivityFeed({ activities }: { activities: Activity[] }) {
  const [visibleActivities, setVisibleActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const now = Date.now();
    setVisibleActivities(activities.filter((a) => a.expiresAt > now));

    const timer = setInterval(() => {
      const now = Date.now();
      setVisibleActivities((current) =>
        current.filter((a) => a.expiresAt > now)
      );
    }, 300);

    return () => clearInterval(timer);
  }, [activities]);

  if (visibleActivities.length === 0) {
    return null;
  }

  return (
    <div className="absolute left-4 top-48 z-20 max-w-xs space-y-2">
      {visibleActivities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const isLike = activity.type === "like";
  const isComment = activity.type === "comment";

  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-top-2 rounded-full px-3 py-2 text-sm font-medium shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md border",
        isLike
          ? "border-red-400/40 bg-red-500/15 text-red-100"
          : "border-white/12 bg-white/10 text-white"
      )}
    >
      <div className="flex items-center gap-2">
        {isLike ? (
          <Heart aria-hidden className="size-4 text-red-400" fill="currentColor" />
        ) : (
          <MessageCircle aria-hidden className="size-4 text-white/70" />
        )}
        <span className="truncate">
          {isLike ? (
            <span>
              <span className="font-semibold text-red-200">{activity.author}</span>{" "}
              <span className="text-red-100">likes this</span>
            </span>
          ) : (
            <>
              <span className="font-semibold text-[#f0cf79]">{activity.author}</span>{" "}
              <span className="text-white/70 line-clamp-1">"{activity.message}"</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
