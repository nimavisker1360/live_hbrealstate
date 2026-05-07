"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function SessionDeleteButton({
  liveSessionId,
}: {
  liveSessionId: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteSession() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/live-sessions/${encodeURIComponent(liveSessionId)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Could not delete property reel.");
      }

      setIsConfirmOpen(false);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not delete property reel.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-400/30 bg-red-500/10 px-2.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/16 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
        disabled={isDeleting}
        onClick={() => setIsConfirmOpen(true)}
        type="button"
      >
        <Trash2 aria-hidden className="size-4" />
        {isDeleting ? "Deleting" : "Delete"}
      </button>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        isLoading={isDeleting}
        isDangerous
        title="Delete property reel"
        description="This will permanently remove this property reel and all associated data. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={deleteSession}
        onCancel={() => {
          setIsConfirmOpen(false);
          setError(null);
        }}
      />

      {error && (
        <div className="mt-2 rounded-md border border-red-400/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-200">{error}</p>
        </div>
      )}
    </>
  );
}
