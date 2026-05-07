"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { cn } from "@/lib/utils";

type BookingSheetProps = {
  open: boolean;
  onClose: () => void;
  property: { id: string; title: string; location: string; price: string };
  agent: { id: string; name: string };
};

const TIME_SLOTS = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30"];

export function BookingSheet({
  open,
  onClose,
  property,
  agent,
}: BookingSheetProps) {
  const days = useMemo(() => buildCalendarDays(), []);
  const [selectedDay, setSelectedDay] = useState(days[0]?.key ?? "");
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[0]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    budget.trim().length >= 2 &&
    selectedDay &&
    selectedTime &&
    !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const viewingAt = buildViewingDate(selectedDay, selectedTime);
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agent.id,
          agentName: agent.name,
          propertyId: property.id,
          propertyTitle: property.title,
          propertyLocation: property.location,
          source: "Book Viewing",
          fullName: name.trim(),
          phone: phone.trim(),
          budget: budget.trim(),
          viewingAt: viewingAt.toISOString(),
          message: message.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(json?.error?.message ?? "Could not book viewing.");
      }

      setSuccess(true);
      setName("");
      setPhone("");
      setBudget("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not book viewing.");
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
      title="Book viewing"
      heightClass="h-[86vh]"
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
          <div className="rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-5 text-center">
            <CheckCircle2 className="mx-auto size-8 text-emerald-200" />
            <p className="mt-3 text-sm font-semibold text-emerald-100">
              Viewing request sent
            </p>
            <p className="mt-1 text-xs text-white/70">
              The consultant will confirm the appointment shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <section>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                <CalendarDays className="size-4 text-[#d6b15f]" />
                Select date
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setSelectedDay(day.key)}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center rounded-xl border text-center transition",
                      selectedDay === day.key
                        ? "border-[#d6b15f] bg-[#d6b15f] text-black"
                        : "border-white/10 bg-white/[0.03] text-white hover:bg-white/10",
                    )}
                  >
                    <span className="text-[0.65rem] font-semibold uppercase">
                      {day.weekday}
                    </span>
                    <span className="mt-1 text-lg font-bold">{day.day}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                <Clock className="size-4 text-[#d6b15f]" />
                Select time
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={cn(
                      "h-11 rounded-full border text-sm font-semibold transition",
                      selectedTime === slot
                        ? "border-[#d6b15f] bg-[#d6b15f] text-black"
                        : "border-white/10 bg-white/[0.03] text-white hover:bg-white/10",
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </section>

            <Field label="Full name">
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
            <Field label="Phone">
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
            <Field label="Budget">
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="Example: 450,000 USD"
                className="reel-input"
              />
            </Field>
            <Field label="Message (optional)">
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
              disabled={!canSubmit}
              className="h-12 w-full rounded-full bg-[#d6b15f] text-sm font-semibold text-black shadow-lg shadow-[#d6b15f]/25 transition hover:bg-[#f0cf79] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Book viewing"}
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

function buildCalendarDays() {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    date.setHours(0, 0, 0, 0);

    return {
      key: toDateKey(date),
      weekday: formatter.format(date),
      day: String(date.getDate()),
    };
  });
}

function buildViewingDate(dayKey: string, time: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
