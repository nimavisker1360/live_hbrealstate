"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlayCircle, Trash2 } from "lucide-react";

export function RecordingActions({
  canDelete,
  canWatch,
  liveSessionId,
  roomId,
}: {
  canDelete: boolean;
  canWatch: boolean;
  liveSessionId: string;
  roomId: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function deleteRecording() {
    if (
      !window.confirm(
        "Remove this recording from the dashboard and live list?",
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/live-sessions/${encodeURIComponent(liveSessionId)}/recording`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Could not delete recording.");
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Could not delete recording.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (!canDelete && !canWatch) {
    return <span className="text-xs text-white/42">Not ready</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canWatch ? (
        <Link
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d6b15f]/35 bg-[#d6b15f]/10 px-2.5 text-xs font-semibold text-[#f0cf79] transition hover:bg-[#d6b15f]/16 hover:text-white"
          href={`/live/${roomId}`}
        >
          <PlayCircle aria-hidden className="size-4" />
          Watch
        </Link>
      ) : null}
      {canDelete ? (
        <button
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-400/30 bg-red-500/10 px-2.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/16 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isDeleting}
          onClick={deleteRecording}
          type="button"
        >
          <Trash2 aria-hidden className="size-4" />
          {isDeleting ? "Deleting" : "Delete"}
        </button>
      ) : null}
    </div>
  );
}
