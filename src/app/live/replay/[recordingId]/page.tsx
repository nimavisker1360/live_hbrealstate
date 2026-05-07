import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  Building2,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react";
import {
  LiveRecordingStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { ReplayLeadForm } from "@/components/live/replay/ReplayLeadForm";
import { ReplayVideoPlayer } from "@/components/live/replay/ReplayVideoPlayer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { buildWhatsAppUrl, getConsultantByAgent } from "@/lib/hb-consultants";
import { FALLBACK_PROPERTY_IMAGE, getMuxThumbnailUrl } from "@/lib/live-media";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type ReplayPageProps = {
  params: Promise<{
    recordingId: string;
  }>;
};

const replayStatuses: LiveRecordingStatus[] = [
  LiveRecordingStatus.READY,
  LiveRecordingStatus.UPLOADED,
];

const liveRecordingReplayInclude = {
  property: {
    include: {
      agent: {
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              picture: true,
            },
          },
        },
      },
    },
  },
  stream: {
    include: {
      agent: {
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              picture: true,
            },
          },
        },
      },
      property: true,
    },
  },
  user: {
    include: {
      agent: {
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              picture: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.LiveRecordingInclude;

type LiveRecordingReplay = Prisma.LiveRecordingGetPayload<{
  include: typeof liveRecordingReplayInclude;
}>;

const getRecording = cache(
  (recordingId: string): Promise<LiveRecordingReplay | null> =>
  prisma.liveRecording.findFirst({
    where: {
      id: recordingId,
      status: { in: replayStatuses },
    },
    include: liveRecordingReplayInclude,
  }),
);

async function getRelatedProperties({
  agentId,
  propertyId,
}: {
  agentId?: string | null;
  propertyId?: string | null;
}) {
  if (!agentId) {
    return [];
  }

  return prisma.property.findMany({
    where: {
      agentId,
      ...(propertyId ? { id: { not: propertyId } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });
}

function formatPrice(
  price: { toString(): string } | null | undefined,
  currency = "USD",
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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getResolvedReplay(recording: LiveRecordingReplay | null) {
  if (!recording) {
    return null;
  }

  const property = recording.property ?? recording.stream?.property ?? null;
  const agent =
    recording.stream?.agent ??
    recording.property?.agent ??
    recording.user.agent ??
    null;
  const consultant = getConsultantByAgent(agent ?? undefined);
  const agentName = agent?.name ?? recording.user.name;
  const title =
    recording.title ??
    recording.stream?.title ??
    property?.title ??
    recording.fileName;
  const poster = recording.playbackId
    ? getMuxThumbnailUrl(recording.playbackId)
    : property?.image || FALLBACK_PROPERTY_IMAGE;
  const description = property
    ? `Replay of ${property.title} in ${property.location} with ${agentName}.`
    : `Replay of ${title} with ${agentName}.`;

  return {
    agent,
    agentName,
    consultant,
    description,
    poster,
    property,
    title,
  };
}

export async function generateMetadata({
  params,
}: ReplayPageProps): Promise<Metadata> {
  const { recordingId } = await params;
  const recording = await getRecording(recordingId);
  const replay = getResolvedReplay(recording);

  if (!recording || !replay) {
    return {
      title: "Replay not found | HB Live",
    };
  }

  const canonical = `/live/replay/${recording.id}`;

  return {
    title: `${replay.title} | HB Live Replay`,
    description: replay.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${replay.title} | HB Live Replay`,
      description: replay.description,
      images: [
        {
          alt: replay.title,
          url: replay.poster,
        },
      ],
      type: "video.other",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      description: replay.description,
      images: [replay.poster],
      title: `${replay.title} | HB Live Replay`,
    },
  };
}

export default async function LiveReplayPage({ params }: ReplayPageProps) {
  const { recordingId } = await params;
  const recording = await getRecording(recordingId);
  const replay = getResolvedReplay(recording);

  if (!recording || !replay) {
    notFound();
  }

  const relatedProperties = await getRelatedProperties({
    agentId: replay.agent?.id,
    propertyId: replay.property?.id,
  });
  const whatsappUrl = buildWhatsAppUrl({
    text: `Hello ${replay.agentName}, I watched the HB Live replay for ${replay.property?.title ?? replay.title}. Please send details.`,
    whatsapp:
      replay.consultant?.whatsapp ??
      replay.agent?.user?.phone ??
      recording.user.phone,
  });
  const canonicalUrl = absoluteUrl(`/live/replay/${recording.id}`);
  const contentUrl = recording.playbackId
    ? `https://stream.mux.com/${recording.playbackId}.m3u8`
    : recording.storageUrl;
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    contentUrl: contentUrl ?? undefined,
    description: replay.description,
    embedUrl: canonicalUrl,
    name: replay.title,
    thumbnailUrl: [absoluteUrl(replay.poster)],
    uploadDate: (recording.uploadedAt ?? recording.createdAt).toISOString(),
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        type="application/ld+json"
      />
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_390px] lg:px-8">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
              HB Live replay
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal text-white sm:text-5xl">
              {replay.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
              {replay.description}
            </p>
          </div>

          <ReplayVideoPlayer
            playbackId={recording.playbackId}
            poster={replay.poster}
            storageUrl={recording.storageUrl}
            title={replay.title}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              icon={<Building2 aria-hidden className="size-5" />}
              label="Property"
              title={replay.property?.title ?? "Private listing"}
            >
              {replay.property ? (
                <>
                  <p className="mt-2 flex items-center gap-2 text-sm text-white/62">
                    <MapPin aria-hidden className="size-4 text-[#d6b15f]" />
                    {replay.property.location}
                  </p>
                  <p className="mt-3 text-xl font-semibold text-[#f0cf79]">
                    {formatPrice(replay.property.price, replay.property.currency)}
                  </p>
                  {replay.property.description ? (
                    <p className="mt-3 text-sm leading-6 text-white/56">
                      {replay.property.description}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-sm text-white/58">
                  This replay is not linked to a public property yet.
                </p>
              )}
            </InfoCard>

            <InfoCard
              icon={<UserRound aria-hidden className="size-5" />}
              label="Advisor"
              title={replay.agentName}
            >
              <p className="mt-2 text-sm text-white/62">
                {replay.consultant?.specialty ??
                  replay.agent?.company ??
                  "HB Real Estate advisor"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button href={whatsappUrl} rel="noreferrer" target="_blank">
                  <MessageCircle aria-hidden className="size-4" />
                  WhatsApp
                </Button>
                {replay.consultant?.phone ?? replay.agent?.user?.phone ? (
                  <Button
                    href={`tel:${replay.consultant?.phone ?? replay.agent?.user?.phone}`}
                    variant="secondary"
                  >
                    <Phone aria-hidden className="size-4" />
                    Call
                  </Button>
                ) : null}
              </div>
            </InfoCard>
          </div>

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d6b15f]">
                  Related properties
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  More from this advisor
                </h2>
              </div>
              <Link
                className="text-sm font-medium text-[#f0cf79] hover:text-white"
                href="/live"
              >
                View live tours
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {relatedProperties.length > 0 ? (
                relatedProperties.map((property) => (
                  <RelatedPropertyCard
                    image={property.image}
                    key={property.id}
                    location={property.location}
                    price={formatPrice(property.price, property.currency)}
                    title={property.title}
                  />
                ))
              ) : (
                <Card className="p-4 text-sm text-white/56 sm:col-span-3">
                  More HB listings will appear here as they become available.
                </Card>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d6b15f]">
              Private inquiry
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Request details
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Share your interest and an HB advisor will follow up with the
              next step.
            </p>
            <div className="mt-5">
              <ReplayLeadForm
                agentId={replay.agent?.id}
                agentName={replay.agentName}
                propertyId={replay.property?.id}
                propertyLocation={replay.property?.location ?? "Istanbul"}
                propertyTitle={replay.property?.title ?? replay.title}
                roomId={recording.stream?.roomId}
              />
            </div>
          </Card>

          <Card className="p-4 text-sm leading-6 text-white/58">
            <p className="font-semibold text-white">Archive details</p>
            <p className="mt-2">Uploaded {formatDate(recording.createdAt)}</p>
            <p>Status: {recording.status.toLowerCase()}</p>
          </Card>
        </aside>
      </section>
    </main>
  );
}

function InfoCard({
  children,
  icon,
  label,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#d6b15f]/30 bg-[#d6b15f]/10 text-[#f0cf79]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
            {label}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      {children}
    </Card>
  );
}

function RelatedPropertyCard({
  image,
  location,
  price,
  title,
}: {
  image?: string | null;
  location: string;
  price: string;
  title: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          "h-32 bg-cover bg-center",
          !image && "bg-gradient-to-br from-white/12 to-white/[0.03]",
        )}
        style={image ? { backgroundImage: `url(${image})` } : undefined}
      />
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 line-clamp-1 text-xs text-white/52">{location}</p>
        <p className="mt-2 text-sm font-semibold text-[#f0cf79]">{price}</p>
      </div>
    </Card>
  );
}
