"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CheckCircle2, ChevronDown, Home, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type ConsultantOption = {
  id: string;
  image: string;
  name: string;
  specialty: string;
};

type CreatedProperty = {
  id: string;
  title: string;
  location: string;
  image: string | null;
};

type ApiResponse = {
  data?: CreatedProperty;
  error?: { message?: string };
};

const fieldClassName =
  "h-11 w-full rounded-md border border-white/10 bg-black/28 px-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp,image/avif";

const CURRENCIES = ["USD", "EUR", "GBP", "TRY", "AED"];

export function AddPropertyForm({
  consultants = [],
}: {
  consultants?: ConsultantOption[];
}) {
  const { t } = useLanguage();
  const tf = t.addPropertyForm;
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreatedProperty | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedConsultantId, setSelectedConsultantId] = useState("");
  const [isConsultantOpen, setIsConsultantOpen] = useState(false);
  const selectedConsultant =
    consultants.find((consultant) => consultant.id === selectedConsultantId) ??
    null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const cover = formData.get("coverImage");

    if (!(cover instanceof File) || cover.size === 0) {
      setError(tf.chooseCoverImage);
      return;
    }

    setIsSaving(true);
    setProgress(0);

    try {
      const result = await uploadWithProgress(formData, setProgress, t);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSuccess(result.data);
      form.reset();
      setSelectedConsultantId("");
      setIsConsultantOpen(false);
      setPreviewUrl(null);
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : tf.couldNotSave,
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!file) {
      setPreviewUrl(null);
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
    >
      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.projectName}
        </span>
        <input
          className={fieldClassName}
          maxLength={160}
          minLength={2}
          name="title"
          placeholder={tf.projectNamePlaceholder}
          required
          type="text"
        />
      </label>

      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.location}
        </span>
        <input
          className={fieldClassName}
          maxLength={160}
          minLength={2}
          name="location"
          placeholder={tf.locationPlaceholder}
          required
          type="text"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.price}
        </span>
        <input
          className={fieldClassName}
          name="price"
          placeholder={tf.pricePlaceholder}
          inputMode="decimal"
          pattern="\d+(\.\d{1,2})?"
          type="text"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.currency}
        </span>
        <select className={fieldClassName} defaultValue="USD" name="currency">
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.bedrooms}
        </span>
        <input
          className={fieldClassName}
          name="bedrooms"
          placeholder="3"
          inputMode="numeric"
          pattern="\d{1,3}"
          type="text"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.bathrooms}
        </span>
        <input
          className={fieldClassName}
          name="bathrooms"
          placeholder="2"
          inputMode="numeric"
          pattern="\d{1,3}"
          type="text"
        />
      </label>

      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.areaSqm}
        </span>
        <input
          className={fieldClassName}
          name="areaSquareMeters"
          placeholder="180"
          inputMode="numeric"
          pattern="\d{1,6}"
          type="text"
        />
      </label>

      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.consultant}
        </span>
        <input name="consultantId" type="hidden" value={selectedConsultantId} />
        <div className="relative">
          <button
            aria-expanded={isConsultantOpen}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-black px-3 py-2 text-left text-sm text-white outline-none transition focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18"
            onClick={() => setIsConsultantOpen((open) => !open)}
            type="button"
          >
            {selectedConsultant ? (
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-label={selectedConsultant.name}
                  className="size-9 shrink-0 rounded-full border border-[#d6b15f]/55 bg-cover bg-center bg-black/40"
                  role="img"
                  style={{ backgroundImage: `url('${selectedConsultant.image}')` }}
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {selectedConsultant.name}
                  </span>
                  <span className="block truncate text-xs text-white/52">
                    {selectedConsultant.specialty}
                  </span>
                </span>
              </span>
            ) : (
              <span className="text-white">{tf.useAccountConsultant}</span>
            )}
            <ChevronDown
              aria-hidden
              className={`size-4 shrink-0 text-white/55 transition ${
                isConsultantOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isConsultantOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 max-h-80 overflow-y-auto rounded-md border border-[#d6b15f]/30 bg-black shadow-2xl shadow-black/60">
              <button
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-white transition hover:bg-[#d6b15f]/12"
                onClick={() => {
                  setSelectedConsultantId("");
                  setIsConsultantOpen(false);
                }}
                type="button"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-[#f0cf79]">
                  HB
                </span>
                <span className="font-semibold">
                  {tf.useAccountConsultant}
                </span>
              </button>
              {consultants.map((consultant) => (
                <button
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-white transition hover:bg-[#d6b15f]/12"
                  key={consultant.id}
                  onClick={() => {
                    setSelectedConsultantId(consultant.id);
                    setIsConsultantOpen(false);
                  }}
                  type="button"
                >
                  <span
                    aria-label={consultant.name}
                    className="size-9 shrink-0 rounded-full border border-[#d6b15f]/45 bg-cover bg-center bg-black/40"
                    role="img"
                    style={{ backgroundImage: `url('${consultant.image}')` }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {consultant.name}
                    </span>
                    <span className="block truncate text-xs text-white/50">
                      {consultant.specialty}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className="text-xs text-white/42">{tf.consultantHint}</span>
      </label>

      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.coverImage}
        </span>
        <input
          accept={ACCEPT_IMAGE}
          className="block h-11 w-full cursor-pointer rounded-md border border-white/10 bg-black/28 px-3 text-sm text-white file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-[#d6b15f]/15 file:px-3 file:text-sm file:font-semibold file:text-[#f0cf79] hover:file:bg-[#d6b15f]/25"
          name="coverImage"
          onChange={handleImageChange}
          required
          type="file"
        />
        <span className="text-xs text-white/42">{tf.coverImageHint}</span>
      </label>

      {previewUrl ? (
        <div className="md:col-span-2">
          <div className="relative aspect-[16/10] w-full max-w-sm overflow-hidden rounded-md border border-white/10 bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={tf.coverPreviewAlt}
              className="h-full w-full object-cover"
              src={previewUrl}
            />
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-1.5 md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          {tf.description}
        </span>
        <textarea
          className="min-h-[112px] w-full rounded-md border border-white/10 bg-black/28 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18"
          maxLength={2000}
          name="description"
          placeholder={tf.descriptionPlaceholder}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button disabled={isSaving} type="submit">
          <Home aria-hidden className="size-4" />
          {isSaving ? tf.saving(progress) : tf.submit}
        </Button>
        <p className="text-xs text-white/52">
          <ImagePlus aria-hidden className="mr-1 inline-block size-3.5" />
          {tf.coverNote}
        </p>
      </div>

      {isSaving ? (
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
              <p className="font-semibold">{tf.propertySaved(success.title)}</p>
              <p className="mt-1 text-emerald-100/80">
                {tf.propertySavedNote(success.location)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function uploadWithProgress(
  formData: FormData,
  onProgress: (percent: number) => void,
  t: Dictionary,
): Promise<
  | { ok: true; data: CreatedProperty }
  | { ok: false; message: string }
> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/api/properties");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("error", () => {
      resolve({ ok: false, message: t.addPropertyForm.networkErrorSaving });
    });

    xhr.addEventListener("abort", () => {
      resolve({ ok: false, message: t.addPropertyForm.saveCancelled });
    });

    xhr.addEventListener("load", () => {
      let parsed: ApiResponse | null = null;

      try {
        parsed = JSON.parse(xhr.responseText) as ApiResponse;
      } catch {
        parsed = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && parsed?.data) {
        resolve({ ok: true, data: parsed.data });
        return;
      }

      const message =
        parsed?.error?.message ??
        t.addPropertyForm.saveFailed(xhr.status || "unknown");
      resolve({ ok: false, message });
    });

    xhr.send(formData);
  });
}
