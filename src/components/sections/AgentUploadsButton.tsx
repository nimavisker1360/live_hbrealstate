"use client";

import { useSyncExternalStore } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AGENT_DASHBOARD_EMAIL } from "@/lib/agent-dashboard-access";
import {
  LIVE_USER_UPDATED_EVENT,
  readStoredLiveUser,
} from "@/lib/live-auth-client";

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
  const viewerEmail = useSyncExternalStore(
    subscribeToLiveUser,
    readViewerEmail,
    readServerViewerEmail,
  );

  if (viewerEmail !== AGENT_DASHBOARD_EMAIL) {
    return null;
  }

  return (
    <Button href="/agent/dashboard" size="lg" variant="secondary">
      <UploadCloud aria-hidden className="size-5" />
      Agent uploads
    </Button>
  );
}
