import {
  BadgeDollarSign,
  Clapperboard,
  ChevronDown,
  Eye,
  Heart,
  MessageCircle,
  PlayCircle,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ClearEngagementButton } from "@/components/property-reels/ClearEngagementButton";
import { PropertyDeleteButton } from "@/components/property-reels/PropertyDeleteButton";
import { ReelRowActions } from "@/components/property-reels/ReelRowActions";
import { UploadPropertyReelPanel } from "@/components/property-reels/UploadPropertyReelPanel";
import { HB_CONSULTANTS, getConsultantById } from "@/lib/hb-consultants";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  archived: "border-white/15 bg-white/[0.06] text-white/62",
  draft: "border-violet-300/30 bg-violet-400/10 text-violet-100",
  processing: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  published: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  accepted: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  countered: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  pending: "border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79]",
  rejected: "border-rose-400/30 bg-rose-400/10 text-rose-200",
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
  latestReelTitle: string;
  latestComment: string | null;
  commentEvents: { id: string; message: string; reelTitle: string; at: Date }[];
  likeEvents: { id: string; reelTitle: string; at: Date }[];
};

type EngagementInput = {
  id: string;
  key: string;
  name: string;
  email?: string | null;
  identified: boolean;
  reelTitle: string;
  kind: "like" | "comment";
  comment?: string | null;
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
    return "—";
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

function formatBytes(value: bigint | null | undefined) {
  if (!value) {
    return "—";
  }

  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function normalizeEngagementName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function mergeEngagement(
  rows: Map<string, EngagementRow>,
  input: EngagementInput,
) {
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
      latestReelTitle: input.reelTitle,
      latestComment: input.comment ?? null,
      commentEvents:
        input.kind === "comment"
          ? [
              {
                id: input.id,
                message: input.comment ?? "",
                reelTitle: input.reelTitle,
                at: input.at,
              },
            ]
          : [],
      likeEvents:
        input.kind === "like"
          ? [{ id: input.id, reelTitle: input.reelTitle, at: input.at }]
          : [],
    });
    return;
  }

  if (input.kind === "like") {
    existing.likes += 1;
    existing.likeEvents.push({
      id: input.id,
      reelTitle: input.reelTitle,
      at: input.at,
    });
  } else {
    existing.comments += 1;
    existing.commentEvents.push({
      id: input.id,
      message: input.comment ?? "",
      reelTitle: input.reelTitle,
      at: input.at,
    });
  }

  if (input.identified) {
    existing.identified = true;
  }

  if (!existing.email && input.email) {
    existing.email = input.email;
  }

  if (input.at > existing.lastActivity) {
    existing.lastActivity = input.at;
    existing.latestReelTitle = input.reelTitle;
    existing.latestComment = input.comment ?? existing.latestComment;
  }
}

