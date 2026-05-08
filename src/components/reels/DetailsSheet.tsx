"use client";

/* eslint-disable @next/next/no-img-element */
import { MapPin, Phone } from "lucide-react";
import { BottomSheet } from "./BottomSheet";

type DetailsSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string | null;
  property: { title: string; location: string; price: string };
  agent: {
    name: string;
    displayName?: string;
    image?: string;
    phone?: string;
    specialty?: string;
  };
};

export function DetailsSheet({
  open,
  onClose,
  title,
  description,
  property,
  agent,
}: DetailsSheetProps) {
  const agentName = agent.displayName ?? agent.name;

  return (
    <BottomSheet open={open} onClose={onClose} title="Details" heightClass="h-[75vh]">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
          {property.price}
        </p>
        <h3 className="mt-1 text-2xl font-semibold text-white">
          {property.title}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/65">
          <MapPin className="size-4" />
          {property.location}
        </p>

        {title && title !== property.title ? (
          <p className="mt-3 text-sm text-white/80">{title}</p>
        ) : null}

        {description ? (
          <div className="mt-5 whitespace-pre-line text-sm leading-relaxed text-white/80">
            {description}
          </div>
        ) : (
          <p className="mt-5 text-sm text-white/55">
            Reach out to your consultant for the full property dossier.
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">
            Your consultant
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="size-12 overflow-hidden rounded-full border-2 border-[#d6b15f]/60 bg-black/40">
              {agent.image ? (
                <img
                  alt={agentName}
                  src={agent.image}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#d6b15f]/20 text-sm font-bold text-[#d6b15f]">
                  {agentName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{agentName}</p>
              {agent.specialty ? (
                <p className="text-xs text-white/55">{agent.specialty}</p>
              ) : null}
            </div>
          </div>
          {agent.phone ? (
            <a
              href={`tel:${agent.phone.replace(/\s/g, "")}`}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <Phone className="size-4" />
              {agent.phone}
            </a>
          ) : null}
        </div>
      </div>
    </BottomSheet>
  );
}
