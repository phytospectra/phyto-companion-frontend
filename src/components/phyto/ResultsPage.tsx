"use client";

import * as React from "react";
import { FileText, Download, BookOpen, FlaskConical, Network as NetworkIcon, Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/phyto/layout/PageHeader";
import { VerdictBadge } from "@/components/phyto/common/VerdictBadge";
import { DisclaimerBanner } from "@/components/phyto/common/DisclaimerBanner";
import { SpectrumViewer } from "@/components/phyto/spectra/SpectrumViewer";
import { MOCK_CANDIDATE_RANKS, MOCK_MECHANISM_HYPOTHESIS, MOCK_RUN_STATE } from "@/lib/phyto/fixtures";
import { formatMz, formatPercent } from "@/lib/phyto/formatting";
import { APP_META } from "@/lib/phyto/constants";

interface ResultsPageProps {
  onNavigateToMechanism: () => void;
}

export function ResultsPage({ onNavigateToMechanism }: ResultsPageProps) {
  const top = MOCK_CANDIDATE_RANKS[0];
  const mech = MOCK_MECHANISM_HYPOTHESIS;

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ run: MOCK_RUN_STATE, candidates: MOCK_CANDIDATE_RANKS, mechanism: mech }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "phytospectra-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Report · run ${MOCK_RUN_STATE.run_id}`}
        title="Assembled report"
        description="A single, citation-bearing document you can hand to a reviewer. The mechanism section carries its disclaimer at the top; the provenance manifest is collapsible but never deleted."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportJson} className="gap-1.5">
              <Download aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              JSON
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              SDF
            </Button>
            <Button size="sm" className="gap-1.5">
              <FileText aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
              PDF
            </Button>
          </div>
        }
      />

      {/* Sample summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <SummaryItem label="Species" value="Camellia sinensis" />
          <SummaryItem label="Part" value="leaf" />
          <SummaryItem label="Extraction" value="maceration, EtOH/H2O 7:3" />
          <SummaryItem label="Workflow" value="identify" />
          <SummaryItem label="Model version" value={APP_META.model_version} mono />
          <SummaryItem label="Tokens used" value={String(MOCK_RUN_STATE.cost_so_far.tokens)} mono />
          <SummaryItem label="Run ID" value={MOCK_RUN_STATE.run_id} mono />
          <SummaryItem label="Verdict" value={MOCK_RUN_STATE.verdict ?? "—"} mono />
        </CardContent>
      </Card>

      {/* Top candidate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <FlaskConical aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
              Top candidate
            </span>
            <VerdictBadge verdict={top.verdict} />
          </CardTitle>
          <CardDescription>
            {top.candidate.name} · {top.candidate.formula} · {formatMz(top.candidate.exact_mass)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Stat label="Score" value={top.score.toFixed(2)} />
              <Stat label="Coverage" value={formatPercent(top.coverage)} />
              <Stat label="Margin" value={`${(top.margin * 100).toFixed(0)}%`} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Source
              </div>
              <div className="font-mono text-xs">{top.candidate.source}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Open gaps
              </div>
              <ul className="space-y-1 text-xs">
                {top.gaps.map((g, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 rounded-md border border-orange-200 bg-orange-50/50 px-2 py-1 dark:border-orange-900 dark:bg-orange-950/40"
                  >
                    <span className="text-orange-600 dark:text-orange-400">⚠</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <SpectrumViewer />
          </div>
        </CardContent>
      </Card>

      {/* Mechanism hypothesis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <NetworkIcon aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
            Mechanism hypothesis
          </CardTitle>
          <CardDescription>
            For {mech.compound}. Confidence {mech.confidence.toFixed(2)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DisclaimerBanner
            title="HYPOTHESIS (computational, not experimental)"
            variant="hypothesis"
          >
            The mechanism section below is an LLM-generated synthesis of
            literature and docking predictions. It is a starting point
            for experimental design — not a claim, not an identification.
          </DisclaimerBanner>
          <p className="text-sm leading-relaxed">{mech.proposed_mechanism}</p>
          <div className="flex flex-wrap gap-1.5">
            {mech.citations.map((c) => (
              <Badge key={c} variant="outline" className="font-mono text-[11px]">
                {c}
              </Badge>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={onNavigateToMechanism} className="gap-1.5">
            <Sparkles aria-hidden="true" style={{ width: "0.85rem", height: "0.85rem" }} />
            Open in Pharmacology
          </Button>
        </CardContent>
      </Card>

      {/* Recommended experiments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
            Recommended experiments
          </CardTitle>
          <CardDescription>
            Orthogonal validations the platform suggests, given the open
            gaps above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="font-mono text-xs text-muted-foreground">01.</span>
              <span>
                Acquire HMBC/NOESY on the unmatched <span className="font-mono">m/z 165.0188</span> peak
                to localise the methoxy adduct site.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-xs text-muted-foreground">02.</span>
              <span>
                Run synthetic quercetin standard under identical LC-MS
                conditions to confirm retention time and MS2 fragmentation
                pattern.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-xs text-muted-foreground">03.</span>
              <span>
                Thermal shift assay on purified PI3Kα with/without quercetin
                to validate the binding-pose hypothesis (mechanism gap h7).
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Provenance manifest */}
      <Collapsible>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" style={{ width: "1rem", height: "1rem" }} />
                  Provenance manifest
                </span>
                <Badge variant="outline" className="text-[10px]">
                  expand
                </Badge>
              </CardTitle>
              <CardDescription>
                Full chain of tools, model versions, and checkpoint
                decisions that produced this report.
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <ol className="space-y-1.5 text-xs font-mono">
                {MOCK_RUN_STATE.audit_tail.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">
                      {new Date(e.ts).toISOString().slice(11, 19)}
                    </span>
                    <span className="text-foreground">{e.event}</span>
                    <span className="text-muted-foreground truncate">· {e.detail}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

function SummaryItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={mono ? "mt-0.5 font-mono text-sm" : "mt-0.5 text-sm"}>{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm tabular-nums">{value}</div>
    </div>
  );
}
