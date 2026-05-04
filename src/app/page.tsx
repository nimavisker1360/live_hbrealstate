import { ArrowRight, BadgeCheck, Building2, SignalHigh } from "lucide-react";
import { LiveCard } from "@/components/live/LiveCard";
import { PropertyCard } from "@/components/property/PropertyCard";
import { CTAButtons } from "@/components/sections/CTAButtons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

export default async function Home() {
  const [liveSessions, allProperties] = await Promise.all([
    prisma.liveSession.findMany({
      include: { agent: { select: { name: true } }, property: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.property.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const featuredTour = liveSessions[0]
    ? ({
        agent: liveSessions[0].agent.name,
        duration: "Live session",
        id: liveSessions[0].id,
        image: liveSessions[0].property.image ?? FALLBACK_PROPERTY_IMAGE,
        location: liveSessions[0].property.location,
        price: formatPrice(
          liveSessions[0].property.price,
          liveSessions[0].property.currency,
        ),
        propertyId: liveSessions[0].propertyId,
        roomId: liveSessions[0].roomId,
        startsAt: liveSessions[0].startsAt
          ? new Intl.DateTimeFormat("en-US", { dateStyle: "short" }).format(
              new Date(liveSessions[0].startsAt),
            )
          : "Scheduled",
        status: liveSessions[0].status === "LIVE" ? ("Live" as const) : ("Scheduled" as const),
        title: liveSessions[0].property.title,
        viewers: liveSessions[0].viewers,
      } satisfies LiveTour)
    : null;

  const platformMetrics = [
    { label: "Live tours", value: `${liveSessions.length}`, detail: "Active sessions" },
    { label: "Properties", value: `${allProperties.length}`, detail: "In inventory" },
    { label: "Premium agents", value: "25+", detail: "On platform" },
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
              <SignalHigh aria-hidden className="size-4" />
              Live premium property tours
            </div>
            <h1 className="text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              HB Live
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
              A web-based live viewing platform for HB Real Estate, built for
              private launches, remote buyers, and high-touch agent-led tours.
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
            Featured room
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Walk buyers through every premium detail in real time.
          </h2>
          <p className="mt-4 leading-7 text-white/62">
            HB Live gives agents a polished front door for scheduled tours,
            buyer questions, property highlights, and follow-up demand.
          </p>
          <div className="mt-7 grid gap-3 text-sm text-white/70">
            <p className="flex items-center gap-3">
              <BadgeCheck aria-hidden className="size-5 text-[#d6b15f]" />
              Mock live room experience ready for streaming integration.
            </p>
            <p className="flex items-center gap-3">
              <Building2 aria-hidden className="size-5 text-[#d6b15f]" />
              Property-first design for luxury real estate inventory.
            </p>
          </div>
          <Button className="mt-8" href="/live" variant="secondary">
            Browse all live tours
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
                Signature listings
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Curated homes ready for live presentation.
              </h2>
            </div>
            <Button href="/live" variant="ghost">
              Watch live tours
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {allProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d6b15f]">
              Built for launch
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              Initial HB Live structure is ready for product development.
            </h2>
            <p className="mt-3 max-w-2xl text-white/62">
              App Router pages, typed mock data, reusable UI components, and
              responsive dark luxury styling are prepared for the next phase.
            </p>
          </div>
          <CTAButtons />
        </Card>
      </section>
    </>
  );
}
