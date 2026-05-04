"use client";

import Link from "next/link";
import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  Home,
  KeyRound,
  LinkIcon,
  ListChecks,
  Smartphone,
  Plus,
  Radio,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type PropertyOption = {
  id: string;
  location: string;
  title: string;
};

type CreatedLiveSession = {
  id: string;
  ingestUrl?: string;
  livePageUrl: string;
  property: PropertyOption;
  roomId: string;
  rtmpUrl?: string;
  startsAt: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  streamKey: string | null;
  title: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

const fieldClassName =
  "h-11 w-full rounded-md border border-white/10 bg-black/28 px-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18";

const statusStyles: Record<CreatedLiveSession["status"], string> = {
  ENDED: "border-white/15 bg-white/[0.06] text-white/62",
  LIVE: "border-red-400/35 bg-red-500/12 text-red-100",
  SCHEDULED: "border-violet-300/30 bg-violet-400/10 text-violet-100",
};

function formatStatus(status: CreatedLiveSession["status"]) {
  return status.toLowerCase();
}

function getFriendlyErrorMessage(message: string) {
  if (message.toLowerCase().includes("free plan")) {
    return "Mux Live Streaming is not enabled for this Mux account. Use a Mux account with Live Streaming enabled, then try again.";
  }

  return message;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

function toTimeInputValue(date: Date) {
  return [padDatePart(date.getHours()), padDatePart(date.getMinutes())].join(
    ":",
  );
}

function getDefaultSchedule() {
  const nextHour = new Date();

  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

  return {
    date: toDateInputValue(nextHour),
    time: toTimeInputValue(nextHour),
  };
}

function getLocalDateTime(date: string, time: string) {
  if (!date || !time) {
    return null;
  }

  const startsAt = new Date(`${date}T${time}:00`);

  return Number.isNaN(startsAt.getTime()) ? null : startsAt;
}

export function CreateLiveSessionButton({
  properties,
}: {
  properties: PropertyOption[];
}) {
  const defaultSchedule = useMemo(() => getDefaultSchedule(), []);
  const [propertyMode, setPropertyMode] = useState<"existing" | "new">(
    "existing",
  );
  const [propertyOptions, setPropertyOptions] = useState(properties);
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties[0]?.id ?? "",
  );
  const [newPropertyLocation, setNewPropertyLocation] = useState("");
  const [newPropertyTitle, setNewPropertyTitle] = useState("");
  const [newPropertyDescription, setNewPropertyDescription] = useState("");
  const [newPropertyImage, setNewPropertyImage] = useState("");
  const [newPropertyImagePreview, setNewPropertyImagePreview] = useState("");
  const [liveTitle, setLiveTitle] = useState(
    properties[0] ? `${properties[0].title} Live Tour` : "",
  );
  const [scheduledDate, setScheduledDate] = useState(defaultSchedule.date);
  const [scheduledTime, setScheduledTime] = useState(defaultSchedule.time);
  const [createdSession, setCreatedSession] =
    useState<CreatedLiveSession | null>(null);
  const [copiedValue, setCopiedValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedProperty = useMemo(
    () => propertyOptions.find((property) => property.id === selectedPropertyId),
    [propertyOptions, selectedPropertyId],
  );

  function handlePropertyChange(propertyId: string) {
    setSelectedPropertyId(propertyId);
    const property = propertyOptions.find((item) => item.id === propertyId);

    if (property && !liveTitle.trim()) {
      setLiveTitle(`${property.title} Live Tour`);
    }
  }

  function selectExistingPropertyMode() {
    setPropertyMode("existing");

    if (selectedProperty && !liveTitle.trim()) {
      setLiveTitle(`${selectedProperty.title} Live Tour`);
    }
  }

  function selectNewPropertyMode() {
    setPropertyMode("new");

    if (selectedProperty && liveTitle === `${selectedProperty.title} Live Tour`) {
      setLiveTitle("");
    }
  }

  function handleNewPropertyTitleChange(value: string) {
    setNewPropertyTitle(value);

    if (!liveTitle.trim()) {
      setLiveTitle(value ? `${value} Live Tour` : "");
    }
  }

  function setQuickSchedule(hoursFromNow: number) {
    const date = new Date();

    date.setHours(date.getHours() + hoursFromNow, 0, 0, 0);
    setScheduledDate(toDateInputValue(date));
    setScheduledTime(toTimeInputValue(date));
  }

  function setTomorrowMorning() {
    const date = new Date();

    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
    setScheduledDate(toDateInputValue(date));
    setScheduledTime(toTimeInputValue(date));
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setNewPropertyImage(dataUrl);
      setNewPropertyImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function createLiveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsCreating(true);

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

      if (!scheduledDate || !scheduledTime) {
        throw new Error("Scheduled date and time are required.");
      }

      const startsAt = getLocalDateTime(scheduledDate, scheduledTime);

      if (!startsAt) {
        throw new Error("Scheduled date and time are invalid.");
      }

      const response = await fetch("/api/live-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: propertyMode === "existing" ? property.id : undefined,
          propertyLocation: property.location,
          propertyTitle: property.title,
          ...(propertyMode === "new" && newPropertyDescription && { propertyDescription: newPropertyDescription.trim() }),
          ...(propertyMode === "new" && newPropertyImage && { propertyImage: newPropertyImage.trim() }),
          startsAt: startsAt.toISOString(),
          title: liveTitle.trim(),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiResponse<
        CreatedLiveSession
      >;

      if (!response.ok || !body.data) {
        throw new Error(body.error?.message ?? "Could not create live session.");
      }

      setCreatedSession(body.data);

      if (!propertyOptions.some((item) => item.id === body.data?.property.id)) {
        setPropertyOptions((current) => [...current, body.data!.property]);
        setSelectedPropertyId(body.data.property.id);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? getFriendlyErrorMessage(error.message)
          : "Could not create live session.",
      );
    } finally {
      setIsCreating(false);
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
        <form className="space-y-5" onSubmit={createLiveSession}>
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b15f]">
              <ListChecks aria-hidden className="size-4" />
              Create New Live
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Set up a live tour
            </h2>
            <div className="mt-4 grid gap-2 text-sm text-white/62 sm:grid-cols-3">
              <StepPill step="1" text="Choose property" />
              <StepPill step="2" text="Pick time" />
              <StepPill step="3" text="Create stream" />
            </div>
          </div>

          <div className="rounded-md border border-white/10 bg-black/18 p-4">
            <StepLabel number="1" title="Property" />
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
                    Preview image (optional)
                  </span>
                  <div className="mt-2">
                    <input
                      accept="image/*"
                      className="hidden"
                      id="property-image-upload"
                      onChange={handleImageUpload}
                      type="file"
                    />
                    <label
                      className="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-white/20 bg-white/[0.02] p-6 transition hover:border-[#d6b15f]/50 hover:bg-[#d6b15f]/5"
                      htmlFor="property-image-upload"
                    >
                      <div className="text-center">
                        {newPropertyImagePreview ? (
                          <>
                            <img
                              alt="Preview"
                              className="mx-auto max-h-32 max-w-full rounded"
                              src={newPropertyImagePreview}
                            />
                            <p className="mt-2 text-xs text-white/62">
                              Click to change image
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-white/72">
                              📸 Click to upload or drag & drop
                            </p>
                            <p className="mt-1 text-xs text-white/48">
                              PNG, JPG up to 5MB
                            </p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-white/72">
                    Property description (optional)
                  </span>
                  <textarea
                    className={cn(fieldClassName, "mt-2 resize-none")}
                    onChange={(event) =>
                      setNewPropertyDescription(event.target.value)
                    }
                    placeholder="Describe the property, features, amenities, etc."
                    rows={3}
                    value={newPropertyDescription}
                  />
                  <p className="mt-1 text-xs text-white/48">
                    Max 2000 characters
                  </p>
                </label>
              </div>
            )}
          </div>

          <div className="rounded-md border border-white/10 bg-black/18 p-4">
            <StepLabel number="2" title="Title and time" />
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_0.9fr]">
              <label className="block">
                <span className="text-sm font-medium text-white/72">
                  Live title
                </span>
                <input
                  className={cn(fieldClassName, "mt-2")}
                  onChange={(event) => setLiveTitle(event.target.value)}
                  placeholder="Evening live tour"
                  required
                  type="text"
                  value={liveTitle}
                />
              </label>
              <div>
                <span className="text-sm font-medium text-white/72">
                  Start time
                </span>
                <div className="mt-2 grid grid-cols-[1fr_116px] gap-2">
                  <input
                    className={fieldClassName}
                    onChange={(event) => setScheduledDate(event.target.value)}
                    required
                    type="date"
                    value={scheduledDate}
                  />
                  <input
                    className={fieldClassName}
                    onChange={(event) => setScheduledTime(event.target.value)}
                    required
                    type="time"
                    value={scheduledTime}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <QuickScheduleButton onClick={() => setQuickSchedule(1)}>
                    In 1 hour
                  </QuickScheduleButton>
                  <QuickScheduleButton onClick={() => setQuickSchedule(3)}>
                    In 3 hours
                  </QuickScheduleButton>
                  <QuickScheduleButton onClick={setTomorrowMorning}>
                    Tomorrow 10:00
                  </QuickScheduleButton>
                </div>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-md border border-[#d6b15f]/22 bg-[#d6b15f]/8 p-4">
            <StepLabel number="3" title="Create stream instructions" />
            <p className="mt-2 text-sm leading-6 text-white/56">
              This creates the Mux stream and gives you the RTMP URL, stream key,
              and live page link.
            </p>
            <Button
              className="mt-4 w-full sm:w-auto"
              disabled={isCreating}
              type="submit"
            >
              <Plus aria-hidden className="size-4" />
              {isCreating ? "Creating stream..." : "Create live session"}
            </Button>
          </div>
        </form>

        <div className="rounded-md border border-white/10 bg-black/22 p-4">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                Stream instructions
              </p>
              <p className="mt-1 text-sm text-white/52">
                {createdSession
                  ? createdSession.title
                  : "Create a session to generate stream credentials."}
              </p>
            </div>
            {createdSession ? (
              <span
                className={cn(
                  "inline-flex h-7 w-fit items-center rounded-full border px-2.5 text-xs font-semibold capitalize",
                  statusStyles[createdSession.status],
                )}
              >
                {formatStatus(createdSession.status)}
              </span>
            ) : null}
          </div>

          {createdSession ? (
            <div className="mt-4 space-y-3">
              <InstructionRow
                copied={copiedValue === "rtmp"}
                icon={<Radio aria-hidden className="size-4" />}
                label="RTMP URL"
                onCopy={() =>
                  copyValue(
                    "rtmp",
                    createdSession.rtmpUrl ?? createdSession.ingestUrl,
                  )
                }
                value={createdSession.rtmpUrl ?? createdSession.ingestUrl ?? ""}
              />
              <InstructionRow
                copied={copiedValue === "streamKey"}
                icon={<KeyRound aria-hidden className="size-4" />}
                label="Stream Key"
                onCopy={() => copyValue("streamKey", createdSession.streamKey)}
                value={createdSession.streamKey ?? "Pending"}
              />
              <InstructionRow
                copied={copiedValue === "livePage"}
                icon={<LinkIcon aria-hidden className="size-4" />}
                label="Live page link"
                onCopy={() => copyValue("livePage", createdSession.livePageUrl)}
                value={createdSession.livePageUrl}
              />
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                  <p className="flex items-center gap-2 text-xs text-white/48">
                    <CalendarClock aria-hidden className="size-4" />
                    Scheduled
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {formatDateTime(createdSession.startsAt)}
                  </p>
                </div>
                <Link
                  className="inline-flex h-full min-h-16 items-center justify-center gap-2 rounded-md border border-[#d6b15f]/35 bg-[#d6b15f]/10 px-4 text-sm font-semibold text-[#f0cf79] transition hover:bg-[#d6b15f]/16 hover:text-white"
                  href={`/live/${createdSession.roomId}`}
                >
                  <ExternalLink aria-hidden className="size-4" />
                  Open live page
                </Link>
              </div>
              <div className="rounded-md border border-[#d6b15f]/24 bg-[#d6b15f]/8 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Smartphone aria-hidden className="size-4 text-[#d6b15f]" />
                  Mobile agent setup
                </p>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-white/62">
                  <li>1. Install Larix Broadcaster or another RTMP app.</li>
                  <li>2. Create a new RTMP connection in the app.</li>
                  <li>3. Paste RTMP URL into the app URL/server field.</li>
                  <li>4. Paste Stream Key into the stream key field.</li>
                  <li>5. Start streaming, then share the live page link.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-white/12 bg-white/[0.025] px-6 text-center">
              <Radio aria-hidden className="size-9 text-[#d6b15f]" />
              <p className="mt-4 text-sm font-semibold text-white">
                Stream details will appear here
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/52">
                After step 3, copy the RTMP URL and stream key into OBS or your
                streaming app. The live page link is for buyers.
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

function QuickScheduleButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="h-8 rounded-md border border-white/10 bg-white/[0.05] px-2.5 text-xs font-semibold text-white/62 transition hover:border-[#d6b15f]/45 hover:bg-[#d6b15f]/10 hover:text-white"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
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
    <div className="grid grid-cols-[124px_1fr_36px] items-center gap-2">
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
