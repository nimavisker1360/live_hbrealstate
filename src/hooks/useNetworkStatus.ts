"use client";

import { useEffect, useState } from "react";

type Quality = "excellent" | "good" | "fair" | "poor" | "offline";

export type NetworkStatus = {
  isOnline: boolean;
  quality: Quality;
};

function getQuality(effectiveType?: string): Quality {
  if (!effectiveType) return "good";
  if (effectiveType === "4g") return "excellent";
  if (effectiveType === "3g") return "good";
  if (effectiveType === "2g") return "fair";
  if (effectiveType === "slow-2g") return "poor";
  return "good";
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    quality: "excellent",
  });

  useEffect(() => {
    const updateQuality = () => {
      const connection =
        (navigator as unknown as { connection?: { effectiveType?: string } })
          .connection ?? undefined;
      setStatus({
        isOnline: navigator.onLine,
        quality: navigator.onLine ? getQuality(connection?.effectiveType) : "offline",
      });
    };

    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
        quality: getQuality(
          (navigator as unknown as { connection?: { effectiveType?: string } })
            .connection?.effectiveType,
        ),
      }));
    };

    const handleOffline = () => {
      setStatus({ isOnline: false, quality: "offline" });
    };

    updateQuality();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const connection = (navigator as unknown as { connection?: EventTarget }).connection;
    if (connection && typeof connection.addEventListener === "function") {
      connection.addEventListener("change", updateQuality);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection && typeof connection.removeEventListener === "function") {
        connection.removeEventListener("change", updateQuality);
      }
    };
  }, []);

  return status;
}
