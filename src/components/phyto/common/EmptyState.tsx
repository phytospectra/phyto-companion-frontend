"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState — shown for every list-shaped query when the result set is
 * empty (e.g. "No candidates ranked yet"). Includes an optional action
 * (e.g. "Run ranking") so the user has a clear next step.
 *
 * Per spec:
 *   "Add empty states for every list (e.g. 'No candidates ranked yet')."
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center",
        className
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
