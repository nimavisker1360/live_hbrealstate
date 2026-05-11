"use client";

import { useEffect } from "react";

type AuthReturnFallbackProps = {
  hasSession: boolean;
};

const AUTH_RETURN_RETRY_KEY = "hb-live-auth-return-retry";

function isMainSiteLoginReferrer(referrer: string) {
  if (!referrer) return false;

  try {
    const url = new URL(referrer);
    const host = url.hostname.replace(/^www\./, "");

    return host === "hbrealstate.com" && url.pathname.includes("login");
  } catch {
    return false;
  }
}

export function AuthReturnFallback({ hasSession }: AuthReturnFallbackProps) {
  useEffect(() => {
    if (hasSession || !isMainSiteLoginReferrer(document.referrer)) {
      return;
    }

    if (window.sessionStorage.getItem(AUTH_RETURN_RETRY_KEY) === "1") {
      return;
    }

    window.sessionStorage.setItem(AUTH_RETURN_RETRY_KEY, "1");
    window.location.assign("/api/auth/start?next=%2F");
  }, [hasSession]);

  return null;
}
