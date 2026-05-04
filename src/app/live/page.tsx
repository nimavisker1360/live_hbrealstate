import { Radio, SlidersHorizontal } from "lucide-react";
import { LiveCard } from "@/components/live/LiveCard";
import { Button } from "@/components/ui/Button";
import { liveTours } from "@/data/mock";
import { prisma } from "@/lib/prisma";
import type { LiveTour } from "@/types/platform";

export const dynamic = "force-dynamic";

const FALLBACK_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80";

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

function formatStartsAt(startsAt: Date | null, status: LiveTour["status"]) {
  if (status === "Live") {
    return "Now";
  }

  if (!startsAt) {
    return status === "Recorded" ? "Replay" : "Scheduled";
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(startsAt);

  return status === "Recorded" ? `Recorded ${formatted}` : formatted;
}

function getTourStatus(
  status: "SCHEDULED" | "LIVE" | "ENDED",
  hasRecording: boolean,
) {
  if (status === "LIVE") {
    return "Live";
  }

  if (status === "ENDED") {
    return hasRecording ? "Recorded" : "Ended";
  }

  return "Scheduled";
}

export default async function LiveToursPage() {
  const databaseLiveTours = await prisma.liveSession.findMany({
    include: {
      agent: { select: { name: true } },
      property: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 24,
  });
  const tours =
    databaseLiveTours.length > 0
      ? databaseLiveTours.map((session) => {
          const status = getTourStatus(
            session.status,
            Boolean(session.recordingPlaybackId),
          );

          return {
            agent: session.agent.name,
            duration: status === "Recorded" ? "Replay" : "Live session",
            id: session.id,
            image: session.property.image ?? FALLBACK_PROPERTY_IMAGE,
            location: session.property.location,
            price: formatPrice(session.property.price, session.property.currency),
            propertyId: session.propertyId,
            roomId: session.roomId,
            startsAt: formatStartsAt(session.startsAt, status),
            status,
            title: session.property.title,
            viewers: session.viewers,
          } satisfies LiveTour;
        })
      : liveTours;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
            <Radio aria-hidden className="size-4" />
            Live property tours
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
            Join premium tours as they happen.
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/62">
            Browse active, upcoming, and scheduled HB Real Estate showings with
            agent-led walkthroughs and buyer Q&A.
          </p>
        </div>
        <Button variant="secondary">
          <SlidersHorizontal aria-hidden className="size-4" />
          Filters
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tours.map((tour) => (
          <LiveCard key={tour.id} tour={tour} />
        ))}
      </div>
    </div>
  );
}
