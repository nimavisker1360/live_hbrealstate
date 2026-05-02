import { Radio, SlidersHorizontal } from "lucide-react";
import { LiveCard } from "@/components/live/LiveCard";
import { Button } from "@/components/ui/Button";
import { liveTours } from "@/data/mock";

export default function LiveToursPage() {
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
        {liveTours.map((tour) => (
          <LiveCard key={tour.id} tour={tour} />
        ))}
      </div>
    </div>
  );
}
