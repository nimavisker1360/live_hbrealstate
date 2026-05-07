import { Clapperboard, SlidersHorizontal } from "lucide-react";
import { LiveCard } from "@/components/live/LiveCard";
import { Button } from "@/components/ui/Button";
import { getLiveSessionPreviewImage } from "@/lib/live-media";
import { prisma } from "@/lib/prisma";
import type { LiveTour } from "@/types/platform";

export const dynamic = "force-dynamic";

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

function formatPublishedAt(createdAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(createdAt);
}

export default async function PropertyReelsPage() {
  const databaseReels = await prisma.videoTour.findMany({
    select: {
      agent: { select: { name: true } },
      createdAt: true,
      id: true,
      publishedAt: true,
      property: true,
      propertyId: true,
      slug: true,
      viewCount: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 24,
    where: { status: "PUBLISHED" },
  });
  const tours = databaseReels.map((reel) => {
    return {
      agent: reel.agent.name,
      duration: "Property reel",
      id: reel.id,
      image: getLiveSessionPreviewImage({
        propertyImage: reel.property.image,
      }),
      location: reel.property.location,
      price: formatPrice(reel.property.price, reel.property.currency),
      propertyId: reel.propertyId,
      roomId: reel.slug,
      startsAt: formatPublishedAt(reel.publishedAt ?? reel.createdAt),
      status: "Available" as const,
      title: reel.property.title,
      viewers: reel.viewCount,
    } satisfies LiveTour;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
            <Clapperboard aria-hidden className="size-4" />
            Property video tours
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
            Watch premium properties in vertical video.
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/62">
            Browse uploaded HB Real Estate property reels with buyer actions,
            WhatsApp contact, booking requests, offers, and property details.
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