export default async function AgentDashboardPage() {
  const [
    databaseProperties,
    videoTours,
    recentOffers,
    recentComments,
    recentLikes,
  ] = await Promise.all([
    prisma.property.findMany({
      include: {
        _count: {
          select: { videoTours: true },
        },
        videoTours: {
          orderBy: { updatedAt: "desc" },
          select: { status: true, updatedAt: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.videoTour.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        status: true,
        blobUrl: true,
        mimeType: true,
        fileSize: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        publishedAt: true,
        createdAt: true,
        property: {
          select: { id: true, title: true, location: true },
        },
        _count: {
          select: { offers: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.videoTourOffer.findMany({
      include: {
        videoTour: {
          select: {
            title: true,
            property: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.videoTourComment.findMany({
      include: {
        videoTour: {
          select: { id: true, title: true },
        },
        user: {
          select: { email: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.videoTourLike.findMany({
      include: {
        videoTour: {
          select: { id: true, title: true },
        },
        user: {
          select: { email: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const totalReels = videoTours.length;
  const publishedReels = videoTours.filter(
    (reel) => reel.status === "PUBLISHED",
  ).length;
  const draftReels = videoTours.filter(
    (reel) => reel.status === "DRAFT" || reel.status === "PROCESSING",
  ).length;
  const totalViews = videoTours.reduce(
    (sum, reel) => sum + reel.viewCount,
    0,
  );
  const totalLikes = videoTours.reduce(
    (sum, reel) => sum + reel.likeCount,
    0,
  );
  const totalComments = videoTours.reduce(
    (sum, reel) => sum + reel.commentCount,
    0,
  );
  const totalOffers = videoTours.reduce(
    (sum, reel) => sum + reel._count.offers,
    0,
  );

  const overviewCards = [
    {
      label: "Total reels",
      value: totalReels.toLocaleString(),
      detail: `${publishedReels} published · ${draftReels} draft`,
      icon: Clapperboard,
    },
    {
      label: "Reel views",
      value: totalViews.toLocaleString(),
      detail: "Across all reels",
      icon: Eye,
    },
    {
      label: "Likes",
      value: totalLikes.toLocaleString(),
      detail: "Buyer reactions",
      icon: Heart,
    },
    {
      label: "Comments",
      value: totalComments.toLocaleString(),
      detail: "Conversation volume",
      icon: MessageCircle,
    },
    {
      label: "Offers",
      value: totalOffers.toLocaleString(),
      detail: totalOffers > 0 ? "Offers tracked" : "No offers yet",
      icon: BadgeDollarSign,
    },
  ];

  const propertyOptions = databaseProperties.map((property) => ({
    id: property.id,
    location: property.location,
    title: property.title,
  }));

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
      reelTitle: comment.videoTour.title,
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
      reelTitle: like.videoTour.title,
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

  return (
    <div className="bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
              <Clapperboard aria-hidden className="size-4" />
              Agent dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
              Property reels command center
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/62">
              Upload property videos, publish reels to buyers, and track likes,
              comments, and offers from a single workspace.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-[#d6b15f]/25 bg-[#d6b15f]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f0cf79]">
            <UploadCloud aria-hidden className="size-4" />
            {totalReels} reels in library
          </div>
        </div>

        <UploadPropertyReelPanel
          consultants={HB_CONSULTANTS.map((consultant) => ({
            id: consultant.id,
            image: consultant.image,
            name: consultant.name,
            specialty: consultant.specialty,
          }))}
          properties={propertyOptions}
        />

        <section
          aria-label="Property reels analytics"
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

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.52fr)]">
          <Card className="p-5">
            <SectionHeader
              eyebrow="Property reels"
              title="Reel performance"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                  <tr>
                    <th className="pb-3 pr-4 font-semibold">Reel</th>
                    <th className="pb-3 pr-4 font-semibold">Status</th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Views
                    </th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Likes
                    </th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Comments
                    </th>
                    <th className="pb-3 pr-4 text-right font-semibold">
                      Offers
                    </th>
                    <th className="pb-3 pr-4 font-semibold">Size</th>
                    <th className="pb-3 pr-4 font-semibold">Uploaded</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {videoTours.map((reel) => (
                    <tr key={reel.id}>
                      <td className="py-4 pr-4 font-medium text-white">
                        <a
                          className="inline-flex items-center gap-2 transition hover:text-[#f0cf79]"
                          href={reel.blobUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <PlayCircle aria-hidden className="size-4 text-[#d6b15f]" />
                          <span>
                            <span className="block">{reel.title}</span>
                            <span className="block text-xs text-white/52">
                              {reel.property.title} · {reel.property.location}
                            </span>
                          </span>
                        </a>
                      </td>
                      <td className="py-4 pr-4">
                        <StatusBadge status={reel.status.toLowerCase()} />
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {reel.viewCount.toLocaleString()}
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {reel.likeCount.toLocaleString()}
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {reel.commentCount.toLocaleString()}
                      </td>
                      <td className="py-4 pr-4 text-right text-white/72">
                        {reel._count.offers.toLocaleString()}
                      </td>
                      <td className="py-4 pr-4 text-white/62">
                        {formatBytes(reel.fileSize)}
                      </td>
                      <td className="py-4 pr-4 text-white/62">
                        {formatDate(reel.createdAt)}
                      </td>
                      <td className="py-4">
                        <ReelRowActions
                          reel={{
                            id: reel.id,
                            title: reel.title,
                            description: reel.description,
                            status: reel.status,
                            videoUrl: reel.blobUrl,
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {videoTours.length === 0 ? (
                    <tr>
                      <td className="py-6 text-sm text-white/52" colSpan={9}>
                        No property reels yet — upload one above to get started.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
                Properties
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Active inventory
              </h2>
              <p className="mt-2 text-sm text-white/46">
                Delete removes the property, linked reels, and stored media.
              </p>
            </div>
            <div className="space-y-3">
              {databaseProperties.map((property) => {
                const latestReel = property.videoTours[0];
                const consultant = getConsultantById(property.consultantId);
                const activity = latestReel
                  ? `Latest reel · ${latestReel.status.toLowerCase()} · ${formatDate(latestReel.updatedAt)}`
                  : `${property._count.videoTours} reels`;

                const specs: string[] = [];
                if (property.bedrooms) {
                  specs.push(`${property.bedrooms} bd`);
                }
                if (property.bathrooms) {
                  specs.push(`${property.bathrooms} ba`);
                }
                if (property.areaSquareMeters) {
                  specs.push(`${property.areaSquareMeters} m²`);
                }

                return (
                  <div
                    className="overflow-hidden rounded-md border border-white/10 bg-black/25"
                    key={property.id}
                  >
                    <div className="grid gap-3 p-3 sm:grid-cols-[104px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[104px_minmax(0,1fr)]">
                      <div
                        aria-hidden
                        className="aspect-[16/10] rounded-md border border-white/10 bg-black/40 bg-cover bg-center sm:aspect-square xl:aspect-[16/10] 2xl:aspect-square"
                        style={{
                          backgroundImage: property.image
                            ? `url('${property.image}')`
                            : undefined,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold leading-5 text-white">
                              {property.title}
                            </p>
                            <p className="mt-1 break-words text-sm text-white/52">
                              {property.location}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md border border-[#d6b15f]/25 bg-[#d6b15f]/10 px-2 py-1 text-xs font-semibold text-[#f0cf79]">
                            {property._count.videoTours}
                          </span>
                        </div>
                        <p className="mt-3 break-words text-sm font-semibold text-[#d6b15f]">
                          {formatPrice(property.price, property.currency)}
                        </p>
                        {specs.length > 0 ? (
                          <p className="mt-2 text-xs text-white/52">
                            {specs.join(" · ")}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm text-white/56">
                          {activity}
                        </p>
                        {consultant ? (
                          <p className="mt-2 truncate text-xs text-[#f0cf79]">
                            Consultant: {consultant.name}
                          </p>
                        ) : null}
                        <div className="mt-3">
                          <PropertyDeleteButton
                            propertyId={property.id}
                            propertyTitle={property.title}
                            reelCount={property._count.videoTours}
                          />
                        </div>
                      </div>
                    </div>
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
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
                Engagement
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Likes & comments ({engagementSummary.length})
              </h2>
            </div>
            <ClearEngagementButton />
          </div>
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
                          (row.identified ? "Signed-in buyer" : "Guest")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-white/36">
                        Latest reel
                      </p>
                      <p className="mt-1 truncate text-white/70">
                        {row.latestReelTitle}
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
                                {comment.reelTitle} ·{" "}
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
                                {like.reelTitle}
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

        <Card className="mt-6 p-5">
          <SectionHeader eyebrow="Offers" title="Offers from reels" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-white/40">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Reel</th>
                  <th className="pb-3 pr-4 font-semibold">Property</th>
                  <th className="pb-3 pr-4 font-semibold">Offer amount</th>
                  <th className="pb-3 pr-4 font-semibold">Buyer</th>
                  <th className="pb-3 pr-4 font-semibold">Phone</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {recentOffers.length > 0 ? (
                  recentOffers.map((offer) => (
                    <tr key={offer.id}>
                      <td className="py-4 pr-4 font-medium text-white">
                        {offer.videoTour.title}
                      </td>
                      <td className="py-4 pr-4 text-white/72">
                        {offer.videoTour.property?.title ?? "—"}
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
                          status={offer.status.toLowerCase().replace("_", " ")}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-6 text-sm text-white/52" colSpan={6}>
                      No offers from property reels yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-white/40">
            <Link
              className="underline-offset-4 hover:text-[#f0cf79] hover:underline"
              href="/agent/dashboard"
            >
              Refresh dashboard
            </Link>{" "}
            to pull the latest offer activity.
          </p>
        </Card>
      </div>
    </div>
  );
}
