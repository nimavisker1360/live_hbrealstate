"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  FileVideo,
  Home,
  LinkIcon,
  ListChecks,
  Plus,
  UploadCloud,
  UserRoundCheck,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { HbConsultant } from "@/lib/hb-consultants";
import { cn } from "@/lib/utils";

type PropertyOption = {
  id: string;
  location: string;
  title: string;
};

type CreatedReel = {
  id: string;
  property: PropertyOption;
  reelPageUrl: string;
  roomId: string;
  title: string;
  videoUrl: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

const fieldClassName =
  "h-11 w-full rounded-md border border-white/10 bg-black/28 px-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18";

export function CreateLiveSessionButton({
  consultants,
  properties,
}: {
  consultants: HbConsultant[];
  properties: PropertyOption[];
}) {
  const [propertyMode, setPropertyMode] = useState<"existing" | "new">(
    "existing",
  );
  const [propertyOptions, setPropertyOptions] = useState(properties);
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties[0]?.id ?? "",
  );
  const [selectedConsultantId, setSelectedConsultantId] = useState(
    consultants[0]?.id ?? "",
  );
  const [newPropertyLocation, setNewPropertyLocation] = useState("");
  const [newPropertyTitle, setNewPropertyTitle] = useState("");
  const [newPropertyDescription, setNewPropertyDescription] = useState("");
  const [newPropertyImage, setNewPropertyImage] = useState("");
  const [newPropertyImagePreview, setNewPropertyImagePreview] = useState("");
  const [reelTitle, setReelTitle] = useState(
    properties[0] ? `${properties[0].title} Property Reel` : "",
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [createdReel, setCreatedReel] = useState<CreatedReel | null>(null);
  const [copiedValue, setCopiedValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const isUploadingRef = useRef(false);

  const selectedProperty = useMemo(
    () => propertyOptions.find((property) => property.id === selectedPropertyId),
    [propertyOptions, selectedPropertyId],
  );
  const selectedConsultant = useMemo(
    () =>
      consultants.find((consultant) => consultant.id === selectedConsultantId) ??
      consultants[0],
    [consultants, selectedConsultantId],
  );

  function handlePropertyChange(propertyId: string) {
    setSelectedPropertyId(propertyId);
    const property = propertyOptions.find((item) => item.id === propertyId);

    if (property && !reelTitle.trim()) {
      setReelTitle(`${property.title} Property Reel`);
    }
  }

  function selectExistingPropertyMode() {
    setPropertyMode("existing");

    if (selectedProperty && !reelTitle.trim()) {
      setReelTitle(`${selectedProperty.title} Property Reel`);
    }
  }

  function selectNewPropertyMode() {
    setPropertyMode("new");

    if (
      selectedProperty &&
      reelTitle === `${selectedProperty.title} Property Reel`
    ) {
      setReelTitle("");
    }
  }

  function handleNewPropertyTitleChange(value: string) {
    setNewPropertyTitle(value);

    if (!reelTitle.trim()) {
      setReelTitle(value ? `${value} Property Reel` : "");
    }
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxWidth = 800;
        const maxHeight = 600;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);

        const compressedUrl = canvas.toDataURL("image/jpeg", 0.8);
        setNewPropertyImage(compressedUrl);
        setNewPropertyImagePreview(compressedUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function uploadReel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUploadingRef.current) {
      return;
    }

    isUploadingRef.current = true;
    setErrorMessage("");
    setIsUploading(true);

    try {
      const property =
        propertyMode === "existing"
          ? selectedProperty
          : {
              id: "",
              location: newPropertyLocation.trim(),
              title: newPropertyTitle.trim(),
            };

      if (!property?.title || !property.location) {
        throw new Error("Choose a property or enter the new property details.");
      }

      if (!videoFile) {
        throw new Error("Choose a property video to upload.");
      }

      const formData = new FormData();
      formData.set("agentId", selectedConsultant?.id ?? "");
      formData.set("agentName", selectedConsultant?.name ?? "HB Real Estate");
      formData.set(
        "propertyId",
        propertyMode === "existing" ? property.id : "",
      );
      formData.set("propertyLocation", property.location);
      formData.set("propertyTitle", property.title);
      formData.set("title", reelTitle.trim());
      formData.set("video", videoFile);

      if (propertyMode === "new" && newPropertyDescription.trim()) {
        formData.set("propertyDescription", newPropertyDescription.trim());
      }

      if (propertyMode === "new" && newPropertyImage.trim()) {
        formData.set("propertyImage", newPropertyImage.trim());
      }

      const response = await fetch("/api/property-reels", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => ({}))) as ApiResponse<
        CreatedReel
      >;

      if (!response.ok || !body.data) {
        throw new Error(body.error?.message ?? "Could not upload property reel.");
      }

      setCreatedReel(body.data);

      if (!propertyOptions.some((item) => item.id === body.data?.property.id)) {
        setPropertyOptions((current) => [...current, body.data!.property]);
        setSelectedPropertyId(body.data.property.id);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not upload property reel.",
      );
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
    }
  }

  async function copyValue(label: string, value?: string | null) {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedValue(label);
    window.setTimeout(() => setCopiedValue(""), 1400);
  }

  return (
    <Card className="p-5">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form className="space-y-5" onSubmit={uploadReel}>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
              <ListChecks aria-hidden className="size-4" />
              Create Property Reel
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Upload a property video
            </h2>
            <p className="mt-2 text-sm font-medium text-white/72">
              Advisor:{" "}
              <span className="text-[#f0cf79]">
                {selectedConsultant?.name ?? "HB Real Estate"}
              </span>
            </p>
            <div className="mt-4 grid gap-2 text-sm text-white/62 sm:grid-cols-4">
              <StepPill step="1" text="Choose advisor" />
              <StepPill step="2" text="Choose property" />
              <StepPill step="3" text="Add video" />
              <StepPill step="4" text="Publish reel" />
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-black/18 p-4">
            <StepLabel number="1" title="Consultant" />
            <label className="mt-3 block">
              <span className="text-sm font-medium text-white/72">
                Select lead advisor
              </span>
              <select
                className={cn(fieldClassName, "mt-2")}
                onChange={(event) => setSelectedConsultantId(event.target.value)}
                value={selectedConsultantId}
              >
                {consultants.map((consultant) => (
                  <option key={consultant.id} value={consultant.id}>
                    {consultant.name} - {consultant.specialty}
                  </option>
                ))}
              </select>
            </label>
            {selectedConsultant ? (
              <div className="mt-3 flex items-center gap-3 rounded-md border border-[#d6b15f]/22 bg-[#d6b15f]/8 p-3">
                <img
                  alt={selectedConsultant.name}
                  className="size-12 rounded-md object-cover"
                  src={selectedConsultant.image}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {selectedConsultant.name}
                  </p>
                  <p className="truncate text-xs text-white/58">
                    WhatsApp: {selectedConsultant.whatsapp}
                  </p>
                </div>
                <UserRoundCheck
                  aria-hidden
                  className="ml-auto size-5 shrink-0 text-[#d6b15f]"
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-white/10 bg-black/18 p-4">
            <StepLabel number="2" title="Property" />
            <div className="mt-3 grid grid-cols-2 rounded-md border border-white/10 bg-black/22 p-1">
              <ModeButton
                active={propertyMode === "existing"}
                icon={<Home aria-hidden className="size-4" />}
                label="Existing"
                onClick={selectExistingPropertyMode}
              />
              <ModeButton
                active={propertyMode === "new"}
                icon={<Plus aria-hidden className="size-4" />}
                label="New"
                onClick={selectNewPropertyMode}
              />
            </div>

            {propertyMode === "existing" ? (
              <label className="mt-4 block">
                <span className="text-sm font-medium text-white/72">
                  Select from your properties
                </span>
                <select
                  className={cn(fieldClassName, "mt-2")}
                  onChange={(event) => handlePropertyChange(event.target.value)}
                  value={selectedPropertyId}
                >
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title} - {property.location}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-white/72">
                      Property name
                    </span>
                    <input
                      className={cn(fieldClassName, "mt-2")}
                      onChange={(event) =>
                        handleNewPropertyTitleChange(event.target.value)
                      }
                      placeholder="Bebek Hill Residence"
                      type="text"
                      value={newPropertyTitle}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-white/72">
                      Location
                    </span>
                    <input
                      className={cn(fieldClassName, "mt-2")}
                      onChange={(event) =>
                        setNewPropertyLocation(event.target.value)
                      }
                      placeholder="Istanbul, Turkey"
                      type="text"
                      value={newPropertyLocation}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-white/72">
                    Cover image
                  </span>
                  <input
                    accept="image/*"
                    className="hidden"
                    id="property-image-upload"
                    onChange={handleImageUpload}
                    type="file"
                  />
                  <label
                    className="mt-2 flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-white/20 bg-white/[0.02] p-6 transition hover:border-[#d6b15f]/50 hover:bg-[#d6b15f]/5"
                    htmlFor="property-image-upload"
                  >
                    {newPropertyImagePreview ? (
                      <img
                        alt="Cover preview"
                        className="max-h-32 max-w-full rounded"
                        src={newPropertyImagePreview}
                      />
                    ) : (
                      <span className="text-sm text-white/62">
                        Select an image
                      </span>
                    )}
                  </label>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-white/72">
                    Property description
                  </span>
                  <textarea
                    className={cn(fieldClassName, "mt-2 min-h-24 resize-none py-3")}
                    onChange={(event) =>
                      setNewPropertyDescription(event.target.value)
                    }
                    placeholder="Key features, amenities, and buyer notes."
                    value={newPropertyDescription}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="rounded-md border border-white/10 bg-black/18 p-4">
            <StepLabel number="3" title="Reel video" />
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_0.9fr]">
              <label className="block">
                <span className="text-sm font-medium text-white/72">
                  Reel title
                </span>
                <input
                  className={cn(fieldClassName, "mt-2")}
                  onChange={(event) => setReelTitle(event.target.value)}
                  placeholder="Bosphorus view walkthrough"
                  required
                  type="text"
                  value={reelTitle}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-white/72">
                  Video file
                </span>
                <input
                  accept="video/mp4,video/quicktime,video/webm"
                  className={cn(fieldClassName, "mt-2 file:mr-3 file:h-8 file:rounded file:border-0 file:bg-[#d6b15f] file:px-3 file:text-sm file:font-semibold file:text-black")}
                  onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                  required
                  type="file"
                />
              </label>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-md border border-[#d6b15f]/22 bg-[#d6b15f]/8 p-4">
            <StepLabel number="4" title="Publish" />
            <p className="mt-2 text-sm leading-6 text-white/56">
              The video is uploaded to Vercel Blob and published as a vertical
              property reel for buyers.
            </p>
            <Button
              className="mt-4 w-full sm:w-auto"
              disabled={isUploading}
              type="submit"
            >
              <UploadCloud aria-hidden className="size-4" />
              {isUploading ? "Uploading reel..." : "Upload property reel"}
            </Button>
          </div>
        </form>

        <div className="rounded-md border border-white/10 bg-black/22 p-4">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Published reel</p>
              <p className="mt-1 text-sm text-white/52">
                {createdReel
                  ? createdReel.title
                  : "Upload a video to create a buyer-facing reel."}
              </p>
            </div>
            {createdReel ? (
              <span className="inline-flex h-7 w-fit items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 text-xs font-semibold text-emerald-100">
                Published
              </span>
            ) : null}
          </div>

          {createdReel ? (
            <div className="mt-4 space-y-3">
              <InstructionRow
                copied={copiedValue === "reelPage"}
                icon={<LinkIcon aria-hidden className="size-4" />}
                label="Reel link"
                onCopy={() => copyValue("reelPage", createdReel.reelPageUrl)}
                value={createdReel.reelPageUrl}
              />
              <InstructionRow
                copied={copiedValue === "videoUrl"}
                icon={<FileVideo aria-hidden className="size-4" />}
                label="Video URL"
                onCopy={() => copyValue("videoUrl", createdReel.videoUrl)}
                value={createdReel.videoUrl}
              />
              <Link
                className="inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-md border border-[#d6b15f]/35 bg-[#d6b15f]/10 px-4 text-sm font-semibold text-[#f0cf79] transition hover:bg-[#d6b15f]/16 hover:text-white"
                href={`/reels/${createdReel.roomId}`}
              >
                <ExternalLink aria-hidden className="size-4" />
                Open property reel
              </Link>
            </div>
          ) : (
            <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-white/12 bg-white/[0.025] px-6 text-center">
              <FileVideo aria-hidden className="size-9 text-[#d6b15f]" />
              <p className="mt-4 text-sm font-semibold text-white">
                Upload details will appear here
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/52">
                Agents can record property videos offline on their phone, then
                upload the finished file here.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function StepPill({ step, text }: { step: string; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className="flex size-6 items-center justify-center rounded-full bg-[#d6b15f] text-xs font-bold text-black">
        {step}
      </span>
      <span className="font-medium text-white/72">{text}</span>
    </div>
  );
}

function StepLabel({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-full bg-[#d6b15f] text-sm font-bold text-black">
        {number}
      </span>
      <p className="text-sm font-semibold text-white">{title}</p>
    </div>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded px-3 text-sm font-semibold transition",
        active
          ? "bg-[#d6b15f] text-black"
          : "text-white/62 hover:bg-white/[0.06] hover:text-white",
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function InstructionRow({
  copied,
  icon,
  label,
  onCopy,
  value,
}: {
  copied: boolean;
  icon: ReactNode;
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[92px_1fr_36px] items-center gap-2">
      <span className="flex items-center gap-2 text-xs font-medium text-white/58">
        {icon}
        {label}
      </span>
      <code className="min-w-0 truncate rounded-md border border-white/10 bg-white/[0.06] px-2 py-2 text-xs text-white/78">
        {value}
      </code>
      <button
        aria-label={`Copy ${label}`}
        className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/12 hover:text-white"
        onClick={onCopy}
        type="button"
      >
        {copied ? (
          <Check aria-hidden className="size-4 text-[#f0cf79]" />
        ) : (
          <Copy aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );
}
