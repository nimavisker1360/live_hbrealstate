"use client";

import { useEffect } from "react";
import {
  syncLiveUserToken,
  writeStoredLiveUser,
} from "@/lib/live-auth-client";

function stripTokenFromCurrentUrl() {
  const url = new URL(window.location.href);

  url.searchParams.delete("token");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function AuthTokenSync() {
  useEffect(() => {
    let ignore = false;
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");

    if (!token) {
      return () => {
        ignore = true;
      };
    }

    const tokenToSync = token;

    stripTokenFromCurrentUrl();

    async function syncUserFromUrlToken() {
      try {
        const user = await syncLiveUserToken(tokenToSync);

        if (!ignore) {
          writeStoredLiveUser(user);
        }
      } catch {
        if (!ignore) {
          writeStoredLiveUser(null);
        }
      }
    }

    syncUserFromUrlToken();

    return () => {
      ignore = true;
    };
  }, []);

  return null;
}
