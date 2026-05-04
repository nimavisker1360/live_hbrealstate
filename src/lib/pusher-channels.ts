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
