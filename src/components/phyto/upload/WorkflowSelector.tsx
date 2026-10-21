"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WORKFLOWS } from "@/lib/phyto/constants";
import type { WorkflowId } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

interface WorkflowSelectorProps {
  value: WorkflowId;
  onChange: (id: WorkflowId) => void;
}

/**
 * The four workflows, each with its description and estimated total token
 * cost from `WORKFLOWS` (the single source of truth shared with the mock
 * backend). The selected card is highlighted and marked `aria-pressed`.
 */
export function WorkflowSelector({ value, onChange }: WorkflowSelectorProps) {
  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="text-base">Choose a workflow</CardTitle>
        <CardDescription>
          Each workflow runs a different plan. The estimated total includes
          every phase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {WORKFLOWS.map((w) => {
          const active = w.id === value;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onChange(w.id)}
              aria-pressed={active}
              data-testid={`workflow-${w.id}`}
              className={cn(
                "w-full text-left rounded-md border p-3 transition-colors",
                active
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                  : "border-slate-200 hover:border-emerald-400 dark:border-slate-700"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm">{w.label}</div>
                <Badge variant="outline" className="text-[10px] tabular-nums">
                  ~{w.estimated_tokens} tokens
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {w.description}
              </div>
              <ol className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                {w.steps.map((s, i) => (
                  <React.Fragment key={s}>
                    <span className="font-mono">
                      {i + 1}. {s}
                    </span>
                    {i < w.steps.length - 1 && <span aria-hidden="true">→</span>}
                  </React.Fragment>
                ))}
              </ol>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
