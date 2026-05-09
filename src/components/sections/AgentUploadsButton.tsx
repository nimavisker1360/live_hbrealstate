"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";

type AuthMeResponse = {
  data?: {
    session?: {
      email?: string | null;
    } | null;
  };
};

export function AgentUploadsButton({
  allowedEmails,
}: {
  allowedEmails: string[];
}) {
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const allowed = useMemo(
    () => new Set(allowedEmails.map((email) => email.toLowerCase())),
    [allowedEmails],
  );
  const canSeeButton = viewerEmail ? allowed.has(viewerEmail) : false;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) return;

        const json = (await res.json()) as AuthMeResponse;
        const email = json.data?.session?.email?.trim().toLowerCase() ?? null;

        if (!cancelled) {
          setViewerEmail(email);
        }
      } catch {
        if (!cancelled) {
          setViewerEmail(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!canSeeButton) {
    return null;
  }

  return (
    <Button href="/agent/dashboard" size="lg" variant="secondary">
      <UploadCloud aria-hidden className="size-5" />
      Agent uploads
    </Button>
  );
}
