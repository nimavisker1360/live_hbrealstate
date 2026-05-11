"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/client";
import { AGENT_DASHBOARD_EMAIL } from "@/lib/agent-dashboard-access";
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

export function AgentUploadsButton() {
  const t = useTranslation();
  const viewerEmail = useSyncExternalStore(
    subscribeToLiveUser,
    readViewerEmail,
    readServerViewerEmail,
  );
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const effectiveEmail = viewerEmail ?? sessionEmail;

  useEffect(() => {
    if (viewerEmail) {
      return;
    }

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
  }, [viewerEmail]);

  if (effectiveEmail !== AGENT_DASHBOARD_EMAIL) {
    return null;
  }

  return (
    <Button href="/agent/dashboard" size="lg" variant="secondary">
      <UploadCloud aria-hidden className="size-5" />
      {t.common.agentUploads}
    </Button>
  );
}
