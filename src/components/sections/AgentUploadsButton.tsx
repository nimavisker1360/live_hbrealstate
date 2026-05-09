"use client";

import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  LIVE_USER_UPDATED_EVENT,
  readStoredLiveUser,
  type SyncedLiveUser,
} from "@/lib/live-auth-client";

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
  const [viewerEmail, setViewerEmail] = useState<string | null>(() => {
    const storedUser = readStoredLiveUser();

    return storedUser?.email?.trim().toLowerCase() ?? null;
  });
  const allowedEmail = allowedEmails[0]?.toLowerCase() ?? "";
  const canSeeButton = viewerEmail === allowedEmail;

  useEffect(() => {
    let cancelled = false;
    const syncStoredUser = (user: SyncedLiveUser | null | undefined) => {
      setViewerEmail(user?.email?.trim().toLowerCase() ?? null);
    };
    const onStoredUserUpdated = (event: Event) => {
      syncStoredUser(
        (event as CustomEvent<SyncedLiveUser | null>).detail ?? null,
      );
    };

    void (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) return;

        const json = (await res.json()) as AuthMeResponse;
        const storedEmail =
          readStoredLiveUser()?.email?.trim().toLowerCase() ?? null;
        const email =
          storedEmail ??
          json.data?.session?.email?.trim().toLowerCase() ??
          null;

        if (!cancelled) {
          setViewerEmail(email);
        }
      } catch {
        if (!cancelled) {
          setViewerEmail(null);
        }
      }
    })();

    window.addEventListener(LIVE_USER_UPDATED_EVENT, onStoredUserUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(LIVE_USER_UPDATED_EVENT, onStoredUserUpdated);
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
