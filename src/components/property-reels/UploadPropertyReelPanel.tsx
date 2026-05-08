"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FileVideo,
  Home,
  UploadCloud,
} from "lucide-react";
import { AddPropertyForm } from "@/components/property-reels/AddPropertyForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type PropertyOption = {
  id: string;
  title: string;
  location: string;
};

type ConsultantOption = {
  id: string;
  image: string;
  name: string;
  specialty: string;
};

type UploadResponse = {
  data?: {
    id: string;
    slug: string;
    title: string;
    videoUrl: string;
  };
  error?: { message?: string };
};

type Tab = "property" | "reel";

const fieldClassName =
  "h-11 w-full rounded-md border border-white/10 bg-black/28 px-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18";

const ACCEPT = "video/mp4,video/quicktime,video/webm";
const LARGE_UPLOAD_THRESHOLD_BYTES = 10 * 1024 * 1024;

export function UploadPropertyReelPanel({
  consultants,
  properties,
}: {
  consultants: ConsultantOption[];
  properties: PropertyOption[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>(
    properties.length === 0 ? "property" : "reel",
  );

  const isPropertyActive = activeTab === "property";

  return (
    <Card className="p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
            {isPropertyActive ? "Add property" : "Upload reel"}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {isPropertyActive
              ? "Create a new property listing"
              : "Upload property reel"}
          </h2>
          <p className="mt-2 text-sm text-white/60">
            {isPropertyActive
              ? "Set the project name, location, price, and a cover photo. The cover is used as the thumbnail on Property reel cards."
              : "Add a new vertical video to a property listing. MP4, MOV, or WebM."}
          </p>
        </div>
        <span className="hidden size-11 shrink-0 items-center justify-center rounded-md border border-[#d6b15f]/25 bg-[#d6b15f]/10 text-[#d6b15f] sm:flex">
          {isPropertyActive ? (
            <Home aria-hidden className="size-5" />
          ) : (
            <UploadCloud aria-hidden className="size-5" />
          )}
        </span>
      </div>

      <div
        className="mb-5 inline-flex rounded-md border border-white/10 bg-black/28 p-1"
        role="tablist"
      >
        <TabButton
          active={isPropertyActive}
          icon={<Home aria-hidden className="size-4" />}
          label="Add property"
          onClick={() => setActiveTab("property")}
        />
        <TabButton
          active={!isPropertyActive}
          icon={<UploadCloud aria-hidden className="size-4" />}
          label="Upload reel"
          onClick={() => setActiveTab("reel")}
        />
      </div>

      {isPropertyActive ? (
        <AddPropertyForm consultants={consultants} />
      ) : (
        <UploadReelForm properties={properties} />
      )}
    </Card>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold uppercase tracking-[0.14em] transition",
        active
          ? "bg-[#d6b15f]/15 text-[#f0cf79]"
          : "text-white/55 hover:text-white",
      )}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function UploadReelForm({ properties }: { properties: PropertyOption[] }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadResponse["data"] | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploading) {
      return;
    }

    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const video = formData.get("video");
    const propertyId = formData.get("propertyId");
    const title = formData.get("title");
    const description = formData.get("description");

    if (!(video instanceof File) || video.size === 0) {
      setError("Choose a video file to upload.");
      return;
    }

    if (typeof propertyId !== "string" || !propertyId.trim()) {
      setError("Choose a property for this reel.");
      return;
    }

    if (typeof title !== "string" || title.trim().length < 2) {
      setError("Enter a reel title.");
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const result = await uploadReelWithProgress(
        {
          description: typeof description === "string" ? description : "",
          propertyId,
          title,
          video,
        },
        setProgress,
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSuccess(result.data);
      form.reset();
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload property reel.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
    >
      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Property
        </span>
        <select
          className={fieldClassName}
          defaultValue=""
          name="propertyId"
          required
        >
          <option disabled value="">
            {properties.length > 0
              ? "Select a property"
              : "No properties available — create one in the Add property tab"}
          </option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.title} — {property.location}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Reel title
        </span>
        <input
          className={fieldClassName}
          maxLength={160}
          minLength={2}
          name="title"
          placeholder="Sunset penthouse — 30s tour"
          required
          type="text"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Video file
        </span>
        <input
          accept={ACCEPT}
          className="block h-11 w-full cursor-pointer rounded-md border border-white/10 bg-black/28 px-3 text-sm text-white file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-[#d6b15f]/15 file:px-3 file:text-sm file:font-semibold file:text-[#f0cf79] hover:file:bg-[#d6b15f]/25"
          name="video"
          required
          type="file"
        />
      </label>

      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Description (optional)
        </span>
        <textarea
          className="min-h-[88px] w-full rounded-md border border-white/10 bg-black/28 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18"
          maxLength={2000}
          name="description"
          placeholder="Highlight features, neighborhood notes, or callouts buyers should see."
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button disabled={isUploading || properties.length === 0} type="submit">
          <FileVideo aria-hidden className="size-4" />
          {isUploading ? `Uploading… ${progress}%` : "Upload reel"}
        </Button>
        {properties.length === 0 ? (
          <p className="text-xs text-white/52">
            Add a property first to enable reel uploads.
          </p>
        ) : null}
      </div>

      {isUploading ? (
        <div className="md:col-span-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[#d6b15f] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="md:col-span-2">
          <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
            {error}
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="md:col-span-2">
          <div className="flex items-start gap-3 rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">
                Reel uploaded — “{success.title}”
              </p>
              <p className="mt-1 text-emerald-100/80">
                Saved as draft. Publish it from the table below when you are
                ready to make it visible.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function sanitizePathSegment(value: string) {
  return (
    value
      .replace(/\\/g, "/")
      .split("/")
      .pop()
      ?.trim()
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(0, 180) || "reel.mp4"
  );
}

async function uploadReelWithProgress(
  input: {
    description: string;
    propertyId: string;
    title: string;
    video: File;
  },
  onProgress: (percent: number) => void,
): Promise<
  | { ok: true; data: NonNullable<UploadResponse["data"]> }
  | { ok: false; message: string }
> {
  const pathname = [
    "property-reels",
    input.propertyId,
    `${crypto.randomUUID()}-${sanitizePathSegment(input.video.name)}`,
  ].join("/");

  try {
    const blob = await upload(pathname, input.video, {
      access: "public",
      clientPayload: JSON.stringify({ propertyId: input.propertyId }),
      contentType: input.video.type,
      handleUploadUrl: "/api/property-reels/client-upload",
      multipart: input.video.size > LARGE_UPLOAD_THRESHOLD_BYTES,
      onUploadProgress: (event) => {
        onProgress(Math.min(95, Math.round(event.percentage)));
      },
    });

    onProgress(98);

    const response = await fetch("/api/property-reels/complete", {
      body: JSON.stringify({
        blob: {
          pathname: blob.pathname,
          url: blob.url,
        },
        description: input.description.trim() || undefined,
        fileSize: input.video.size,
        mimeType: input.video.type,
        propertyId: input.propertyId,
        title: input.title.trim(),
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const parsed = (await response.json().catch(() => null)) as
      | UploadResponse
      | null;

    if (response.ok && parsed?.data) {
      onProgress(100);
      return { ok: true, data: parsed.data };
    }

    return {
      ok: false,
      message:
        parsed?.error?.message ??
        `Upload saved, but registration failed (status ${response.status || "unknown"}).`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not upload property reel.",
    };
  }
}
