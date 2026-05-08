"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type ApiResult = {
  error?: { message?: string };
};

export function PropertyDeleteButton({
  propertyId,
  propertyTitle,
  reelCount,
}: {
  propertyId: string;
  propertyTitle: string;
  reelCount: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteProperty() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/properties/${encodeURIComponent(propertyId)}`,
        { method: "DELETE" },
      );
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
          : "Could not delete property.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        aria-label={`Delete ${propertyTitle}`}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 text-xs font-semibold text-red-100 transition hover:bg-red-500/16 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isDeleting}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Trash2 aria-hidden className="size-4" />
        Delete
      </button>

      {error ? (
        <p className="mt-2 text-xs leading-5 text-red-200">{error}</p>
      ) : null}

      <ConfirmDialog
        cancelText="Cancel"
        confirmText="Delete"
        description={`This permanently removes "${propertyTitle}" from the website and database${
          reelCount > 0
            ? `, including ${reelCount} linked reel${reelCount === 1 ? "" : "s"}`
            : ""
        }. This action cannot be undone.`}
        isDangerous
        isLoading={isDeleting}
        isOpen={isOpen}
        onCancel={() => {
          if (!isDeleting) {
            setIsOpen(false);
          }
        }}
        onConfirm={deleteProperty}
        title="Delete property"
      />
    </>
  );
}
