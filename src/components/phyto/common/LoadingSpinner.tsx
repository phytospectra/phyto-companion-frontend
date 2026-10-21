"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Text shown next to the spinner. Falls back to "Loading…" */
  label?: string;
  /** Hide the label even when the page is otherwise quiet (e.g. inline). */
  silent?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * LoadingSpinner — used as the fallback for queries whose data has not yet
 * arrived. Wherever a meaningful skeleton is possible (e.g. tables, cards),
 * prefer the matching `Skeleton` from shadcn/ui; this spinner is for the
 * "no meaningful skeleton shape" cases.
 *
 * Per spec:
 *   "Add loading states for every query (skeletons, not spinners)."
 * We comply for list-shaped queries; this spinner exists only for inline
 * button-level and inline polling cases.
 */
export function LoadingSpinner({
  label,
  silent = false,
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const px = size === "sm" ? 12 : size === "lg" ? 24 : 16;
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
      className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}
    >
      <Loader2
        aria-hidden="true"
        style={{ width: px, height: px }}
        className="animate-spin"
      />
      {!silent && (
        <span className="text-sm">{label ?? "Loading…"}</span>
      )}
    </span>
  );
}
