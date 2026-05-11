"use client";

import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { useTranslation } from "@/lib/i18n/client";

type OfferSheetProps = {
  open: boolean;
  onClose: () => void;
  slug: string;
  property: { title: string; location: string; price: string };
  agent: { name: string };
};

export function OfferSheet({ open, onClose, slug, property }: OfferSheetProps) {
  const t = useTranslation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/video-tours/${slug}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerName: name.trim(),
          phone: phone.trim(),
          amount,
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(json?.error?.message ?? t.offerSheet.couldNotSubmit);
      }
      setSuccess(true);
      setName("");
      setPhone("");
      setAmount("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.offerSheet.couldNotSubmit);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        onClose();
        setTimeout(() => setSuccess(false), 300);
      }}
      title={t.offerSheet.title}
      heightClass="h-[80vh]"
    >
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[#d6b15f]">
            {property.price}
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {property.title}
          </p>
          <p className="text-xs text-white/55">{property.location}</p>
        </div>

        {success ? (
          <div className="rounded-2xl border border-[#d6b15f]/40 bg-[#d6b15f]/10 p-5 text-center">
            <p className="text-sm font-semibold text-[#d6b15f]">
              {t.offerSheet.offerSent}
            </p>
            <p className="mt-1 text-xs text-white/70">
              {t.offerSheet.offerSentSub}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label={t.offerSheet.fullName}>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="reel-input"
              />
            </Field>
            <Field label={t.offerSheet.phone}>
              <input
                type="tel"
                required
                minLength={6}
                maxLength={32}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="reel-input"
              />
            </Field>
            <Field label={t.offerSheet.yourOffer}>
              <input
                type="number"
                inputMode="decimal"
                required
                min={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={t.offerSheet.offerAmountPlaceholder}
                className="reel-input"
              />
            </Field>
            <Field label={t.offerSheet.messageOptional}>
              <textarea
                rows={3}
                maxLength={1000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="reel-input resize-none py-2"
              />
            </Field>

            {error ? (
              <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-full bg-[#d6b15f] text-sm font-semibold text-black shadow-lg shadow-[#d6b15f]/25 transition hover:bg-[#f0cf79] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t.offerSheet.sending : t.offerSheet.submit}
            </button>
          </form>
        )}
      </div>
    </BottomSheet>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/55">
        {label}
      </span>
      {children}
    </label>
  );
}
