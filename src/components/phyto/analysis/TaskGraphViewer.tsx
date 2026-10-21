"use client";

import * as React from "react";
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/phyto/formatting";
import type { Checkpoint, Task, TaskStatus } from "@/api/types";
import { cn } from "@/lib/utils";

interface TaskGraphViewerProps {
  tasks: Task[];
  checkpoints: Checkpoint[];
}

/**
 * DAG rendering of the run's task list, interleaved with its checkpoints.
 * Status is encoded by icon, colour, and label — never colour alone.
 */
export function TaskGraphViewer({ tasks, checkpoints }: TaskGraphViewerProps) {
  return (
    <ol className="space-y-1" aria-label="Task graph">
      {tasks.map((t) => (
        <TaskRow key={t.task_id} task={t} />
      ))}
      {checkpoints.map((c) => (
        <li
          key={c.name}
          data-testid={`checkpoint-node-${c.name}`}
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50/60 px-2.5 py-1.5 dark:border-amber-900 dark:bg-amber-950/40"
        >
          <ShieldCheck
            aria-hidden="true"
            className="text-amber-600 dark:text-amber-400 mt-0.5"
            style={{ width: "0.95rem", height: "0.95rem" }}
          />
          <div className="min-w-0">
            <div className="text-xs font-medium">Checkpoint: {c.name}</div>
            <div className="text-[11px] text-muted-foreground leading-snug">
              {c.description}
            </div>
            {c.requires_tier3_authorization && (
              <Badge
                variant="outline"
                className="mt-1 text-[10px] border-amber-400 text-amber-800 dark:border-amber-800 dark:text-amber-300"
              >
                requires tier-3 sign-off
              </Badge>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function TaskRow({ task }: { task: Task }) {
  const cfg = taskStatusConfig(task.status);
  const duration =
    task.started_at && task.completed_at
      ? Math.round(
          (new Date(task.completed_at).getTime() -
            new Date(task.started_at).getTime()) /
            1000
        )
      : null;

  const row = (
    <li
      data-testid={`task-${task.tool_name}`}
      data-status={task.status}
      className={cn("flex items-start gap-2 rounded-md border px-2.5 py-1.5", cfg.box)}
    >
      {cfg.icon}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium">{task.tool_name}</span>
          <Badge variant="outline" className={cn("text-[10px]", cfg.badge)}>
            {task.status}
          </Badge>
        </div>
        {task.started_at && (
          <div className="text-[10px] text-muted-foreground mt-0.5">
            started {formatRelativeTime(task.started_at)}
            {duration !== null && ` · ${duration}s`}
          </div>
        )}
        {task.error && (
          <div className="text-[10px] text-rose-700 dark:text-rose-300 mt-0.5">
            {task.error}
          </div>
        )}
      </div>
    </li>
  );

  // Failed tasks expose their error through a tooltip as well as inline text,
  // so the reason is reachable on hover without hunting.
  if (task.status === "failed" && task.error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{row}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-xs">
          {task.error}
        </TooltipContent>
      </Tooltip>
    );
  }
  return row;
}

function taskStatusConfig(status: TaskStatus) {
  switch (status) {
    case "completed":
      return {
        icon: (
          <CheckCircle2
            aria-hidden="true"
            className="text-emerald-600 dark:text-emerald-400 mt-0.5"
            style={{ width: "0.95rem", height: "0.95rem" }}
          />
        ),
        box: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/30",
        badge:
          "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300",
      };
    case "running":
      return {
        icon: (
          <Loader2
            aria-hidden="true"
            className="text-emerald-500 animate-spin mt-0.5"
            style={{ width: "0.95rem", height: "0.95rem" }}
          />
        ),
        box: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 animate-pulse",
        badge:
          "border-emerald-400 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300",
      };
    case "failed":
      return {
        icon: (
          <XCircle
            aria-hidden="true"
            className="text-rose-600 dark:text-rose-400 mt-0.5"
            style={{ width: "0.95rem", height: "0.95rem" }}
          />
        ),
        box: "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40",
        badge:
          "border-rose-300 text-rose-800 dark:border-rose-800 dark:text-rose-300",
      };
    case "skipped":
      return {
        icon: (
          <CircleDashed
            aria-hidden="true"
            className="text-slate-400 mt-0.5"
            style={{ width: "0.95rem", height: "0.95rem" }}
          />
        ),
        box: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40",
        badge:
          "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400",
      };
    case "pending":
    default:
      return {
        icon: (
          <Clock
            aria-hidden="true"
            className="text-slate-400 mt-0.5"
            style={{ width: "0.95rem", height: "0.95rem" }}
          />
        ),
        box: "border-slate-200 bg-card dark:border-slate-800",
        badge:
          "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400",
      };
  }
}
