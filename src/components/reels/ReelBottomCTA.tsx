"use client";

import { CalendarCheck, Info, MessageSquare } from "lucide-react";
import { useTranslation } from "@/lib/i18n/client";

type ReelBottomCTAProps = {
  whatsappUrl: string;
  onBook: () => void;
  onDetails: () => void;
};

export function ReelBottomCTA({
  whatsappUrl,
  onBook,
  onDetails,
}: ReelBottomCTAProps) {
  const t = useTranslation();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black via-black/70 to-transparent pb-[max(env(safe-area-inset-bottom),1rem)] pt-12">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 px-4">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#25d366] text-sm font-semibold text-black shadow-lg shadow-[#25d366]/25 transition hover:bg-[#1ebe57]"
        >
          <MessageSquare className="size-4" />
          {t.reelViewer.whatsapp}
        </a>
        <button
          type="button"
          onClick={onBook}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#d6b15f] text-sm font-semibold text-black shadow-lg shadow-[#d6b15f]/25 transition hover:bg-[#f0cf79]"
        >
          <CalendarCheck className="size-4" />
          {t.reelViewer.book}
        </button>
        <button
          type="button"
          onClick={onDetails}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
        >
          <Info className="size-4" />
          {t.reelViewer.details}
        </button>
      </div>
    </div>
  );
}
