"use client";

import * as React from "react";
import { GitCompareArrows, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRankInterval } from "@/lib/phyto/formatting";
import type { CandidateRank } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

/**
 * UncertaintyBadge — surfaces the ranking interval (a tie is an interval,
 * not a point), the tied-candidates count, and the score margin in one
 * compact unit.
 *
 * Per spec:
 *   "Every candidate shows its ranking interval (e.g. 'rank 1, tied with
 *    2 others'), not just 'rank 1.'"
 */
interface UncertaintyBadgeProps {
  rank: CandidateRank;
  className?: string;
}

export function UncertaintyBadge({ rank, className }: UncertaintyBadgeProps) {
  const isTie = rank.tied_candidates > 0;
  const marginPct = Math.round(rank.margin * 100);

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
              isTie
                ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            )}
          >
            <GitCompareArrows
              aria-hidden="true"
              style={{ width: "0.7rem", height: "0.7rem" }}
            />
            <span>{formatRankInterval(rank)}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-left">
          <div className="space-y-1">
            <div className="font-semibold">Ranking interval</div>
            <div className="text-xs font-normal opacity-90">
              The rank is an interval, not a point. Best case rank is{" "}
              {rank.ranking_interval[0]}, worst case is{" "}
              {rank.ranking_interval[1]}.
              {isTie
                ? ` Tied with ${rank.tied_candidates} other candidate${
                    rank.tied_candidates === 1 ? "" : "s"
                  } — the system cannot break the tie from current evidence.`
                : " No tie at this rank."}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      {rank.margin < 0.05 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
            >
              <AlertTriangle
                aria-hidden="true"
                style={{ width: "0.7rem", height: "0.7rem" }}
              />
              <span>margin {marginPct}%</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-left">
            <div className="space-y-1">
              <div className="font-semibold">Small margin</div>
              <div className="text-xs font-normal opacity-90">
                The score difference to the next candidate is below 5%.
                Treat the ranking as fragile — prefer reporting the
                candidate set rather than the single top hit.
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
