"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Wifi, WifiOff } from "lucide-react";

const qualityStyles = {
  excellent: "bg-emerald-500/20 border-emerald-500/40 text-emerald-100",
  good: "bg-sky-500/20 border-sky-500/40 text-sky-100",
  fair: "bg-amber-500/20 border-amber-500/40 text-amber-100",
  poor: "bg-red-500/20 border-red-500/40 text-red-100",
  offline: "bg-red-500/20 border-red-500/40 text-red-100",
};

const qualityLabels = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  offline: "Offline",
};

export function ConnectionStatusBadge() {
  const { isOnline, quality } = useNetworkStatus();

  const styles = qualityStyles[quality];
  const label = qualityLabels[quality];
  const Icon = isOnline ? Wifi : WifiOff;

  return (
    <div
      className={`fixed top-16 right-4 z-40 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${styles}`}
    >
      <Icon className="size-3" />
      <span>{label}</span>
    </div>
  );
}
