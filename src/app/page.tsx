import { ArrowRight, BadgeCheck, Building2, SignalHigh } from "lucide-react";
import { redirect } from "next/navigation";
import { LiveCard } from "@/components/live/LiveCard";
import { PropertyCard } from "@/components/property/PropertyCard";
import { CTAButtons } from "@/components/sections/CTAButtons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { liveTours, platformMetrics, properties } from "@/data/mock";

type HomeProps = {
  searchParams?: Promise<{
    token?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const featuredTour = liveTours.find((tour) => tour.featured) ?? liveTours[0];
  const params = await searchParams;
  const token = Array.isArray(params?.token) ? params?.token[0] : params?.token;

  if (token) {
    redirect(`/live/${featuredTour.roomId}?token=${encodeURIComponent(token)}`);
  }

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
        <LiveCard tour={featuredTour} />
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
            {properties.map((property) => (
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
