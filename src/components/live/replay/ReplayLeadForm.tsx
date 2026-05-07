"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ReplayLeadFormProps = {
  agentId?: string | null;
  agentName: string;
  propertyId?: string | null;
  propertyLocation: string;
  propertyTitle: string;
  roomId?: string | null;
};

type SubmitState = "idle" | "submitting" | "sent" | "failed";

export function ReplayLeadForm({
  agentId,
  agentName,
  propertyId,
  propertyLocation,
  propertyTitle,
  roomId,
}: ReplayLeadFormProps) {
  const [error, setError] = useState("");
  const [state, setState] = useState<SubmitState>("idle");

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setError("");
    setState("submitting");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: agentId || undefined,
          agentName,
          budget: String(formData.get("budget") ?? ""),
          fullName: String(formData.get("fullName") ?? ""),
          interest: String(formData.get("interest") ?? ""),
          message: String(formData.get("message") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          propertyId: propertyId || undefined,
          propertyLocation,
          propertyTitle,
          roomId: roomId || undefined,
          source: "Get Details",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Could not send your request.");
      }

      form.reset();
      setState("sent");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not send your request.",
      );
      setState("failed");
    }
  }

  return (
    <form className="space-y-3" onSubmit={submitLead}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" name="fullName" required />
        <Input label="Phone" name="phone" required type="tel" />
      </div>
      <Input label="Budget" name="budget" placeholder="Preferred range" required />
      <Input
        label="Interest"
        name="interest"
        placeholder="Investment, citizenship, family home"
      />
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/72">
          Message
        </span>
        <textarea
          className="min-h-24 w-full rounded-md border border-white/10 bg-black/42 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/20"
          maxLength={1000}
          name="message"
          placeholder="Tell us what you would like to know."
        />
      </label>

      {error ? (
        <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {state === "sent" ? (
        <p className="rounded-md border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
          Request sent. An HB advisor will contact you shortly.
        </p>
      ) : null}

      <Button
        className="w-full"
        disabled={state === "submitting"}
        size="lg"
        type="submit"
      >
        {state === "submitting" ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          <Send aria-hidden className="size-4" />
        )}
        Request details
      </Button>
    </form>
  );
}

function Input({
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/72">
        {label}
      </span>
      <input
        className="h-12 w-full rounded-md border border-white/10 bg-black/42 px-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#d6b15f] focus:ring-2 focus:ring-[#d6b15f]/20"
        maxLength={160}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}
