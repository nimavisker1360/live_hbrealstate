"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Zap } from "lucide-react";

type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "offline";

export function NetworkQuality() {
  const [quality, setQuality] = useState<NetworkQuality>("good");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check connection using Navigation API
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) {
      setIsVisible(false);
      return;
    }

    function updateQuality() {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink || 0;

      if (!navigator.onLine) {
        setQuality("offline");
      } else if (effectiveType === "4g" || downlink >= 5) {
        setQuality("excellent");
      } else if (effectiveType === "3g" || downlink >= 2) {
        setQuality("good");
      } else if (effectiveType === "2g" || downlink >= 1) {
        setQuality("fair");
      } else {
        setQuality("poor");
      }
    }

    updateQuality();
    connection.addEventListener("change", updateQuality);
    window.addEventListener("online", updateQuality);
    window.addEventListener("offline", updateQuality);

    return () => {
      connection.removeEventListener("change", updateQuality);
      window.removeEventListener("online", updateQuality);
      window.removeEventListener("offline", updateQuality);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  const config = {
    excellent: {
      icon: Wifi,
      label: "Excellent connection",
      bg: "bg-emerald-500/20",
      border: "border-emerald-400/30",
      text: "text-emerald-100",
    },
    good: {
      icon: Wifi,
      label: "Good connection",
      bg: "bg-sky-500/20",
      border: "border-sky-400/30",
      text: "text-sky-100",
    },
    fair: {
      icon: Zap,
      label: "Fair connection",
      bg: "bg-amber-500/20",
      border: "border-amber-400/30",
      text: "text-amber-100",
    },
    poor: {
      icon: Zap,
      label: "Poor connection",
      bg: "bg-red-500/20",
      border: "border-red-400/30",
      text: "text-red-100",
    },
    offline: {
      icon: WifiOff,
      label: "No connection",
      bg: "bg-red-500/20",
      border: "border-red-400/30",
      text: "text-red-100",
    },
  };

  const current = config[quality];
  const Icon = current.icon;

  return (
    <div
      className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${current.bg} ${current.border} ${current.text}`}
    >
      <Icon className="size-4 shrink-0" />
      <span>{current.label}</span>
    </div>
  );
}
