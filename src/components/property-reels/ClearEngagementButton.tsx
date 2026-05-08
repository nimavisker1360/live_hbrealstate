"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ApiResult = {
  data?: {
    commentsDeleted: number;
    likesDeleted: number;
  };
  error?: { message?: string };
};

export function ClearEngagementButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function clearEngagement() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/engagement", { method: "DELETE" });
      const json = (await response.json().catch(() => null)) as ApiResult | null;

      if (!response.ok) {
        throw new Error(
          json?.error?.message ?? `Delete failed (${response.status}).`,
        );
      }

      setIsOpen(false);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete likes and comments.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-red-100 transition hover:bg-red-500/16 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isDeleting}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Trash2 aria-hidden className="size-4" />
        Delete all
      </button>

      {error ? (
        <p className="mt-2 text-xs text-red-200">{error}</p>
      ) : null}

      <ConfirmDialog
        cancelText="Cancel"
        confirmText="Delete all"
        description="This permanently deletes every reel and live like/comment from the database and resets reel like/comment counters to zero."
        isDangerous
        isLoading={isDeleting}
        isOpen={isOpen}
        onCancel={() => {
          if (!isDeleting) {
            setIsOpen(false);
          }
        }}
        onConfirm={clearEngagement}
        title="Delete all likes and comments"
      />
    </>
  );
}
