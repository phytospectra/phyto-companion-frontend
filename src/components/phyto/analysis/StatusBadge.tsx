"use client";

import { Badge } from "@/components/ui/badge";
import type { RunStatus } from "@/api/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<RunStatus, { dot: string; label: string }> = {
  pending: { dot: "bg-slate-500", label: "Paused" },
  running: { dot: "bg-emerald-500 animate-pulse", label: "Running" },
  awaiting_review: { dot: "bg-amber-500 animate-pulse", label: "Awaiting review" },
  complete: { dot: "bg-emerald-600", label: "Complete" },
  failed: { dot: "bg-rose-600", label: "Failed" },
};

export function StatusBadge({ status }: { status: RunStatus }) {
  const m = CONFIG[status];
  return (
    <Badge
      variant="outline"
      className="gap-1.5 text-xs"
      aria-label={`Status: ${m.label}`}
    >
      <span
        aria-hidden="true"
        className={cn("inline-block h-1.5 w-1.5 rounded-full", m.dot)}
      />
      {m.label}
    </Badge>
  );
}
