"use client";

import * as React from "react";
import { Sparkles, BookOpen, Brain, Target, GitBranch, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/phyto/layout/PageHeader";
import { DisclaimerBanner } from "@/components/phyto/common/DisclaimerBanner";
import { CostBadge } from "@/components/phyto/common/CostBadge";
import { EvidencePanel } from "@/components/phyto/evidence/EvidencePanel";
import { mockApi, newIdempotencyKey } from "@/lib/phyto/mock-api";
import { PRICING_TABLE } from "@/lib/phyto/constants";
import { formatPercent } from "@/lib/phyto/formatting";
import type { MechanismHypothesis } from "@/lib/phyto/types";

export function PharmacologyPage() {
  const [hypo, setHypo] = React.useState<MechanismHypothesis | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [rejected, setRejected] = React.useState(false);
  const [evidenceOpen, setEvidenceOpen] = React.useState(false);
  const [explainText, setExplainText] = React.useState<string | null>(null);
  const [explaining, setExplaining] = React.useState(false);

  async function generate() {
    setLoading(true);
    setRejected(false);
    try {
      const h = await mockApi.hypothesizeMechanism(newIdempotencyKey());
      setHypo(h);
    } catch {
      // 402 handled globally
    } finally {
      setLoading(false);
    }
  }

  async function explain() {
    if (!hypo) return;
    setExplaining(true);
    try {
      const t = await mockApi.explainHypothesis(hypo, newIdempotencyKey());
      setExplainText(t);
    } finally {
      setExplaining(false);
    }
  }

  function reject() {
    setRejected(true);
    toast({
      title: "Hypothesis rejected",
      description: "Rejection logged to audit tail with your implicit reason.",
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pharmacology"
        title="Mechanism hypothesis"
        description="A literature-grounded, LLM-generated hypothesis of how the top candidate might act on its targets. This is explicitly a HYPOTHESIS — not an identification, not a recommendation, not a substitute for experiment."
        actions={
          <Button onClick={generate} disabled={loading} className="gap-1.5">
            <Brain aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
            {loading ? "Generating…" : "Generate hypothesis"}
            {!loading && (
              <CostBadge cost={PRICING_TABLE.pharmacology_mechanism} operation="Generate mechanism hypothesis" />
            )}
          </Button>
        }
      />

      {loading && <HypothesisSkeleton />}

      {!loading && !hypo && (
        <Card>
          <CardContent className="grid place-items-center py-16 text-center">
            <div className="space-y-2">
              <Brain aria-hidden="true" style={{ width: "2rem", height: "2rem" }} className="mx-auto text-muted-foreground" />
              <div className="text-sm font-medium">No hypothesis yet</div>
              <p className="text-xs text-muted-foreground max-w-sm">
                Click <span className="font-semibold">Generate hypothesis</span> to
                run target prediction → network pharmacology → literature synthesis →
                LLM hypothesis. Each phase costs tokens.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && hypo && (
        <div className="space-y-6">
          {/* Disclaimer at the TOP of the panel — never buried */}
          <DisclaimerBanner
            title="HYPOTHESIS (computational, not experimental)"
            variant="hypothesis"
          >
            The mechanism below is an LLM-generated synthesis of literature
            and docking predictions for <strong>{hypo.compound}</strong>.
            It is a starting point for experimental design, not a claim.
            Confidence is{" "}
            <span className="font-mono">{hypo.confidence.toFixed(2)}</span>; the
            dominant uncertainty is flagged in the evidence graph (look
            for the orange node).
          </DisclaimerBanner>

          {rejected && (
            <DisclaimerBanner title="Hypothesis rejected" variant="warning">
              You have rejected this hypothesis. The rejection is logged
              to the audit tail. The hypothesis text remains visible for
              your reference.
            </DisclaimerBanner>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Sparkles aria-hidden="true" style={{ width: "1rem", height: "1rem" }} className="text-orange-500" />
                  Proposed mechanism
                </span>
                <Badge variant="outline" className="text-xs">
                  confidence {hypo.confidence.toFixed(2)}
                </Badge>
              </CardTitle>
              <CardDescription>
                LLM provider: vertex · model: phyto-orchestrator-v0.4.2 · context papers: {hypo.citations.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{hypo.proposed_mechanism}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Top targets
                  </div>
                  <ul className="space-y-1.5">
                    {hypo.top_targets.map((t) => (
                      <li
                        key={t.target_id}
                        className="flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">{t.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {t.target_id} · {t.method}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono tabular-nums">
                            {t.confidence.toFixed(2)}
                          </span>
                          {t.citation && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {t.citation}
                            </Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Top pathways (FDR)
                  </div>
                  <ul className="space-y-1.5">
                    {hypo.top_pathways.map((p) => (
                      <li
                        key={p.pathway_id}
                        className="flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">{p.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {p.pathway_id}
                          </div>
                        </div>
                        <span className="font-mono tabular-nums text-rose-700 dark:text-rose-400">
                          FDR {p.fdr.toFixed(4)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Citations */}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <BookOpen aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
                  Citations ({hypo.citations.length})
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {hypo.citations.map((c) => (
                    <li key={c}>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {c}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEvidenceOpen(true)} className="gap-1.5">
                  <GitBranch aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
                  Open evidence graph
                </Button>
                <Button variant="outline" size="sm" onClick={explain} disabled={explaining} className="gap-1.5">
                  <Brain aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
                  {explaining ? "Explaining…" : "Explain (LLM)"}
                  {!explaining && <CostBadge cost={PRICING_TABLE.llm_explain} operation="LLM explain" />}
                </Button>
                <Button variant="outline" size="sm" onClick={reject} className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950 dark:hover:text-rose-300">
                  <XCircle aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
                  Reject hypothesis
                </Button>
              </div>

              {explainText && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    LLM explanation
                  </div>
                  {explainText}
                </div>
              )}
            </CardContent>
          </Card>

          <EvidencePanel
            open={evidenceOpen}
            onOpenChange={setEvidenceOpen}
            title={`Mechanism evidence · ${hypo.compound}`}
            subtitle="Hypothesis confidence and its supporting / gap claims"
            graph={hypo.evidence}
            citations={hypo.citations}
            verdictBadge={
              <DisclaimerBanner title="Hypothesis" variant="info">
                This evidence graph supports a hypothesis, not an identification.
                Confidence {hypo.confidence.toFixed(2)}.
              </DisclaimerBanner>
            }
          />
        </div>
      )}
    </div>
  );
}

function HypothesisSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
