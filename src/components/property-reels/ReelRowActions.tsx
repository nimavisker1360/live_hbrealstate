"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Eye,
  PencilLine,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Status = "DRAFT" | "PROCESSING" | "PUBLISHED" | "ARCHIVED";

type Reel = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  videoUrl: string;
};

type ApiResult = {
  ok: boolean;
  message?: string;
};

const baseAction =
  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55";

export function ReelRowActions({ reel }: { reel: Reel }) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState<null | "publish" | "delete" | "edit">(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const isPublished = reel.status === "PUBLISHED";

  async function togglePublish() {
    setIsWorking("publish");
    setError(null);

    const result = await callJson(
      `/api/property-reels/${encodeURIComponent(reel.id)}/publish`,
      { method: "POST", body: JSON.stringify({ publish: !isPublished }) },
    );

    setIsWorking(null);

    if (!result.ok) {
      setError(result.message ?? "Could not update reel status.");
      return;
    }

    router.refresh();
  }

  async function deleteReel() {
    setIsWorking("delete");
    setError(null);

    const result = await callJson(
      `/api/property-reels/${encodeURIComponent(reel.id)}`,
      { method: "DELETE" },
    );

    setIsWorking(null);

    if (!result.ok) {
      setError(result.message ?? "Could not delete reel.");
      return;
    }

    setIsConfirmDeleteOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        className={`${baseAction} border-white/15 bg-white/[0.06] text-white hover:border-[#d6b15f]/70 hover:bg-[#d6b15f]/10`}
        href={reel.videoUrl}
        rel="noreferrer"
        target="_blank"
      >
        <Eye aria-hidden className="size-4" />
        Watch
      </a>

      <button
        className={`${baseAction} ${
          isPublished
            ? "border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/16"
            : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/16"
        }`}
        disabled={isWorking !== null}
        onClick={togglePublish}
        type="button"
      >
        {isPublished ? (
          <>
            <Undo2 aria-hidden className="size-4" />
            {isWorking === "publish" ? "Updating…" : "Unpublish"}
          </>
        ) : (
          <>
            <Send aria-hidden className="size-4" />
            {isWorking === "publish" ? "Updating…" : "Publish"}
          </>
        )}
      </button>

      <button
        className={`${baseAction} border-white/15 bg-white/[0.06] text-white hover:border-[#d6b15f]/70 hover:bg-[#d6b15f]/10`}
        disabled={isWorking !== null}
        onClick={() => setIsEditOpen(true)}
        type="button"
      >
        <PencilLine aria-hidden className="size-4" />
        Edit
      </button>

      <button
        className={`${baseAction} border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/16 hover:text-white`}
        disabled={isWorking !== null}
        onClick={() => setIsConfirmDeleteOpen(true)}
        type="button"
      >
        <Trash2 aria-hidden className="size-4" />
        Delete
      </button>

      {error ? (
        <p className="basis-full text-xs text-red-200">{error}</p>
      ) : null}

      <ConfirmDialog
        cancelText="Cancel"
        confirmText="Delete"
        description={`This will permanently remove "${reel.title}" and its video file. This action cannot be undone.`}
        isDangerous
        isLoading={isWorking === "delete"}
        isOpen={isConfirmDeleteOpen}
        onCancel={() => {
          if (isWorking !== "delete") {
            setIsConfirmDeleteOpen(false);
          }
        }}
        onConfirm={deleteReel}
        title="Delete property reel"
      />

      <EditReelDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaved={() => {
          setIsEditOpen(false);
          router.refresh();
        }}
        reel={reel}
      />
    </div>
  );
}

function EditReelDialog({
  isOpen,
  onClose,
  onSaved,
  reel,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  reel: Reel;
}) {
  const [title, setTitle] = useState(reel.title);
  const [description, setDescription] = useState(reel.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  async function save() {
    setIsSaving(true);
    setError(null);

    const result = await callJson(
      `/api/property-reels/${encodeURIComponent(reel.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
        }),
      },
    );

    setIsSaving(false);

    if (!result.ok) {
      setError(result.message ?? "Could not save reel.");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg border border-white/15 bg-[#0a0a0a] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">Edit reel</h2>
        <p className="mt-1 text-sm text-white/60">
          Update the title or description shown to buyers.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
              Title
            </span>
            <input
              className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/28 px-3 text-sm text-white outline-none focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18"
              maxLength={160}
              minLength={2}
              onChange={(event) => setTitle(event.target.value)}
              type="text"
              value={title}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
              Description
            </span>
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-md border border-white/10 bg-black/28 px-3 py-2 text-sm text-white outline-none focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18"
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-red-400/30 bg-red-500/10 p-2.5 text-xs text-red-100">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            className="h-10 rounded-md border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-10 rounded-md bg-[#d6b15f] px-4 text-sm font-semibold text-black transition hover:bg-[#f0cf79] disabled:opacity-50"
            disabled={isSaving || title.trim().length < 2}
            onClick={save}
            type="button"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

async function callJson(
  url: string,
  init: { method: string; body?: string },
): Promise<ApiResult> {
  try {
    const response = await fetch(url, {
      method: init.method,
      body: init.body,
      headers: init.body
        ? { "content-type": "application/json" }
        : undefined,
    });

    if (response.ok) {
      return { ok: true };
    }

    let message = `Request failed (${response.status}).`;

    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };

      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // ignore JSON parse error
    }

    return { ok: false, message };
  } catch (networkError) {
    return {
      ok: false,
      message:
        networkError instanceof Error
          ? networkError.message
          : "Network error.",
    };
  }
}
