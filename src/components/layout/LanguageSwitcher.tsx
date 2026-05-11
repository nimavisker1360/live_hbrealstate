"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/client";
import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT_LABELS,
  type Locale,
} from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pick(next: Locale) {
    setOpen(false);

    if (next !== locale) {
      setLocale(next);
    }
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.06] px-3 text-sm font-semibold text-white transition hover:border-[#d6b15f]/70 hover:bg-[#d6b15f]/10"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Globe aria-hidden className="size-4 text-[#d6b15f]" />
        {LOCALE_SHORT_LABELS[locale]}
      </button>

      {open ? (
        <ul
          className="absolute right-0 z-50 mt-2 min-w-40 overflow-hidden rounded-md border border-white/12 bg-[#0b0b0b] py-1 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          role="listbox"
        >
          {LOCALES.map((value) => (
            <li key={value}>
              <button
                aria-selected={value === locale}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-white/[0.07]",
                  value === locale ? "text-white" : "text-white/70",
                )}
                onClick={() => pick(value)}
                role="option"
                type="button"
              >
                {LOCALE_LABELS[value]}
                {value === locale ? (
                  <Check aria-hidden className="size-4 text-[#d6b15f]" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
