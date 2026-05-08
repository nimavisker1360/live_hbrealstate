export const PUSHER_EVENTS = {
  COMMENT_CREATED: "comment-created",
  LIKE_CREATED: "like-created",
} as const;

export type RealtimeComment = {
  id: string;
  author: string;
  message: string;
  liveSessionId: string;
  createdAt: string;
};

export type RealtimeCommentEvent = {
  comment: RealtimeComment;
  clientEventId?: string;
};

export type RealtimeReelComment = {
  id: string;
  parentId: string | null;
  author: string;
  message: string;
  createdAt: string;
  isMember: boolean;
  isAgent: boolean;
  agentBadge: "Official Agent" | "HB Agent" | null;
  isPinned: boolean;
  likeCount: number;
  replies: RealtimeReelComment[];
};

export type RealtimeReelCommentEvent = {
  reelId: string;
  comment: RealtimeReelComment;
  commentCount: number;
  clientEventId?: string;
};

export type RealtimeLikeEvent = {
  liveSessionId: string;
  count: number;
  clientEventId?: string;
  userId: string;
  userName?: string;
};

export function getLivePresenceChannel(liveSessionId: string) {
  return `presence-live-${liveSessionId}`;
}

export function getReelCommentsChannel(reelId: string) {
  return `reel-comments-${reelId}`;
}
