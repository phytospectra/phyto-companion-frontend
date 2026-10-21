"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  BookOpen,
  Network,
} from "lucide-react";
import { EvidenceGraph } from "./EvidenceGraph";
import type { EvidenceGraphT } from "@/lib/phyto/types";
import { cn } from "@/lib/utils";

interface EvidencePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title of the thing this evidence supports (e.g. candidate name). */
  title: string;
  subtitle?: string;
  graph: EvidenceGraphT;
  /** Unmatched observed peaks (the spectrum showed these, no prediction explained them). */
  unmatchedObserved?: string[];
  /** Unmatched predicted peaks (the model predicted these, the spectrum didn't show them). */
  unmatchedPredicted?: string[];
  /** Cross-modal propagation chain (free-text descriptions). */
  propagationChains?: string[];
  citations?: string[];
  /** Optional verdict to surface at the top of the panel for context. */
  verdictBadge?: React.ReactNode;
}

/**
 * EvidencePanel — a right-side slide-over that opens when the user clicks
 * the "Evidence" button next to any candidate, network node, or mechanism
 * claim.
 *
 * Per spec:
 *   "Every candidate, network node, and mechanism claim has an 'Evidence'
 *    button that opens a panel showing: supporting spectral features,
 *    unmatched observed peaks (gaps), unmatched predicted peaks (gaps),
 *    cross-modal propagation chains, and citations."
 *
 * The panel never hides gaps: they appear in their own section, visually
 * distinct from supporting features. This is the platform's honesty
 * contract made literal.
 */
export function EvidencePanel({
  open,
  onOpenChange,
  title,
  subtitle,
  graph,
  unmatchedObserved,
  unmatchedPredicted,
  propagationChains,
  citations,
  verdictBadge,
}: EvidencePanelProps) {
  const supporting = graph.nodes.filter(
    (n) => n.type === "match" || n.type === "observation"
  );
  const gaps = graph.nodes.filter((n) => n.type === "gap");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg md:max-w-xl flex flex-col gap-0 p-0"
        aria-describedby="ep-desc"
      >
        <SheetHeader className="border-b p-4">
          <div className="flex items-center gap-2 pr-8">
            <Network
              aria-hidden="true"
              className="text-muted-foreground shrink-0"
              style={{ width: "1rem", height: "1rem" }}
            />
            <SheetTitle className="text-base leading-tight">{title}</SheetTitle>
          </div>
          {subtitle && <SheetDescription id="ep-desc">{subtitle}</SheetDescription>}
          {verdictBadge && <div className="pt-1">{verdictBadge}</div>}
        </SheetHeader>

        <ScrollArea className="flex-1" aria-label="Evidence panel body">
          <div className="space-y-5 p-4">
            {/* Graph */}
            <section aria-labelledby="ep-graph">
              <h3
                id="ep-graph"
                className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Evidence graph
              </h3>
              <div className="rounded-lg border bg-muted/30 p-2">
                <EvidenceGraph graph={graph} />
              </div>
              <Legend />
            </section>

            {/* Supporting features */}
            <section aria-labelledby="ep-support">
              <h3
                id="ep-support"
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"
              >
                <CheckCircle2
                  aria-hidden="true"
                  style={{ width: "0.85rem", height: "0.85rem" }}
                />
                Supporting features ({supporting.length})
              </h3>
              {supporting.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No supporting spectral features were recorded.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {supporting.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-2.5 py-1.5 dark:border-emerald-900 dark:bg-emerald-950/40"
                    >
                      <Badge className="shrink-0 border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                        {n.type}
                      </Badge>
                      <span className="leading-snug">{n.claim}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Gaps */}
            <section aria-labelledby="ep-gaps">
              <h3
                id="ep-gaps"
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400"
              >
                <AlertTriangle
                  aria-hidden="true"
                  style={{ width: "0.85rem", height: "0.85rem" }}
                />
                Gaps ({gaps.length})
              </h3>
              {gaps.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No gaps in this evidence chain.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {gaps.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50/60 px-2.5 py-1.5 dark:border-orange-900 dark:bg-orange-950/40"
                    >
                      <Badge className="shrink-0 border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300 text-[10px]">
                        gap
                      </Badge>
                      <span className="leading-snug">{n.claim}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Sub-gaps from the optional structured fields */}
              {(unmatchedObserved?.length || unmatchedPredicted?.length) && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {unmatchedObserved && unmatchedObserved.length > 0 && (
                    <div className="rounded-md border border-dashed border-orange-300 p-2 text-xs dark:border-orange-900">
                      <div className="mb-1 flex items-center gap-1 font-semibold text-orange-800 dark:text-orange-300">
                        <CircleDashed
                          aria-hidden="true"
                          style={{ width: "0.75rem", height: "0.75rem" }}
                        />
                        Unmatched observed
                      </div>
                      <ul className="space-y-1 text-muted-foreground">
                        {unmatchedObserved.map((g, i) => (
                          <li key={i} className="leading-snug">{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {unmatchedPredicted && unmatchedPredicted.length > 0 && (
                    <div className="rounded-md border border-dashed border-orange-300 p-2 text-xs dark:border-orange-900">
                      <div className="mb-1 flex items-center gap-1 font-semibold text-orange-800 dark:text-orange-300">
                        <CircleDashed
                          aria-hidden="true"
                          style={{ width: "0.75rem", height: "0.75rem" }}
                        />
                        Unmatched predicted
                      </div>
                      <ul className="space-y-1 text-muted-foreground">
                        {unmatchedPredicted.map((g, i) => (
                          <li key={i} className="leading-snug">{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Cross-modal propagation */}
            {propagationChains && propagationChains.length > 0 && (
              <section aria-labelledby="ep-prop">
                <h3
                  id="ep-prop"
                  className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Cross-modal propagation
                </h3>
                <ol className="space-y-1.5 text-sm">
                  {propagationChains.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-snug">{c}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Citations */}
            {citations && citations.length > 0 && (
              <section aria-labelledby="ep-cite">
                <h3
                  id="ep-cite"
                  className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <BookOpen
                    aria-hidden="true"
                    style={{ width: "0.85rem", height: "0.85rem" }}
                  />
                  Citations
                </h3>
                <ul className="space-y-1 text-sm">
                  {citations.map((c, i) => (
                    <li
                      key={i}
                      className="font-mono text-xs text-foreground underline-offset-2"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Legend() {
  const items = [
    { color: "#10b981", label: "Observation" },
    { color: "#6366f1", label: "Prediction" },
    { color: "#8b5cf6", label: "Match" },
    { color: "#f97316", label: "Gap", dashed: true },
  ];
  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className={cn("inline-block h-2 w-2 rounded-full")}
            style={{
              backgroundColor: it.dashed ? "transparent" : it.color,
              border: it.dashed ? `1.5px dashed ${it.color}` : `1.5px solid ${it.color}`,
            }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
