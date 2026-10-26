"use client";

import * as React from "react";
import { FlaskConical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResultsPage } from "@/components/phyto/ResultsPage";
import { LANDING } from "@/lib/phyto/constants";

interface SampleAnalysisDialogProps {
  /** Visual weight of the trigger: primary CTA or quiet link. */
  variant?: "default" | "link";
  className?: string;
}

/**
 * The no-account demo path: renders the same report screen an
 * authenticated user sees (it is fixture-driven) inside a dialog, with a
 * sample-data banner so it can never be mistaken for the visitor's own
 * data. Read-only by construction — no form, no run can be started here.
 */
export function SampleAnalysisDialog({
  variant = "link",
  className,
}: SampleAnalysisDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          className={className}
          data-testid="sample-analysis-trigger"
        >
          <FlaskConical aria-hidden="true" style={{ width: "0.9rem", height: "0.9rem" }} />
          {LANDING.demo_label}
          {variant === "link" && (
            <span className="sr-only"> (sample data, no account needed)</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Sample analysis — demonstration data</DialogTitle>
          <DialogDescription>
            This is a pre-loaded sample run (green tea leaf extract). It is
            not your data and nothing here calls the backend. Sign in to
            analyze your own spectra.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto rounded-md border bg-muted/20 p-4">
          <ResultsPage onNavigateToMechanism={() => undefined} />
        </div>
      </DialogContent>
    </Dialog>
  );
}