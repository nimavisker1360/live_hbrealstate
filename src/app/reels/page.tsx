import { Clapperboard, SlidersHorizontal } from "lucide-react";
import { LiveCard } from "@/components/live/LiveCard";
import { Button } from "@/components/ui/Button";
import { getServerDictionary } from "@/lib/i18n/server";
import { getLiveSessionPreviewImage } from "@/lib/live-media";
import { prisma } from "@/lib/prisma";
import type { LiveTour } from "@/types/platform";

export const dynamic = "force-dynamic";

function formatPrice(
  price: { toString(): string } | null | undefined,
  currency: string,
  locale: string,
  priceOnRequest: string,
) {
  if (!price) {
    return priceOnRequest;
  }

  const amount = Number(price.toString());

  if (!Number.isFinite(amount)) {
    return `${currency} ${price.toString()}`;
  }

  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function formatPublishedAt(createdAt: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
  }).format(createdAt);
}

export default async function PropertyReelsPage() {
  const { locale, t } = await getServerDictionary();

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
      duration: t.common.propertyReelBadge,
      id: reel.id,
      image: getLiveSessionPreviewImage({
        propertyImage: reel.property.image,
      }),
      location: reel.property.location,
      price: formatPrice(
        reel.property.price,
        reel.property.currency,
        locale,
        t.common.priceOnRequest,
      ),
      propertyId: reel.propertyId,
      roomId: reel.slug,
      startsAt: formatPublishedAt(reel.publishedAt ?? reel.createdAt, locale),
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
            {t.reels.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
            {t.reels.title}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/62">
            {t.reels.subtitle}
          </p>
        </div>
        <Button variant="secondary">
          <SlidersHorizontal aria-hidden className="size-4" />
          {t.reels.filters}
        </Button>
      </div>

      {tours.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.04] px-6 py-12 text-center text-white/55">
          {t.reels.empty}
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tours.map((tour) => (
            <LiveCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </div>
  );
}
