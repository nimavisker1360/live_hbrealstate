import { notFound } from "next/navigation";
import { LiveRoomScreen } from "@/components/live/LiveRoomScreen";
import { liveTours, properties } from "@/data/mock";
import type { LiveTour, Property } from "@/types/platform";

type RoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

const FALLBACK_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80";

function getDatabaseStatus(status: LiveTour["status"]) {
  if (status === "Live") {
    return "LIVE" as const;
  }

  if (status === "Ended") {
    return "ENDED" as const;
  }

  return "SCHEDULED" as const;
}

function getTourStatus(status: "SCHEDULED" | "LIVE" | "ENDED") {
  if (status === "LIVE") {
    return "Live" as const;
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

export default async function LiveRoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;
  const mockTour = liveTours.find((item) => item.roomId === roomId);
  let tour: LiveTour | undefined = mockTour;
  let property = mockTour
    ? properties.find((item) => item.id === mockTour.propertyId)
    : undefined;
  let databaseLiveSessionId: string | undefined;
  let playbackId: string | null | undefined;
  let startsAt: string | null | undefined;
  let streamProvider: string | null | undefined;
  let streamStatus: "SCHEDULED" | "LIVE" | "ENDED" = tour
    ? getDatabaseStatus(tour.status)
    : "SCHEDULED";

  if (tour) {
    try {
      const { ensureMockContext } = await import("@/lib/db-defaults");
      const { liveSession } = await ensureMockContext({
        agentName: tour.agent,
        propertyId: property?.id ?? tour.propertyId,
        propertyTitle: property?.title ?? tour.title,
        propertyLocation: property?.location ?? tour.location,
        roomId: tour.roomId,
        sessionTitle: tour.title,
        status: getDatabaseStatus(tour.status),
      });

      databaseLiveSessionId = liveSession?.id;
      playbackId = liveSession?.playbackId;
      startsAt = liveSession?.startsAt?.toISOString() ?? null;
      streamProvider = liveSession?.streamProvider;
      streamStatus = liveSession?.status ?? streamStatus;
    } catch (error) {
      console.warn("Live room is running without database context.", error);
    }
  } else {
    const { prisma } = await import("@/lib/prisma");
    const liveSession = await prisma.liveSession.findUnique({
      where: { roomId },
      include: {
        agent: { select: { name: true } },
        property: true,
      },
    });

    if (!liveSession) {
      notFound();
    }

    property = {
      baths: 0,
      beds: 0,
      id: liveSession.property.id,
      image: liveSession.property.image ?? FALLBACK_PROPERTY_IMAGE,
      location: liveSession.property.location,
      price: formatPrice(liveSession.property.price, liveSession.property.currency),
      sqft: "",
      tags: [],
      title: liveSession.property.title,
    } satisfies Property;
    tour = {
      agent: liveSession.agent.name,
      duration: "Live session",
      id: liveSession.id,
      image: property.image,
      location: property.location,
      price: property.price,
      propertyId: property.id,
      roomId: liveSession.roomId,
      startsAt: formatStartsAt(liveSession.startsAt),
      status: getTourStatus(liveSession.status),
      title: liveSession.title,
      viewers: liveSession.viewers,
    };
    databaseLiveSessionId = liveSession.id;
    playbackId = liveSession.playbackId;
    startsAt = liveSession.startsAt?.toISOString() ?? null;
    streamProvider = liveSession.streamProvider;
    streamStatus = liveSession.status;
  }

  if (!tour) {
    notFound();
  }

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
