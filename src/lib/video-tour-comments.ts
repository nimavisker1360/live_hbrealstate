import { z } from "zod";
import type { AuthSession } from "@/lib/auth";
import { getSessionBackedByDatabase } from "@/lib/auth-users";
import { appendVisitorCookie, ensureVisitorId } from "@/lib/reel-visitor";
import { prisma } from "@/lib/prisma";

export const VIDEO_TOUR_COMMENT_MIN_LENGTH = 1;
export const VIDEO_TOUR_COMMENT_MAX_LENGTH = 500;

const COMMENT_COOLDOWN_MS = 4_000;
const URL_PATTERN = /\bhttps?:\/\/|www\.[a-z0-9]/i;
const REPEAT_PATTERN = /(.)\1{12,}/;
const recentPosts = new Map<string, number>();

export const videoTourCommentBodySchema = z.object({
  message: z
    .string()
    .trim()
    .min(VIDEO_TOUR_COMMENT_MIN_LENGTH)
    .max(VIDEO_TOUR_COMMENT_MAX_LENGTH),
  author: z.string().trim().min(1).max(80).optional(),
  parentId: z.string().trim().min(1).nullable().optional(),
});

export type VideoTourCommentSort = "newest" | "mostLiked";

type CommentUser = {
  role: "OWNER" | "AGENT" | "BUYER";
};

type SerializableVideoTourComment = {
  id: string;
  parentId: string | null;
  author: string;
  message: string;
  createdAt: Date;
  userId: string | null;
  agentId: string | null;
  isPinned: boolean;
  likeCount: number;
  user: CommentUser | null;
  replies?: SerializableVideoTourComment[];
};

export type SerializedVideoTourComment = {
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
  replies: SerializedVideoTourComment[];
};

export function pruneCommentCooldown(now: number) {
  for (const [key, ts] of recentPosts) {
    if (now - ts > COMMENT_COOLDOWN_MS * 8) {
      recentPosts.delete(key);
    }
  }
}

export function detectCommentSpam(message: string): string | null {
  if (URL_PATTERN.test(message)) return "Links are not allowed in comments.";
  if (REPEAT_PATTERN.test(message)) return "Comment looks like spam.";
  return null;
}

export function serializeVideoTourComment(
  comment: SerializableVideoTourComment,
): SerializedVideoTourComment {
  const isAgent =
    Boolean(comment.agentId) ||
    comment.user?.role === "AGENT" ||
    comment.user?.role === "OWNER";

  return {
    id: comment.id,
    parentId: comment.parentId,
    author: comment.author,
    message: comment.message,
    createdAt: comment.createdAt.toISOString(),
    isMember: Boolean(comment.userId),
    isAgent,
    agentBadge: isAgent
      ? comment.user?.role === "OWNER"
        ? "HB Agent"
        : "Official Agent"
      : null,
    isPinned: comment.isPinned,
    likeCount: comment.likeCount,
    replies: (comment.replies ?? []).map(serializeVideoTourComment),
  };
}

export async function fetchThreadedVideoTourComments({
  cursor,
  sort,
  take,
  videoTourId,
}: {
  cursor?: string;
  sort: VideoTourCommentSort;
  take: number;
  videoTourId: string;
}) {
  const orderBy =
    sort === "mostLiked"
      ? [
          { isPinned: "desc" as const },
          { likeCount: "desc" as const },
          { createdAt: "desc" as const },
        ]
      : [
          { isPinned: "desc" as const },
          { createdAt: "desc" as const },
        ];

  const comments = await prisma.videoTourComment.findMany({
    where: { videoTourId, parentId: null },
    orderBy,
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      parentId: true,
      author: true,
      message: true,
      createdAt: true,
      userId: true,
      agentId: true,
      isPinned: true,
      likeCount: true,
      user: { select: { role: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          parentId: true,
          author: true,
          message: true,
          createdAt: true,
          userId: true,
          agentId: true,
          isPinned: true,
          likeCount: true,
          user: { select: { role: true } },
        },
      },
    },
  });

  const hasMore = comments.length > take;
  const page = hasMore ? comments.slice(0, take) : comments;

  return {
    comments: page.map(serializeVideoTourComment),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function resolveCommentParent(
  videoTourId: string,
  parentId?: string | null,
) {
  if (!parentId) return null;

  const parent = await prisma.videoTourComment.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true, videoTourId: true },
  });

  if (!parent || parent.videoTourId !== videoTourId) {
    return undefined;
  }

  return parent.parentId ?? parent.id;
}

export async function resolveCommentIdentity({
  author,
  reelAgentId,
  session,
}: {
  author?: string;
  reelAgentId: string;
  session: AuthSession | null;
}) {
  const dbSession = session ? await getSessionBackedByDatabase(session) : null;
  const isAgent =
    dbSession?.role === "AGENT" || dbSession?.role === "OWNER";
  const visitor = dbSession ? null : await ensureVisitorId();
  let agentId: string | null = null;

  if (isAgent && dbSession) {
    const linkedAgent = await prisma.agent.findFirst({
      where: {
        OR: [{ userId: dbSession.sub }, { id: reelAgentId }],
      },
      select: { id: true },
    });

    agentId = linkedAgent?.id ?? reelAgentId;
  }

  return {
    userId: dbSession?.sub ?? null,
    agentId,
    visitor,
    author: dbSession?.name?.trim() || author?.trim() || "Guest",
    isAgent,
    identity: dbSession?.sub ?? visitor?.visitorId ?? null,
  };
}

export function checkCommentCooldown(videoTourId: string, identity: string) {
  const now = Date.now();
  const key = `${videoTourId}:${identity}`;
  const last = recentPosts.get(key);

  if (last && now - last < COMMENT_COOLDOWN_MS) {
    return {
      key,
      now,
      retryAfterMs: COMMENT_COOLDOWN_MS - (now - last),
    };
  }

  return { key, now, retryAfterMs: 0 };
}

export function markCommentPosted(key: string, now: number) {
  recentPosts.set(key, now);
  pruneCommentCooldown(now);
}

export function withVisitorCookie(response: Response, visitor?: { setCookie?: { name: string; value: string } } | null) {
  return appendVisitorCookie(response, visitor?.setCookie);
}
