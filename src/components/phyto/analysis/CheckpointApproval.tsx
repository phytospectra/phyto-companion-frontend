"use client";

import * as React from "react";
import { ShieldAlert, ShieldCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Checkpoint } from "@/api/types";

const REASON_MIN = 10;

interface CheckpointApprovalProps {
  checkpoint: Checkpoint;
  submitting?: boolean;
  onSubmit: (approved: boolean, reason: string) => void;
}

/**
 * The human-in-the-loop gate. Both decisions require a written reason so the
 * audit trail explains the choice, not just who made it. Approve and reject
 * are equally weighted controls — neither is styled as the obvious default.
 */
export function CheckpointApproval({
  checkpoint,
  submitting = false,
  onSubmit,
}: CheckpointApprovalProps) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const trimmed = reason.trim();
  const valid = trimmed.length >= REASON_MIN;

  function submit(approved: boolean) {
    if (!valid) {
      setError(`Please give a reason of at least ${REASON_MIN} characters.`);
      return;
    }
    setError(undefined);
    onSubmit(approved, trimmed);
  }

  return (
    <Card className="border-amber-300 dark:border-amber-800">
      <CardHeader>
        <CardTitle
          className="text-base flex items-center gap-2"
          role="heading"
          aria-level={3}
        >
          <ShieldAlert
            aria-hidden="true"
            className="text-amber-600 dark:text-amber-400"
            style={{ width: "1.05rem", height: "1.05rem" }}
          />
          Approval required · {checkpoint.name}
        </CardTitle>
        <CardDescription>{checkpoint.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/60 p-3 text-xs space-y-2">
          {checkpoint.artifacts.length > 0 && (
            <div>
              <span className="font-medium">What was produced: </span>
              <span className="font-mono">{checkpoint.artifacts.join(", ")}</span>
            </div>
          )}
          <div>
            <span className="font-medium">What this approves: </span>
            <span className="font-mono">
              {checkpoint.authorized_phase.join(", ") || "—"}
            </span>
          </div>
          {checkpoint.requires_tier3_authorization && (
            <div className="text-amber-800 dark:text-amber-300 font-medium">
              This checkpoint also requires a tier-3 authorization.
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="checkpoint-reason" className="text-xs">
            Reason for your decision{" "}
            <span className="text-muted-foreground">
              (required, at least {REASON_MIN} characters)
            </span>
          </Label>
          <Textarea
            id="checkpoint-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(undefined);
            }}
            placeholder="e.g. Candidate 3 matches the reported molecular formula and the MS2 fragments; proceed."
            rows={3}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "checkpoint-reason-error" : undefined}
          />
          {error && (
            <p
              id="checkpoint-reason-error"
              role="alert"
              className="text-[11px] text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            {trimmed.length}/{REASON_MIN} minimum characters
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => submit(true)}
            disabled={submitting}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ThumbsUp
              aria-hidden="true"
              style={{ width: "0.9rem", height: "0.9rem" }}
            />
            {submitting ? "Submitting…" : "Approve and continue"}
          </Button>
          <Button
            onClick={() => submit(false)}
            disabled={submitting}
            variant="outline"
            className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
          >
            <ThumbsDown
              aria-hidden="true"
              style={{ width: "0.9rem", height: "0.9rem" }}
            />
            {submitting ? "Submitting…" : "Reject and stop"}
          </Button>
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <ShieldCheck aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
            Rejecting costs nothing further.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
