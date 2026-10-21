"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Pause,
  X,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/phyto/layout/PageHeader";
import { useTokenStore } from "@/lib/phyto/stores";
import { runsApi } from "@/api/runs";
import type { AuditEntry, RunState } from "@/api/types";
import { TaskGraphViewer } from "./TaskGraphViewer";
import { CheckpointApproval } from "./CheckpointApproval";
import { LiveLog } from "./LiveLog";
import { StatusBadge } from "./StatusBadge";

/** Spec: poll while the run is active, every 2 seconds. */
const POLL_MS = 2000;

function isActive(status: RunState["status"]): boolean {
  return (
    status === "running" ||
    status === "awaiting_review" ||
    status === "pending"
  );
}

interface AnalysisPageProps {
  run_id: string;
  onViewResults: () => void;
}

export function AnalysisPage({ run_id, onViewResults }: AnalysisPageProps) {
  const queryClient = useQueryClient();
  const balance = useTokenStore((s) => s.balance);

  const runQuery = useQuery({
    queryKey: ["run", run_id],
    queryFn: ({ signal }) => runsApi.get(run_id, signal),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isActive(status) ? POLL_MS : false;
    },
  });

  const run = runQuery.data;

  const decide = useMutation({
    mutationFn: (decision: { approved: boolean; reason: string }) =>
      runsApi.submitCheckpoint(run_id, decision),
    onSuccess: (next, decision) => {
      queryClient.setQueryData(["run", run_id], next);
      toast({
        title: decision.approved ? "Checkpoint approved" : "Checkpoint rejected",
        description: decision.approved
          ? "The authorized phase is now running."
          : "Run halted. Your reason is preserved in the audit log.",
        variant: decision.approved ? "default" : "destructive",
      });
    },
    onError: (e: unknown) => {
      toast({
        title: "Could not submit decision",
        description:
          e instanceof Error ? e.message : "The decision was not recorded.",
        variant: "destructive",
      });
    },
  });

  const pause = useMutation({
    mutationFn: () => runsApi.pause(run_id),
    onSuccess: (next) => {
      queryClient.setQueryData(["run", run_id], next);
      toast({ title: "Run paused", description: "Polling has stopped." });
    },
    onError: () =>
      toast({ title: "Could not pause", variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: () => runsApi.cancel(run_id),
    onSuccess: (next) => {
      queryClient.setQueryData(["run", run_id], next);
      toast({
        title: "Run cancelled",
        description: "No further metered operations will run.",
        variant: "destructive",
      });
    },
    onError: () =>
      toast({ title: "Could not cancel", variant: "destructive" }),
  });

  if (runQuery.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Run"
          title={`Analysis · ${run_id}`}
          description="Loading run state…"
        />
        <div
          className="grid place-items-center gap-2 py-20 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="animate-spin"
            aria-hidden="true"
            style={{ width: "1.5rem", height: "1.5rem" }}
          />
          <span className="text-xs">Loading run state</span>
        </div>
      </div>
    );
  }

  if (runQuery.isError || !run) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Run" title={`Analysis · ${run_id}`} />
        <Card className="border-rose-300 dark:border-rose-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle
                aria-hidden="true"
                className="text-rose-600"
                style={{ width: "1rem", height: "1rem" }}
              />
              Could not load this run
            </CardTitle>
            <CardDescription>
              {runQuery.error instanceof Error
                ? runQuery.error.message
                : "The run could not be retrieved."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void runQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cp = run.awaiting_checkpoint;
  const tokensUsed = run.cost_so_far.tokens;
  const balanceValue = balance?.balance ?? 0;
  const canPause = run.status === "running" || run.status === "awaiting_review";
  const canCancel = run.status !== "complete" && run.status !== "failed";
  const failureDetail =
    run.status === "failed" ? findFailureDetail(run.audit_tail) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Run · ${run.workflow}`}
        title={`Analysis · ${run.run_id}`}
        description={`Model: ${run.model_version}. This is an honest companion — every checkpoint pauses for your explicit approval, and rejection is as easy as approval.`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!canPause || pause.isPending}
              onClick={() => pause.mutate()}
              aria-label="Pause this run"
            >
              <Pause
                aria-hidden="true"
                style={{ width: "0.85rem", height: "0.85rem" }}
              />
              {pause.isPending ? "Pausing…" : "Pause"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!canCancel || cancel.isPending}
              onClick={() => cancel.mutate()}
              aria-label="Cancel this run"
            >
              <X
                aria-hidden="true"
                style={{ width: "0.85rem", height: "0.85rem" }}
              />
              {cancel.isPending ? "Cancelling…" : "Cancel"}
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={run.status} />
            <span className="text-xs text-muted-foreground">
              Status: <span className="font-mono">{run.status}</span>
            </span>
            {runQuery.isFetching && isActive(run.status) && (
              <span className="text-[11px] text-muted-foreground">
                refreshing…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Tokens used:</span>
            <span
              className="font-mono tabular-nums font-semibold"
              data-testid="token-tracker"
            >
              {tokensUsed} / {balanceValue}
            </span>
            <span className="sr-only">
              {tokensUsed} tokens used of a {balanceValue} token balance
            </span>
          </div>
        </CardContent>
      </Card>

      {run.status === "failed" && (
        <Card className="border-rose-300 dark:border-rose-900">
          <CardHeader>
            <CardTitle
              className="text-base flex items-center gap-2"
              role="heading"
              aria-level={3}
            >
              <XCircle
                aria-hidden="true"
                className="text-rose-600 dark:text-rose-400"
                style={{ width: "1rem", height: "1rem" }}
              />
              Run failed
            </CardTitle>
            <CardDescription>
              {failureDetail ??
                "The run stopped before completion. See the audit tail for the last recorded event."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {run.status === "complete" && (
        <Card className="border-emerald-300 dark:border-emerald-900">
          <CardHeader>
            <CardTitle
              className="text-base flex items-center gap-2"
              role="heading"
              aria-level={3}
            >
              <CheckCircle2
                aria-hidden="true"
                className="text-emerald-600 dark:text-emerald-400"
                style={{ width: "1rem", height: "1rem" }}
              />
              Run complete
            </CardTitle>
            <CardDescription>
              All tasks finished. The assembled report is ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onViewResults} className="gap-1.5">
              View results
              <FileText
                aria-hidden="true"
                style={{ width: "0.9rem", height: "0.9rem" }}
              />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task graph</CardTitle>
              <CardDescription>
                Completed tasks in emerald, the running task pulses, failed
                tasks in red with their error, skipped tasks greyed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskGraphViewer
                tasks={run.task_graph.tasks}
                checkpoints={run.task_graph.checkpoints}
              />
            </CardContent>
          </Card>

          {cp && (
            <CheckpointApproval
              checkpoint={cp}
              submitting={decide.isPending}
              onSubmit={(approved, reason) =>
                decide.mutate({ approved, reason })
              }
            />
          )}
        </div>

        <LiveLog entries={run.audit_tail} />
      </div>
    </div>
  );
}

function findFailureDetail(entries: AuditEntry[]): string | null {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const e = entries[i];
    if (
      e.event === "run_failed" ||
      e.event === "task_failed" ||
      e.event === "checkpoint_rejected" ||
      e.event === "run_cancelled"
    ) {
      return e.detail ?? e.event;
    }
  }
  return null;
}
