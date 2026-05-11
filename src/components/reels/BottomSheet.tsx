"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  heightClass?: string;
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  heightClass = "h-[70vh]",
}: BottomSheetProps) {
  const t = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 transition pointer-events-none",
        open && "pointer-events-auto",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 z-0 bg-black/55 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        className={cn(
          "pointer-events-auto absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-[480px] flex-col rounded-t-3xl border-t border-white/10 bg-[#0c0a09] text-white shadow-[0_-20px_60px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out will-change-transform",
          heightClass,
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <div className="flex flex-1 flex-col items-center">
            <span className="mb-2 h-1 w-10 rounded-full bg-white/25" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/85">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.reelViewer.closeLabel}
            className="ml-2 inline-flex size-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
