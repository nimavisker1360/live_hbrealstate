"use client";

import type { LiveSession } from "@/generated/prisma";

type StreamSelectorProps = {
  sessions: Array<{
    id: string;
    title: string;
    status: string;
    property: { title: string; location: string };
  }>;
  selectedStreamId: string | undefined;
  onStreamSelect: (streamId: string | undefined) => void;
};

export function StreamSelector({
  sessions,
  selectedStreamId,
  onStreamSelect,
}: StreamSelectorProps) {
  return (
    <div className="space-y-4 rounded-md border border-white/10 bg-black/18 p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-full bg-[#d6b15f] text-sm font-bold text-black">
          2
        </div>
        <h3 className="text-sm font-semibold text-white">Link to Live Stream (Optional)</h3>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-white/72">
          Select a related live stream
        </label>
        <select
          value={selectedStreamId ?? ""}
          onChange={(e) =>
            onStreamSelect(e.target.value === "" ? undefined : e.target.value)
          }
          className="h-11 w-full rounded-md border border-white/10 bg-black/28 px-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-[#d6b15f]/70 focus:ring-2 focus:ring-[#d6b15f]/18"
        >
          <option value="">— No specific stream —</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.property.title} {session.status === "LIVE" ? "🔴" : ""}
            </option>
          ))}
        </select>
        <p className="text-xs text-white/52">
          This links your recording to a specific property or tour for context.
        </p>
      </div>
    </div>
  );
}
