"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VERDICT_META } from "@/lib/phyto/constants";
import type { Verdict } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

/**
 * Color classes per verdict. Tailwind needs the full class strings to be
 * present at build time (it can't synthesise them from variables), so we
 * enumerate them here explicitly.
 *
 * Colour is NEVER the sole carrier of meaning: every badge also shows the
 * verdict's short label and a tooltip with the full definition.
 */
const VERDICT_CLASSES: Record<
  Verdict,
  { badge: string; dot: string }
> = {
  CONFIRMED: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  TENTATIVE: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  AMBIGUOUS: {
    badge:
      "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
    dot: "bg-rose-500",
  },
  CANDIDATE: {
    badge:
      "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200",
    dot: "bg-violet-500",
  },
  ABSTAIN: {
    badge:
      "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
    dot: "bg-slate-400",
  },
  NOVELTY_FLAGGED: {
    badge:
      "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200",
    dot: "bg-orange-500",
  },
};

interface VerdictBadgeProps {
  verdict: Verdict;
  /** Render size. Default `sm` for table use. */
  size?: "sm" | "md";
  /** When true, prepend a coloured dot for extra visual anchoring. */
  withDot?: boolean;
  className?: string;
}

/**
 * VerdictBadge — the single most important honesty primitive in the
 * platform.
 *
 * Per spec:
 *   "Every verdict badge has color + text + tooltip."
 *
 * We never ship a verdict as a colour swatch alone — that would fail
 * WCAG 2.1 (1.4.1 Use of Color). The verdict's short label is always
 * present in the badge, and the tooltip carries the full definition so
 * a researcher can confirm what the verdict *means* without leaving the
 * page.
 */
export function VerdictBadge({
  verdict,
  size = "sm",
  withDot = true,
  className,
}: VerdictBadgeProps) {
  const meta = VERDICT_META[verdict];
  const classes = VERDICT_CLASSES[verdict];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          role="status"
          aria-label={`Verdict: ${meta.short}. ${meta.definition}`}
          className={cn(
            classes.badge,
            size === "sm" ? "text-[11px]" : "text-xs",
            "gap-1.5 font-medium",
            className
          )}
        >
          {withDot ? (
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                classes.dot
              )}
            />
          ) : null}
          <span>{meta.short}</span>
          <HelpCircle
            aria-hidden="true"
            className="opacity-60"
            style={{ width: "0.75rem", height: "0.75rem" }}
          />
        </Badge>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[280px] text-left leading-snug"
      >
        <div className="space-y-1">
          <div className="font-semibold">{meta.short}</div>
          <div className="text-xs font-normal opacity-90">
            {meta.definition}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
