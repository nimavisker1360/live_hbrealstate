import Image from "next/image";
import { Bath, BedDouble, MapPin, Ruler } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Property } from "@/types/platform";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3]">
        <Image
          alt={property.title}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          src={property.image}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-4">
          <p className="text-lg font-semibold text-white">{property.price}</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-semibold text-white">{property.title}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-white/58">
            <MapPin aria-hidden className="size-4 text-[#d6b15f]" />
            {property.location}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm text-white/68">
          <span className="flex items-center gap-2">
            <BedDouble aria-hidden className="size-4 text-[#d6b15f]" />
            {property.beds}
          </span>
          <span className="flex items-center gap-2">
            <Bath aria-hidden className="size-4 text-[#d6b15f]" />
            {property.baths}
          </span>
          <span className="flex items-center gap-2">
            <Ruler aria-hidden className="size-4 text-[#d6b15f]" />
            {property.sqft}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {property.tags.map((tag) => (
            <span
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/58"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
