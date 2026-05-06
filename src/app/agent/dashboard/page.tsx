import {
  BadgeDollarSign,
  CalendarClock,
  ChevronDown,
  Eye,
  Heart,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { CreateLiveSessionButton } from "@/components/live/CreateLiveSessionButton";
import { RecordingActions } from "@/components/live/RecordingActions";
import { SessionDeleteButton } from "@/components/live/SessionDeleteButton";
import { Card } from "@/components/ui/Card";
import { HB_CONSULTANTS } from "@/lib/hb-consultants";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  accepted: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  contacted: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  countered: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  ended: "border-white/15 bg-white/[0.06] text-white/62",
  live: "border-red-400/35 bg-red-500/12 text-red-100",
  lost: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  new: "border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79]",
  qualified: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  recorded: "border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79]",
  scheduled: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  "under review": "border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79]",
};

type EngagementRow = {
  key: string;
  name: string;
  email: string | null;
  identified: boolean;
  likes: number;
  comments: number;
  lastActivity: Date;
  latestSessionTitle: string;
  latestComment: string | null;
  commentEvents: EngagementComment[];
  likeEvents: EngagementLike[];
};

type EngagementInput = {
  id: string;
  key: string;
  name: string;
  email?: string | null;
  identified: boolean;
  sessionTitle: string;
  kind: "like" | "comment";
  comment?: string | null;
  at: Date;
};

type EngagementComment = {
  id: string;
  message: string;
  sessionTitle: string;
  at: Date;
};

type EngagementLike = {
  id: string;
  sessionTitle: string;
  at: Date;
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold capitalize",
        statusStyles[status] ?? "border-white/15 bg-white/[0.06] text-white/70",
      )}
    >
      {status}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
    </div>
  );
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

