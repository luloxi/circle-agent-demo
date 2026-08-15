"use client";

import { useEffect, useRef } from "react";
import { formatTime } from "@/lib/format";
import type { ActivityEntry, LogLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  ok: "text-cyan",
  warn: "text-amber-300",
  error: "text-red-400",
  pay: "text-violet",
  search: "text-primary",
};

export function ActivityLog({
  entries,
  onClear,
}: {
  entries: ActivityEntry[];
  onClear: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={onClear}
          disabled={!entries.length}
          className="text-[11px] tracking-wide text-muted-foreground uppercase hover:text-foreground disabled:opacity-40"
        >
          Clear
        </button>
      </div>
      <div className="h-72 overflow-auto font-mono text-[12px] leading-6">
        {entries.map((entry) => (
          <div key={entry.id} className="animate-log-in flex gap-3">
            <span className="shrink-0 text-muted-foreground/50">{formatTime(entry.ts)}</span>
            <span className={cn("w-12 shrink-0 uppercase", LEVEL_CLASS[entry.level])}>
              {entry.action}
            </span>
            <span className="min-w-0 break-words text-foreground/75">{entry.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
