"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclaimerBannerProps {
  /**
   * The disclaimer text. For mechanism hypotheses per spec:
   *   "HYPOTHESIS (computational, not experimental)"
   * is the canonical short label; the longer text goes here.
   */
  title: string;
  children: React.ReactNode;
  /** Visual prominence. `hypothesis` is the most prominent. */
  variant?: "hypothesis" | "warning" | "info";
  className?: string;
}

/**
 * DisclaimerBanner — used to make computational limitations visible at
 * the TOP of a panel, never buried in a footer.
 *
 * Per spec:
 *   "Every mechanism hypothesis must carry a disclaimer at the top, not
 *    buried in a footer."
 */
export function DisclaimerBanner({
  title,
  children,
  variant = "hypothesis",
  className,
}: DisclaimerBannerProps) {
  const styles: Record<
    NonNullable<DisclaimerBannerProps["variant"]>,
    string
  > = {
    hypothesis:
      "border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-100",
    warning:
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100",
    info: "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100",
  };

  return (
    <div
      role="note"
      aria-label={title}
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm leading-snug",
        styles[variant],
        className
      )}
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 shrink-0"
        style={{ width: "1.1rem", height: "1.1rem" }}
      />
      <div className="space-y-0.5">
        <div className="font-semibold tracking-wide uppercase text-[11px]">
          {title}
        </div>
        <div className="text-[13px] font-normal leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
