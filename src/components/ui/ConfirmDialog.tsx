"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, X } from "lucide-react";

export function ConfirmDialog({
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
  isDangerous = false,
}: {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="relative w-full max-w-sm rounded-lg border border-white/15 bg-[#0a0a0a] shadow-2xl"
        role="alertdialog"
        tabIndex={-1}
      >
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute right-4 top-4 text-white/40 transition hover:text-white disabled:cursor-not-allowed"
          aria-label="Close dialog"
        >
          <X className="size-5" />
        </button>

        <div className="flex gap-4 p-6">
          {isDangerous && (
            <div className="mt-1 flex shrink-0 items-center justify-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="size-5 text-red-400" />
              </div>
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">
              {description}
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-md border border-white/15 bg-white/5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isDangerous
                ? "border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/16"
                : "border border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79] hover:bg-[#d6b15f]/16"
            }`}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
