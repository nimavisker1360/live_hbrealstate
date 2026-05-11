import { ArrowRight, BadgeCheck, Building2, Clapperboard } from "lucide-react";
import { LiveCard } from "@/components/live/LiveCard";
import { PropertyCard } from "@/components/property/PropertyCard";
import { CTAButtons } from "@/components/sections/CTAButtons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getServerDictionary } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import type { LiveTour } from "@/types/platform";

export const dynamic = "force-dynamic";

const FALLBACK_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80";

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

export default async function Home() {
  const { locale, t } = await getServerDictionary();
  const intlLocale = locale === "tr" ? "tr-TR" : "en-US";

  const [propertyReels, allProperties] = await Promise.all([
    prisma.liveSession.findMany({
      select: {
        agent: { select: { name: true } },
        createdAt: true,
        id: true,
        property: true,
        propertyId: true,
        recordingPlaybackId: true,
        roomId: true,
        viewers: true,
      },
      orderBy: { createdAt: "desc" },
      where: { recordingPlaybackId: { not: null } },
      take: 6,
    }),
    prisma.property.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const featuredTour = propertyReels[0]
    ? ({
        agent: propertyReels[0].agent.name,
        duration: t.common.propertyReelBadge,
        id: propertyReels[0].id,
        image: propertyReels[0].property.image ?? FALLBACK_PROPERTY_IMAGE,
        location: propertyReels[0].property.location,
        price: formatPrice(
          propertyReels[0].property.price,
          propertyReels[0].property.currency,
          locale,
          t.common.priceOnRequest,
        ),
        propertyId: propertyReels[0].propertyId,
        roomId: propertyReels[0].roomId,
        startsAt: propertyReels[0].createdAt
          ? new Intl.DateTimeFormat(intlLocale, { dateStyle: "short" }).format(
              new Date(propertyReels[0].createdAt),
            )
          : t.common.propertyReelBadge,
        status: "Available" as const,
        title: propertyReels[0].property.title,
        viewers: propertyReels[0].viewers,
      } satisfies LiveTour)
    : null;

  const platformMetrics = [
    {
      label: t.home.metricsReelsLabel,
      value: `${propertyReels.length}`,
      detail: t.home.metricsReelsDetail,
    },
    {
      label: t.home.metricsPropertiesLabel,
      value: `${allProperties.length}`,
      detail: t.home.metricsPropertiesDetail,
    },
    {
      label: t.home.metricsAgentsLabel,
      value: t.home.metricsAgentsValue,
      detail: t.home.metricsAgentsDetail,
    },
  ];

  return (
    <>
      <section className="relative min-h-[calc(100svh-73px)] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(0,0,0,0.92), rgba(0,0,0,0.58) 48%, rgba(0,0,0,0.18)), url('https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?auto=format&fit=crop&w=1800&q=80')",
          }}
        />
        <div className="relative mx-auto flex min-h-[calc(100svh-73px)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d6b15f]/35 bg-black/45 px-3 py-1 text-sm text-[#d6b15f] backdrop-blur">
              <Clapperboard aria-hidden className="size-4" />
              {t.home.badge}
            </div>
            <h1 className="text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              {t.home.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
              {t.home.subtitle}
            </p>
            <div className="mt-8">
              <CTAButtons />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
          {platformMetrics.map((metric) => (
            <div
              className="border-l border-[#d6b15f]/35 pl-4"
              key={metric.label}
            >
              <p className="text-sm text-white/50">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {metric.value}
              </p>
              <p className="mt-1 text-sm text-[#d6b15f]">{metric.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
            {t.home.featuredEyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            {t.home.featuredTitle}
          </h2>
          <p className="mt-4 leading-7 text-white/62">{t.home.featuredText}</p>
          <div className="mt-7 grid gap-3 text-sm text-white/70">
            <p className="flex items-center gap-3">
              <BadgeCheck aria-hidden className="size-5 text-[#d6b15f]" />
              {t.home.featurePoint1}
            </p>
            <p className="flex items-center gap-3">
              <Building2 aria-hidden className="size-5 text-[#d6b15f]" />
              {t.home.featurePoint2}
            </p>
          </div>
          <Button className="mt-8" href="/reels" variant="secondary">
            {t.home.browseReels}
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
        {featuredTour && <LiveCard tour={featuredTour} />}
      </section>

      <section className="bg-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
                {t.home.signatureEyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                {t.home.signatureTitle}
              </h2>
            </div>
            <Button href="/reels" variant="ghost">
              {t.home.watchPropertyReels}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {allProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={{
                  id: property.id,
                  title: property.title,
                  location: property.location,
                  price: formatPrice(
                    property.price,
                    property.currency,
                    locale,
                    t.common.priceOnRequest,
                  ),
                  beds: 0,
                  baths: 0,
                  sqft: "",
                  image: property.image ?? FALLBACK_PROPERTY_IMAGE,
                  tags: [],
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
              {t.home.launchEyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              {t.home.launchTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-white/62">{t.home.launchText}</p>
          </div>
          <CTAButtons />
        </Card>
      </section>
    </>
  );
}
