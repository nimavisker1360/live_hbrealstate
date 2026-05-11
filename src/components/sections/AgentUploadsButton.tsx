"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/client";
import { isAgentDashboardEmail } from "@/lib/agent-dashboard-access";
import {
  LIVE_USER_UPDATED_EVENT,
  readStoredLiveUser,
} from "@/lib/live-auth-client";

type AuthMeResponse = {
  data?: {
    session?: {
      email?: string | null;
    } | null;
  };
};

function readViewerEmail() {
  return readStoredLiveUser()?.email?.trim().toLowerCase() ?? null;
}

function subscribeToLiveUser(callback: () => void) {
  window.addEventListener(LIVE_USER_UPDATED_EVENT, callback);

  return () => {
    window.removeEventListener(LIVE_USER_UPDATED_EVENT, callback);
  };
}

function readServerViewerEmail() {
  return null;
}

type AgentUploadsButtonProps = {
  initialEmail?: string | null;
  label?: string;
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

export function AgentUploadsButton({
  initialEmail,
  label,
}: AgentUploadsButtonProps) {
  const t = useTranslation();
  const viewerEmail = useSyncExternalStore(
    subscribeToLiveUser,
    readViewerEmail,
    readServerViewerEmail,
  );
  const [sessionEmail, setSessionEmail] = useState<string | null>(
    normalizeEmail(initialEmail),
  );
  const effectiveEmail = sessionEmail ?? viewerEmail;

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
          setSessionEmail(email);
        }
      } catch {
        if (!cancelled) {
          setSessionEmail(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAgentDashboardEmail(effectiveEmail)) {
    return null;
  }

  return (
    <Button href="/agent/dashboard" size="lg" variant="secondary">
      <UploadCloud aria-hidden className="size-5" />
      {label ?? t.common.agentUploads}
    </Button>
  );
}
