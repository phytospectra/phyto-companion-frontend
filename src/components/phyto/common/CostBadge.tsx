"use client";

import * as React from "react";
import { Coins } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTokens } from "@/lib/phyto/formatting";
import { useTokenStore } from "@/lib/phyto/stores";
import { cn } from "@/lib/utils";

interface CostBadgeProps {
  /** Number of tokens this operation will charge on success. */
  cost: number;
  /** Optional label for what the operation is. */
  operation?: string;
  className?: string;
  size?: "sm" | "md";
}

/**
 * CostBadge — wraps a submit button (or sits next to one) and shows the
 * token cost BEFORE the user authorises the operation.
 *
 * Per spec:
 *   "Before running a paid operation, show the estimated cost."
 *
 * The badge also computes the post-operation balance and warns the user
 * when the operation would leave them below a 10-token reserve, so they
 * know to top up proactively rather than hit a 402 mid-workflow.
 */
export function CostBadge({
  cost,
  operation,
  className,
  size = "sm",
}: CostBadgeProps) {
  const balance = useTokenStore((s) => s.balance);
  const currentBalance = balance?.balance ?? 0;
  const afterOp = currentBalance - cost;
  const wouldDepleteReserve = afterOp >= 0 && afterOp < 10;
  const wouldExceed = afterOp < 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="status"
          aria-label={`Cost: ${formatTokens(cost)}. Current balance: ${formatTokens(
            currentBalance
          )}. After this operation: ${formatTokens(afterOp)}${
            wouldExceed ? " — insufficient balance." : ""
          }`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium",
            size === "sm" ? "text-[11px]" : "text-xs",
            wouldExceed
              ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
              : wouldDepleteReserve
              ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
              : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            className
          )}
        >
          <Coins
            aria-hidden="true"
            style={{ width: "0.8rem", height: "0.8rem" }}
          />
          <span className="tabular-nums">{formatTokens(cost)}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-left">
        <div className="space-y-1 text-xs">
          {operation && (
            <div className="font-semibold">{operation}</div>
          )}
          <div>Current balance: {formatTokens(currentBalance)}</div>
          <div>After this op: {formatTokens(afterOp)}</div>
          {wouldExceed ? (
            <div className="text-rose-700 dark:text-rose-300">
              Insufficient balance — you will see the top-up modal when you
              click.
            </div>
          ) : wouldDepleteReserve ? (
            <div className="text-amber-700 dark:text-amber-300">
              This will leave you below a 10-token reserve. Consider
              topping up first.
            </div>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
