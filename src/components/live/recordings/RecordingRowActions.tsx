"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type RecordingRowActionsProps = {
  canRetry: boolean;
  recordingId: string;
  title: string;
};

type BusyAction = "delete" | "retry" | null;

async function readActionResponse(response: Response) {
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Action failed.");
  }
}

export function RecordingRowActions({
  canRetry,
  recordingId,
  title,
}: RecordingRowActionsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState("");

  async function retryProcessing() {
    setBusyAction("retry");
    setError("");

    try {
      const response = await fetch(`/api/live-recordings/${recordingId}`, {
        method: "PATCH",
      });

      await readActionResponse(response);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not retry processing.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteMetadata() {
    const confirmed = window.confirm(
      `Delete metadata for "${title}"? The stored video file will not be deleted.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyAction("delete");
    setError("");

    try {
      const response = await fetch(`/api/live-recordings/${recordingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmMetadataDelete: true,
          deleteStorage: false,
        }),
      });

      await readActionResponse(response);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not delete metadata.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!canRetry || busyAction !== null}
          onClick={retryProcessing}
          size="sm"
          variant="secondary"
        >
          {busyAction === "retry" ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden className="size-4" />
          )}
          Retry
        </Button>
        <Button
          disabled={busyAction !== null}
          onClick={deleteMetadata}
          size="sm"
          variant="ghost"
        >
          {busyAction === "delete" ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Trash2 aria-hidden className="size-4" />
          )}
          Delete
        </Button>
      </div>
      {error ? <p className="max-w-48 text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
