import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LiveRoomScreen } from "@/components/live/LiveRoomScreen";
import { getConsultantByAgent } from "@/lib/hb-consultants";
import { getLiveSessionPreviewImage, isInlineImageSrc } from "@/lib/live-media";
import { prisma } from "@/lib/prisma";
import type { LiveTour, Property } from "@/types/platform";

type RoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

function getTourStatus(
  status: "SCHEDULED" | "LIVE" | "ENDED",
  hasRecording = false,
) {
  if (status === "LIVE") {
    return "Live" as const;
  }

  if (hasRecording) {
    return "Recorded" as const;
  }

  if (status === "ENDED") {
    return "Ended" as const;
  }

  return "Scheduled" as const;
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

function formatStartsAt(startsAt: Date | null) {
  if (!startsAt) {
    return "Scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(startsAt);
}

const getLiveSession = cache((roomId: string) =>
  prisma.liveSession.findUnique({
    where: { roomId },
    include: {
      agent: { select: { id: true, name: true } },
      property: true,
    },
  }),
);

export async function generateMetadata({
  params,
}: RoomPageProps): Promise<Metadata> {
  const { roomId } = await params;
  const liveSession = await getLiveSession(roomId);

  if (!liveSession) {
    return {
      title: "Live room not found | HB Live",
    };
  }

  const previewImage = getLiveSessionPreviewImage({
    propertyImage: liveSession.property.image,
    recordingPlaybackId: liveSession.recordingPlaybackId,
    recordingStatus: liveSession.recordingStatus,
    status: liveSession.status,
  });
  const title = `${liveSession.property.title} | HB Live`;
  const description = `Watch ${liveSession.property.title} in ${liveSession.property.location} with ${liveSession.agent.name}.`;
  const images = isInlineImageSrc(previewImage)
    ? undefined
    : [
        {
          alt: liveSession.property.title,
          url: previewImage,
        },
      ];

  return {
    title,
    description,
    alternates: {
      canonical: `/live/${roomId}`,
    },
    openGraph: {
      title,
      description,
      images,
      type: "website",
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      description,
      images,
      title,
    },
  };
}

export default async function LiveRoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;

  const liveSession = await getLiveSession(roomId);

  if (!liveSession) {
    notFound();
  }

  const previewImage = getLiveSessionPreviewImage({
    propertyImage: liveSession.property.image,
    recordingPlaybackId: liveSession.recordingPlaybackId,
    recordingStatus: liveSession.recordingStatus,
    status: liveSession.status,
  });
  const consultant = getConsultantByAgent(liveSession.agent);

  const property = {
    baths: 0,
    beds: 0,
    id: liveSession.property.id,
    image: previewImage,
    location: liveSession.property.location,
    price: formatPrice(liveSession.property.price, liveSession.property.currency),
    sqft: "",
    tags: [],
    title: liveSession.property.title,
  } satisfies Property;

  const tour = {
    agent: liveSession.agent.name,
    agentId: liveSession.agent.id,
    agentImage: consultant?.image,
    agentPhone: consultant?.phone,
    agentSpecialty: consultant?.specialty,
    agentWhatsapp: consultant?.whatsapp,
    duration: "Live session",
    id: liveSession.id,
    image: property.image,
    location: property.location,
    price: property.price,
    propertyId: property.id,
    roomId: liveSession.roomId,
    startsAt: formatStartsAt(liveSession.startsAt),
    status: getTourStatus(
      liveSession.status,
      liveSession.recordingStatus !== "deleted" &&
        Boolean(liveSession.recordingPlaybackId),
    ),
    title: liveSession.title,
    viewers: liveSession.viewers,
  } satisfies LiveTour;

  const databaseLiveSessionId = liveSession.id;
  const playbackId =
    liveSession.status !== "LIVE" &&
    liveSession.recordingStatus !== "deleted" &&
    liveSession.recordingPlaybackId
      ? liveSession.recordingPlaybackId
      : liveSession.playbackId;
  const startsAt = liveSession.startsAt?.toISOString() ?? null;
  const streamProvider = liveSession.streamProvider;
  const streamStatus =
    liveSession.status !== "LIVE" &&
    liveSession.recordingStatus !== "deleted" &&
    liveSession.recordingPlaybackId
      ? "ENDED"
      : liveSession.status;

  return (
    <LiveRoomScreen
      databaseLiveSessionId={databaseLiveSessionId}
      property={property}
      stream={{
        playbackId: playbackId ?? null,
        provider: streamProvider ?? null,
        startsAt: startsAt ?? null,
        status: streamStatus,
      }}
      tour={tour}
    />
  );
}
