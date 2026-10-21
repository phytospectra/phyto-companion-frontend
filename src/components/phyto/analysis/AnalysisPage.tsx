"use client";

import * as React from "react";
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  AlertCircle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Pause,
  X,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/phyto/layout/PageHeader";
import { CostBadge } from "@/components/phyto/common/CostBadge";
import { DisclaimerBanner } from "@/components/phyto/common/DisclaimerBanner";
import { formatDateTime, formatRelativeTime, formatTokens } from "@/lib/phyto/formatting";
import { mockApi, newIdempotencyKey } from "@/lib/phyto/mock-api";
import { useTokenStore } from "@/lib/phyto/stores";
import { MOCK_RUN_STATE } from "@/lib/phyto/fixtures";
import { PRICING_TABLE } from "@/lib/phyto/constants";
import type { AuditEntry, Checkpoint, RunState, Task, TaskStatus } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

interface AnalysisPageProps {
  run_id: string;
  onViewResults: () => void;
}

export function AnalysisPage({ run_id, onViewResults }: AnalysisPageProps) {
  const [run, setRun] = React.useState<RunState | null>(null);
  const [liveAudit, setLiveAudit] = React.useState<AuditEntry[]>(MOCK_RUN_STATE.audit_tail);
  const [submitting, setSubmitting] = React.useState(false);

  // Fetch the run state once on mount.
  React.useEffect(() => {
    let mounted = true;
    mockApi.getRun(run_id).then((r) => {
      if (mounted) setRun(r);
    });
    return () => {
      mounted = false;
    };
  }, [run_id]);

  // Poll while running — every 2 seconds per spec.
  React.useEffect(() => {
    if (!run || run.status === "complete" || run.status === "failed") return;
    const id = setInterval(async () => {
      const r = await mockApi.getRun(run_id);
      setRun(r);
      // Simulate the audit tail growing during a run.
      setLiveAudit((prev) => [
        ...prev.slice(-19),
        {
          ts: new Date().toISOString(),
          event: "task_progress",
          actor: "system",
          detail: `elucidate_candidates: ${Math.round(Math.random() * 30 + 60)}% ranked`,
        },
      ]);
    }, 2000);
    return () => clearInterval(id);
  }, [run, run_id]);

  const balance = useTokenStore((s) => s.balance);
  const tokensUsed = run?.cost_so_far.tokens ?? 0;

  async function submitCheckpoint(approved: boolean, reason: string) {
    if (!run?.awaiting_checkpoint) return;
    if (reason.trim().length < 10) {
      toast({
        title: "Reason too short",
        description: "Both approve and reject require a typed reason (min 10 chars).",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const next = await mockApi.submitCheckpoint(
      run_id,
      run.awaiting_checkpoint.name,
      { approved, reason }
    );
    setRun(next);
    setLiveAudit((prev) => [...prev, ...next.audit_tail.slice(-1)]);
    setSubmitting(false);
    toast({
      title: approved ? "Checkpoint approved" : "Checkpoint rejected",
      description: approved
        ? "Phase 2 (novel generate + localise) is now authorised."
        : "Run halted. The audit log records your reason.",
      variant: approved ? "default" : "destructive",
    });
    if (approved) {
      // After approval, the mock's next status is "running" but the
      // demo flow wants the user to see results — let's auto-advance.
      setTimeout(() => onViewResults(), 800);
    }
  }

  if (!run) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Run"
          title={`Analysis · ${run_id}`}
          description="Loading run state…"
        />
        <div className="grid place-items-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin" style={{ width: "1.5rem", height: "1.5rem" }} />
        </div>
      </div>
    );
  }

  const cp = run.awaiting_checkpoint;
  const awaitingReview = run.status === "awaiting_review" && cp;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Run · ${run.workflow}`}
        title={`Analysis · ${run.run_id}`}
        description={`Model: ${run.model_version}. This is an honest companion — every checkpoint pauses for your explicit approval, and rejection is as easy as approval.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <Pause aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              Pause
            </Button>
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <X aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              Cancel
            </Button>
          </div>
        }
      />

      {/* Cost tracker */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={run.status} />
            <span className="text-xs text-muted-foreground">
              Status: <span className="font-mono">{run.status}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Tokens used:</span>
            <span className="font-mono tabular-nums font-semibold">
              {tokensUsed} / {balance?.balance ?? 0 + tokensUsed}
            </span>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Clock aria-hidden="true" style={{ width: "0.65rem", height: "0.65rem" }} />
              running
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Task graph */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task graph</CardTitle>
              <CardDescription>
                A directed acyclic graph of the run. Completed tasks in
                emerald, running tasks pulse, failed tasks in red with
                error tooltip, skipped tasks greyed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskGraphViewer tasks={run.task_graph.tasks} checkpoints={run.task_graph.checkpoints} />
            </CardContent>
          </Card>

          {/* Checkpoint approval */}
          {awaitingReview && cp && (
            <CheckpointApproval
              checkpoint={cp}
              submitting={submitting}
              onSubmit={submitCheckpoint}
              onShowEvidence={() => onViewResults()}
            />
          )}

          {/* If checkpoint was rejected, show a banner */}
          {run.status === "failed" && (
            <DisclaimerBanner
              title="Run halted at checkpoint"
              variant="warning"
            >
              The reviewer rejected the checkpoint. The audit log retains
              your reason. No further metered operations have run.
            </DisclaimerBanner>
          )}
        </div>

        {/* Audit tail */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
              Live audit tail
            </CardTitle>
            <CardDescription>
              Last 20 entries, polled every 2s while running.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 rounded-md border">
              <ul className="space-y-0.5 p-2 text-xs">
                {liveAudit.map((e, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-sm px-1.5 py-1 hover:bg-accent"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {formatRelativeTime(e.ts)}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium">{e.event}</span>{" "}
                      <span className="text-muted-foreground">· {e.actor}</span>
                      {e.detail && (
                        <div className="text-[11px] text-muted-foreground leading-snug">
                          {e.detail}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Last entry: {liveAudit.length > 0 ? formatDateTime(liveAudit[liveAudit.length - 1].ts) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View results button (always available) */}
      <div className="flex justify-end">
        <Button onClick={onViewResults} variant="default" className="gap-1.5">
          View results
          <FileText aria-hidden="true" style={{ width: "0.9rem", height: "0.9rem" }} />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: RunState["status"] }) {
  const map: Record<RunState["status"], { color: string; label: string }> = {
    pending: { color: "bg-slate-500", label: "Pending" },
    running: { color: "bg-emerald-500 animate-pulse", label: "Running" },
    awaiting_review: { color: "bg-amber-500 animate-pulse", label: "Awaiting review" },
    complete: { color: "bg-emerald-600", label: "Complete" },
    failed: { color: "bg-rose-600", label: "Failed" },
  };
  const m = map[status];
  return (
    <Badge
      variant="outline"
      className="gap-1.5 text-xs"
      aria-label={`Status: ${m.label}`}
    >
      <span aria-hidden="true" className={cn("inline-block h-2 w-2 rounded-full", m.color)} />
      {m.label}
    </Badge>
  );
}

function TaskGraphViewer({
  tasks,
  checkpoints,
}: {
  tasks: Task[];
  checkpoints: Checkpoint[];
}) {
  return (
    <ol className="space-y-1">
      {tasks.map((t) => (
        <TaskRow key={t.task_id} task={t} />
      ))}
      {checkpoints.map((c) => (
        <li
          key={c.name}
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50/60 px-2.5 py-1.5 dark:border-amber-900 dark:bg-amber-950/40"
        >
          <ShieldCheck
            aria-hidden="true"
            className="text-amber-600 dark:text-amber-400 mt-0.5"
            style={{ width: "0.95rem", height: "0.95rem" }}
          />
          <div className="min-w-0">
            <div className="text-xs font-medium">
              Checkpoint: {c.name}
            </div>
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
  return (
    <li
      className={cn(
        "flex items-start gap-2 rounded-md border px-2.5 py-1.5",
        cfg.box
      )}
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
            {task.completed_at && ` · ${Math.round((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000)}s`}
          </div>
        )}
        {task.error && (
          <div className="text-[10px] text-rose-700 dark:text-rose-300 mt-0.5">
            ⚠ {task.error}
          </div>
        )}
      </div>
    </li>
  );
}

function taskStatusConfig(status: TaskStatus) {
  switch (status) {
    case "completed":
      return {
        icon: <CheckCircle2 aria-hidden="true" className="text-emerald-600 dark:text-emerald-400 mt-0.5" style={{ width: "0.95rem", height: "0.95rem" }} />,
        box: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/30",
        badge: "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300",
      };
    case "running":
      return {
        icon: <Loader2 aria-hidden="true" className="text-emerald-500 animate-spin mt-0.5" style={{ width: "0.95rem", height: "0.95rem" }} />,
        box: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 animate-pulse",
        badge: "border-emerald-400 text-emerald-800 dark:border-emerald-700 dark:text-emerald-300",
      };
    case "failed":
      return {
        icon: <XCircle aria-hidden="true" className="text-rose-600 dark:text-rose-400 mt-0.5" style={{ width: "0.95rem", height: "0.95rem" }} />,
        box: "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40",
        badge: "border-rose-300 text-rose-800 dark:border-rose-800 dark:text-rose-300",
      };
    case "skipped":
      return {
        icon: <CircleDashed aria-hidden="true" className="text-slate-400 mt-0.5" style={{ width: "0.95rem", height: "0.95rem" }} />,
        box: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40",
        badge: "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400",
      };
    case "pending":
    default:
      return {
        icon: <Clock aria-hidden="true" className="text-slate-400 mt-0.5" style={{ width: "0.95rem", height: "0.95rem" }} />,
        box: "border-slate-200 bg-card dark:border-slate-800",
        badge: "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400",
      };
  }
}

function CheckpointApproval({
  checkpoint,
  submitting,
  onSubmit,
  onShowEvidence,
}: {
  checkpoint: Checkpoint;
  submitting: boolean;
  onSubmit: (approved: boolean, reason: string) => void;
  onShowEvidence: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [evidenceOpen, setEvidenceOpen] = React.useState(false);
  const remaining = 10 - reason.trim().length;
  const tooShort = remaining > 0;

  return (
    <Card
      className="border-amber-300 dark:border-amber-800"
      aria-labelledby="cp-title"
    >
      <CardHeader className="bg-amber-50/60 dark:bg-amber-950/30 rounded-t-lg">
        <CardTitle
          id="cp-title"
          className="text-base flex items-center gap-2"
        >
          <ShieldAlert
            aria-hidden="true"
            className="text-amber-600 dark:text-amber-400"
            style={{ width: "1.1rem", height: "1.1rem" }}
          />
          Human review required
        </CardTitle>
        <CardDescription>
          The run will not proceed past this checkpoint without your
          explicit decision. Both Approve and Reject require a typed
          reason — that reason is what makes the audit trail meaningful.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* What is being approved */}
        <Section title="What you are approving">
          <p className="text-xs text-muted-foreground">
            Artifacts produced up to this point — you can inspect any of
            them before deciding.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {checkpoint.artifacts.map((a) => (
              <li key={a}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() => {
                    setEvidenceOpen(true);
                    onShowEvidence();
                  }}
                >
                  <FileText aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
                  {a}
                </Button>
              </li>
            ))}
          </ul>
        </Section>

        {/* What you are authorizing */}
        <Section title="What you are authorizing">
          <p className="text-xs text-muted-foreground">
            The next phase runs these metered tasks. Each one will deduct
            tokens from your balance.
          </p>
          <ul className="mt-2 space-y-1">
            {checkpoint.authorized_phase.map((p) => (
              <li
                key={p}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1.5 text-xs"
              >
                <span className="font-mono">{p}</span>
                <CostBadge cost={5} operation={p} />
              </li>
            ))}
          </ul>
        </Section>

        {/* Consequences of rejection */}
        <Section title="If you reject">
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• No further metered operations run.</li>
            <li>• The run status flips to <code className="font-mono">failed</code>.</li>
            <li>• Your typed reason is preserved verbatim in the audit log.</li>
            <li>• You can re-launch a new run from the Upload page any time.</li>
          </ul>
        </Section>

        {/* Reason field */}
        <div className="space-y-1.5">
          <Label htmlFor="cp-reason" className="text-xs font-medium">
            Reason (min 10 chars) — required for both Approve and Reject
          </Label>
          <Textarea
            id="cp-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Top-1 candidate is quercetin with all diagnostic fragments matched; the single unmatched peak is likely a methoxy adduct and not blocking. Proceeding to novel relative generation."
          />
          <div className="flex items-center justify-between text-[11px]">
            <span className={cn("tabular-nums", tooShort ? "text-rose-600" : "text-emerald-600")}>
              {reason.trim().length}/10 characters
            </span>
            {tooShort && (
              <span className="text-muted-foreground">
                Type a substantive reason — this is the audit trail.
              </span>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onSubmit(false, reason)}
            disabled={submitting || tooShort}
            className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950 dark:hover:text-rose-300"
            aria-label="Reject the checkpoint — halts the run and logs your reason"
          >
            <XCircle aria-hidden="true" style={{ width: "0.9rem", height: "0.9rem" }} />
            Reject (halt run)
          </Button>
          <Button
            onClick={() => onSubmit(true, reason)}
            disabled={submitting || tooShort}
            className="gap-1.5"
            aria-label="Approve the checkpoint — authorises the next phase"
          >
            <ShieldCheck aria-hidden="true" style={{ width: "0.9rem", height: "0.9rem" }} />
            Approve & continue
          </Button>
        </div>

        {evidenceOpen && (
          <p className="text-[11px] text-muted-foreground">
            (Artifact preview opens in the Results page in this demo — in
            production it opens inline.)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}
