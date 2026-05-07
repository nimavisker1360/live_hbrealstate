"use client";

import { useEffect, useRef, useState } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === "undefined") {
      return true;
    }

    return navigator.onLine;
  });
  const [wasRestored, setWasRestored] = useState(false);
  const hadOfflineEventRef = useRef(false);

  useEffect(() => {
    function markOnline() {
      setIsOnline(true);

      if (hadOfflineEventRef.current) {
        setWasRestored(true);
      }
    }

    function markOffline() {
      hadOfflineEventRef.current = true;
      setIsOnline(false);
      setWasRestored(false);
    }

    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);

    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  return {
    clearRestoredMessage: () => setWasRestored(false),
    isOnline,
    wasRestored,
  };
}