function formatDateTime(value: Date | null) {
  if (!value) {
    return "No activity";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatPrice(
  price: { toString(): string } | null | undefined,
  currency: string,
) {
  if (!price) {
    return "Price on request";
  }

  const amount = Number(price.toString());

  if (!Number.isFinite(amount)) {
    return `${currency} ${price.toString()}`;
  }

  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function formatSessionStatus(status: string, hasRecording: boolean) {
  if (status !== "LIVE" && hasRecording) {
    return "recorded";
  }

  return status.toLowerCase();
}

function isRecordingVisible(session: {
  recordingPlaybackId: string | null;
  recordingStatus: string | null;
}) {
  return (
    session.recordingStatus !== "deleted" &&
    Boolean(session.recordingPlaybackId)
  );
}

function canDeleteRecording(session: {
  muxAssetId: string | null;
  recordingPlaybackId: string | null;
  recordingStatus: string | null;
}) {
  return (
    session.recordingStatus !== "deleted" &&
    Boolean(session.recordingPlaybackId || session.muxAssetId)
  );
}

function normalizeEngagementName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function mergeEngagement(
  rows: Map<string, EngagementRow>,
  input: EngagementInput,
) {
  const commentEvent =
    input.kind === "comment"
      ? [
          {
            id: input.id,
            message: input.comment ?? "",
            sessionTitle: input.sessionTitle,
            at: input.at,
          },
        ]
      : [];
  const likeEvent =
    input.kind === "like"
      ? [
          {
            id: input.id,
            sessionTitle: input.sessionTitle,
            at: input.at,
          },
        ]
      : [];
  const existing = rows.get(input.key);

  if (!existing) {
    rows.set(input.key, {
      key: input.key,
      name: input.name,
      email: input.email ?? null,
      identified: input.identified,
      likes: input.kind === "like" ? 1 : 0,
      comments: input.kind === "comment" ? 1 : 0,
      lastActivity: input.at,
      latestSessionTitle: input.sessionTitle,
      latestComment: input.comment ?? null,
      commentEvents: commentEvent,
      likeEvents: likeEvent,
    });
    return;
  }

  if (input.kind === "like") {
    existing.likes += 1;
    existing.likeEvents.push(...likeEvent);
  } else {
    existing.comments += 1;
    existing.commentEvents.push(...commentEvent);
  }

  if (input.identified) {
    existing.identified = true;
  }

  if (!existing.email && input.email) {
    existing.email = input.email;
  }

  if (input.at > existing.lastActivity) {
    existing.lastActivity = input.at;
    existing.latestSessionTitle = input.sessionTitle;
    existing.latestComment = input.comment ?? existing.latestComment;
  }
}

export default async function AgentDashboardPage() {
  const [
    databaseProperties,
    databaseLiveSessions,
    allLeads,
    allOffers,
    recentComments,
    recentLikes,
  ] = await Promise.all([
    prisma.property.findMany({
      include: {
        _count: {
          select: {
            leads: true,
            liveSessions: true,
          },
        },
        liveSessions: {
          orderBy: { createdAt: "desc" },
          select: {
            startsAt: true,
            status: true,
          },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.liveSession.findMany({
      include: {
        _count: {
          select: {
            comments: true,
            leads: true,
            likeEvents: true,
          },
        },
        property: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.lead.findMany({
      include: {
        liveSession: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.offer.findMany({
      include: {
        property: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.comment.findMany({
      include: {
        liveSession: {
          select: {
            roomId: true,
            title: true,
          },
        },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.likeEvent.findMany({
      include: {
        liveSession: {
          select: {
            roomId: true,
            title: true,
          },
        },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const totalViews = databaseLiveSessions.reduce(
    (sum, session) => sum + session.viewers,
    0,
  );
  const totalLeads = allLeads.length;
  const totalOffers = allOffers.length;
  const totalWhatsappClicks = databaseLiveSessions.reduce(
    (sum, session) => sum + session.whatsappClicks,
    0,
  );
  const totalLikes = databaseLiveSessions.reduce(
    (sum, session) => sum + session._count.likeEvents,
    0,
  );
  const totalComments = databaseLiveSessions.reduce(
    (sum, session) => sum + session._count.comments,
    0,
  );

  const engagementRows = new Map<string, EngagementRow>();
  const knownUserKeyByName = new Map<string, string>();

  for (const like of recentLikes) {
    if (like.userId && like.user?.name) {
      knownUserKeyByName.set(
        normalizeEngagementName(like.user.name),
        `user:${like.userId}`,
      );
    }
  }

  for (const comment of recentComments) {
    if (comment.userId && comment.user?.name) {
      knownUserKeyByName.set(
        normalizeEngagementName(comment.user.name),
        `user:${comment.userId}`,
      );
    }
  }

  for (const comment of recentComments) {
    const normalizedAuthor = normalizeEngagementName(comment.author);

    mergeEngagement(engagementRows, {
      id: comment.id,
      key: comment.userId
        ? `user:${comment.userId}`
        : knownUserKeyByName.get(normalizedAuthor) ??
          `comment-author:${normalizedAuthor}`,
      name: comment.user?.name ?? comment.author,
      email: comment.user?.email,
      identified: Boolean(comment.userId),
      sessionTitle: comment.liveSession.title,
      kind: "comment",
      comment: comment.message,
      at: comment.createdAt,
    });
  }

  for (const like of recentLikes) {
    mergeEngagement(engagementRows, {
      id: like.id,
      key: like.userId
        ? `user:${like.userId}`
        : like.visitorId
          ? `visitor:${like.visitorId}`
          : `like:${like.id}`,
      name: like.user?.name ?? like.user?.email ?? "Unknown viewer",
      email: like.user?.email,
      identified: Boolean(like.userId),
      sessionTitle: like.liveSession.title,
      kind: "like",
      at: like.createdAt,
    });
  }

  const engagementSummary = Array.from(engagementRows.values())
    .map((row) => ({
      ...row,
      commentEvents: row.commentEvents.sort(
        (a, b) => b.at.getTime() - a.at.getTime(),
      ),
      likeEvents: row.likeEvents.sort(
        (a, b) => b.at.getTime() - a.at.getTime(),
      ),
    }))
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

  const overviewCards = [
    {
      label: "Total live views",
      value: totalViews.toLocaleString(),
      detail: `${databaseLiveSessions.length} active sessions`,
      icon: Eye,
    },
    {
      label: "Total leads",
      value: totalLeads.toLocaleString(),
      detail: `${allLeads.filter((l) => l.status === "NEW").length} new leads`,
      icon: UsersRound,
    },
    {
      label: "Total offers",
      value: totalOffers.toLocaleString(),
      detail: allOffers.length > 0 ? "Offers tracked" : "No offers yet",
      icon: BadgeDollarSign,
    },
    {
      label: "WhatsApp clicks",
      value: totalWhatsappClicks.toLocaleString(),
      detail: "High-intent interactions",
      icon: MessageCircle,
    },
    {
      label: "Live engagement",
      value: (totalLikes + totalComments).toLocaleString(),
      detail: `${totalLikes.toLocaleString()} likes, ${totalComments.toLocaleString()} comments`,
      icon: Heart,
    },
  ];
  const propertyOptions = databaseProperties.map((property) => ({
    id: property.id,
    location: property.location,
    title: property.title,
  }));

  return (
    <div className="bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
              <CalendarClock aria-hidden className="size-4" />
              Agent dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
              Live sales command center
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/62">
              Monitor live sessions, buyer demand, property activity, and offer
              follow-ups from one workspace.
            </p>
          </div>
        </div>

        <CreateLiveSessionButton
          consultants={HB_CONSULTANTS}
          properties={propertyOptions}
        />

        <section
          aria-label="Overview"
          className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          {overviewCards.map((card) => {
            const Icon = card.icon;

            return (
              <Card className="p-5" key={card.label}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/52">{card.label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">
                      {card.value}
                    </p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-md border border-[#d6b15f]/25 bg-[#d6b15f]/10 text-[#d6b15f]">
                    <Icon aria-hidden className="size-5" />
                  </span>
                </div>
                <p className="mt-4 text-sm text-white/58">{card.detail}</p>
              </Card>
            );
          })}
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="p-5">
            <SectionHeader eyebrow="Live sessions" title="Session performance" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Title</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Viewers
                    </th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Leads
                    </th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Likes
                    </th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Comments
                    </th>
                    <th className="pb-3 pr-4 font-semibold">Date</th>
                    <th className="pb-3 pr-4 font-semibold">Recording</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {databaseLiveSessions.map((session) => (
                    <tr key={session.id}>
                      <td className="py-4 pr-4 font-medium text-white">
                        <Link
                          className="transition hover:text-[#f0cf79]"
                          href={`/live/${session.roomId}`}
                        >
                          {session.title}
                        </Link>
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge
                          status={formatSessionStatus(
                            session.status,
                            isRecordingVisible(session),
                          )}
                        />
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {session.viewers}
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {session._count.leads}
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {session._count.likeEvents}
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {session._count.comments}
                      </td>
                      <td className="py-4 pr-4 text-white/62">
                        {formatDate(session.startsAt ?? session.createdAt)}
                      </td>
                      <td className="py-4 pr-4">
                        <RecordingActions
                          canDelete={canDeleteRecording(session)}
                          canWatch={isRecordingVisible(session)}
                          liveSessionId={session.id}
                          roomId={session.roomId}
                        />
                      </td>
                      <td className="py-4">
                        <SessionDeleteButton liveSessionId={session.id} />
                      </td>
                    </tr>
                  ))}
                  {databaseLiveSessions.length === 0 ? (
                    <tr>
                      <td className="py-6 text-sm text-white/52" colSpan={9}>
                        No live sessions yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader eyebrow="Properties" title="Active inventory" />
            <div className="space-y-3">
              {databaseProperties.map((property) => {
                const latestSession = property.liveSessions[0];
                const activity =
                  latestSession?.status === "LIVE"
                    ? "1 live now"
                    : latestSession?.startsAt
                      ? `Next: ${formatDate(latestSession.startsAt)}`
                      : `${property._count.leads} leads`;

                return (
                <div
                  className="rounded-md border border-white/10 bg-black/20 p-4"
                  key={property.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{property.title}</p>
                      <p className="mt-1 text-sm text-white/52">
                        {property.location}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#d6b15f]">
                      {formatPrice(property.price, property.currency)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-white/56">
                    {activity}
                  </p>
                </div>
                );
              })}
              {databaseProperties.length === 0 ? (
                <div className="rounded-md border border-white/10 bg-black/20 p-4 text-sm text-white/52">
                  No properties in the database yet.
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="mt-6 p-5">
          <SectionHeader
            eyebrow="Engagement"
            title={`Buyer engagement (${engagementSummary.length})`}
          />
          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {engagementSummary.length > 0 ? (
              engagementSummary.map((row) => (
                <details
                  className="group rounded-md border border-white/10 bg-black/20"
                  key={row.key}
                >
                  <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 text-sm marker:hidden sm:grid-cols-[minmax(180px,1.2fr)_minmax(140px,1fr)_auto_auto_auto] sm:items-center [&::-webkit-details-marker]:hidden">
                    <div>
                      <p className="font-medium text-white">{row.name}</p>
                      <p className="mt-1 text-xs text-white/48">
                        {row.email ??
                          (row.identified ? "Signed-in buyer" : "Guest name")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/36">
                        Latest session
                      </p>
                      <p className="mt-1 truncate text-white/70">
                        {row.latestSessionTitle}
                      </p>
                    </div>
                    <div className="flex gap-2 sm:justify-end">
                      <span className="inline-flex h-7 items-center rounded-full border border-red-300/20 bg-red-400/10 px-2.5 text-xs font-semibold text-red-100">
                        {row.likes} likes
                      </span>
                      <span className="inline-flex h-7 items-center rounded-full border border-[#d6b15f]/25 bg-[#d6b15f]/10 px-2.5 text-xs font-semibold text-[#f0cf79]">
                        {row.comments} comments
                      </span>
                    </div>
                    <p className="text-white/52 sm:text-right">
                      {formatDateTime(row.lastActivity)}
                    </p>
                    <ChevronDown
                      aria-hidden
                      className="size-4 text-white/42 transition group-open:rotate-180 sm:justify-self-end"
                    />
                  </summary>

                  <div className="grid gap-4 border-t border-white/10 px-4 py-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/38">
                        Comments
                      </p>
                      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                        {row.commentEvents.length > 0 ? (
                          row.commentEvents.map((comment) => (
                            <div
                              className="rounded-md border border-white/10 bg-white/[0.03] p-3"
                              key={comment.id}
                            >
                              <p className="text-sm leading-6 text-white/76">
                                {comment.message}
                              </p>
                              <p className="mt-2 text-xs text-white/42">
                                {comment.sessionTitle} ·{" "}
                                {formatDateTime(comment.at)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-white/46">
                            No comments yet.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/38">
                        Likes
                      </p>
                      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                        {row.likeEvents.length > 0 ? (
                          row.likeEvents.map((like) => (
                            <div
                              className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm"
                              key={like.id}
                            >
                              <span className="text-white/76">
                                {like.sessionTitle}
                              </span>
                              <span className="shrink-0 text-xs text-white/42">
                                {formatDateTime(like.at)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-white/46">
                            No likes yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              ))
            ) : (
              <div className="rounded-md border border-white/10 bg-black/20 p-4 text-sm text-white/52">
                No likes or comments yet.
              </div>
            )}
          </div>
        </Card>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <SectionHeader eyebrow="Leads" title="Buyer pipeline" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Name</th>
                    <th className="pb-3 pr-4 font-semibold">Phone</th>
                    <th className="pb-3 pr-4 font-semibold">Interest</th>
                    <th className="pb-3 pr-4 font-semibold">Budget</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {allLeads.length > 0 ? (
                    allLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td className="py-4 pr-4 font-medium text-white">
                          {lead.fullName}
                        </td>
                        <td className="py-4 pr-4 text-white/62">{lead.phone}</td>
                        <td className="py-4 pr-4 text-white/72">
                          {lead.liveSession?.title || lead.interest}
                        </td>
                        <td className="py-4 pr-4 text-white/72">
                          {lead.budget}
                        </td>
                        <td className="py-4">
                          <StatusBadge status={lead.status.toLowerCase()} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-6 text-sm text-white/52" colSpan={5}>
                        No leads yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader eyebrow="Offers" title="Negotiation tracker" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Property</th>
                    <th className="pb-3 pr-4 font-semibold">Offer amount</th>
                    <th className="pb-3 pr-4 font-semibold">Buyer name</th>
                    <th className="pb-3 pr-4 font-semibold">Phone</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {allOffers.length > 0 ? (
                    allOffers.map((offer) => (
                      <tr key={offer.id}>
                        <td className="py-4 pr-4 font-medium text-white">
                          {offer.property?.title}
                        </td>
                        <td className="py-4 pr-4 font-semibold text-[#d6b15f]">
                          {new Intl.NumberFormat("en-US", {
                            currency: offer.currency,
                            style: "currency",
                          }).format(Number(offer.amount))}
                        </td>
                        <td className="py-4 pr-4 text-white/72">
                          {offer.buyerName}
                        </td>
                        <td className="py-4 pr-4 text-white/62">
                          {offer.phone}
                        </td>
                        <td className="py-4">
                          <StatusBadge
                            status={offer.status
                              .toLowerCase()
                              .replace("_", " ")}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-6 text-sm text-white/52" colSpan={5}>
                        No offers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
