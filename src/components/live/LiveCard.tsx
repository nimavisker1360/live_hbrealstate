import Image from "next/image";
import { Clock, Eye, MapPin, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { LiveTour } from "@/types/platform";

export function LiveCard({ tour }: { tour: LiveTour }) {
  const isLive = tour.status === "Live";

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] min-h-64">
        <Image
          alt={tour.title}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          src={tour.image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full bg-black/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
            {tour.status}
          </span>
          {isLive ? (
            <span className="size-2 rounded-full bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.9)]" />
          ) : null}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-sm font-medium text-[#d6b15f]">{tour.price}</p>
          <h3 className="mt-1 text-xl font-semibold text-white">
            {tour.title}
          </h3>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 text-sm text-white/64">
          <p className="flex items-center gap-2">
            <MapPin aria-hidden className="size-4 text-[#d6b15f]" />
            {tour.location}
          </p>
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-2">
              <Eye aria-hidden className="size-4 text-[#d6b15f]" />
              {tour.viewers} viewers
            </span>
            <span className="flex items-center gap-2">
              <Clock aria-hidden className="size-4 text-[#d6b15f]" />
              {tour.startsAt}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/52">Hosted by {tour.agent}</p>
          <Button href={`/live/${tour.roomId}`} size="sm">
            <PlayCircle aria-hidden className="size-4" />
            Enter room
          </Button>
        </div>
      </div>
    </Card>
  );
}
