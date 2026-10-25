/**
 * GAP-AUDIT TEST (2026-10-22) — evidence of what the result panel actually
 * renders when fed the post-frontend backend features (isolation MVP,
 * chromatography evidence layers ADR-0061..0066, governance fields,
 * msi_level, layer skip reasons).
 *
 * The fixture (src/__fixtures__/rich_identify_response.json) was captured
 * from the real backend local plane: a rich identify dry-run with every
 * layer's metadata, a seeded isolation record and taxon metadata, plus the
 * REAL layer chain run over the elucidate ranks.
 *
 * The production ResultsPage takes no payload props (it renders lib/phyto
 * fixtures), so the audit renders it as-is AND renders the fixture-derived
 * data through the components that exist (EvidencePanel, VerdictBadge) and
 * records in the snapshot which backend features surface and which do not.
 *
 * This test is an audit artifact — do not delete it; its snapshot is the
 * baseline evidence for the frontend gap audit (see
 * HANDOFF_frontend_gap_audit.md).
 */
import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ResultsPage } from "@/components/phyto/ResultsPage";
import { EvidencePanel } from "@/components/phyto/evidence/EvidencePanel";
import { VerdictBadge } from "@/components/phyto/common/VerdictBadge";
import type { EvidenceGraph as EvidenceGraphT } from "@/lib/phyto/types";
import richIdentify from "@/__fixtures__/rich_identify_response.json";

/** Convert the backend EvidenceGraph (EvidenceItem list) to the FE shape. */
function toFeGraph(
  backend: {
    node_id: string;
    claim: string;
    confidence: number;
    evidence: Array<{
      source_spectrum: string;
      spectral_feature: string;
      relation: string;
      strength: number;
    }>;
    gaps: string[];
  },
): EvidenceGraphT {
  const nodes: EvidenceGraphT["nodes"] = [
    {
      id: backend.node_id,
      claim: backend.claim,
      type: "observation",
      confidence: backend.confidence,
    },
    ...backend.evidence.map((e, i) => ({
      id: `ev-${i}`,
      claim: `${e.relation}: ${e.spectral_feature} (source ${e.source_spectrum}, strength ${e.strength})`,
      type: "match" as const,
      confidence: e.strength,
    })),
    ...backend.gaps.map((g, i) => ({
      id: `gap-${i}`,
      claim: g,
      type: "gap" as const,
    })),
  ];
  const edges = backend.evidence.map((_, i) => ({
    source: `ev-${i}`,
    target: backend.node_id,
    relation: "supports" as const,
  }));
  return { nodes, edges };
}

describe("result panel gap audit (post-frontend backend features)", () => {
  it("matches the production ResultsPage snapshot (mock-fed, as shipped)", () => {
    const { container } = render(
      <TooltipProvider delayDuration={0}>
        <ResultsPage onNavigateToMechanism={() => {}} />
      </TooltipProvider>,
    );
    expect(container).toMatchSnapshot();
  });

  it("renders the rich payload's top-rank evidence through the existing EvidencePanel", () => {
    const ranks =
      richIdentify.layer_chain_over_ranks.ranks ??
      richIdentify.task_outputs["apply-chromatography-layers"].ranks;
    const top = ranks[0];
    const graph = toFeGraph(top.evidence_graph);
    const relations = top.evidence_graph.evidence.map(
      (e: { relation: string }) => e.relation,
    );
    // The Sheet portals into document.body, so snapshot the body to
    // capture what the user actually sees (panel + badge). The backend
    // verdict enum is lowercase ("tentative") while the FE Verdict union is
    // uppercase, so we map explicitly rather than casting.
    render(
      <TooltipProvider delayDuration={0}>
        <VerdictBadge
          verdict={
            top.verdict.toUpperCase() === "CONFIRMED"
              ? "CONFIRMED"
              : top.verdict.toUpperCase() === "AMBIGUOUS"
                ? "AMBIGUOUS"
                : top.verdict.toUpperCase() === "ABSTAIN"
                  ? "ABSTAIN"
                  : "TENTATIVE"
          }
        />
        <EvidencePanel
          open
          onOpenChange={() => {}}
          title={`${top.candidate.name} — evidence`}
          subtitle={`score ${top.score} · chain ${top.classification_chain?.join(" → ") ?? "none"}`}
          graph={graph}
        />
      </TooltipProvider>,
    );
    expect(document.body).toMatchSnapshot();

    // What the panel DOES surface for the rich payload:
    for (const r of relations) {
      expect(screen.getAllByText(new RegExp(r.replace(/[:()\\]/g, "\\$&"), "i")).length).toBeGreaterThan(0);
    }
    // The chain + verdict badges render when wired manually (the fixture's
    // lowercase backend enum is uppercased for the FE Verdict union).
    expect(screen.getByText(/TENTATIVE/i)).toBeInTheDocument();
  });

  it("documents which backend features the production panel does NOT surface", () => {
    render(
      <TooltipProvider delayDuration={0}>
        <ResultsPage onNavigateToMechanism={() => {}} />
      </TooltipProvider>,
    );
    // Grep the rendered DOM for each backend feature name.
    const body = document.body;
    const has = (re: RegExp) => re.test(body.textContent ?? "");

    const absent: string[] = [];
    const present: string[] = [];
    const featureNames: Array<[string, RegExp, boolean]> = [
      // [feature, pattern, expectedPresentInProductionPanel]
      ["isolation evidence section", /isolation/i, false],
      ["isolation_bonus", /isolation_bonus/i, false],
      ["classification_chain", /classification_chain|evidence chain/i, false],
      ["evidence_chain (layer items)", /layer skipped|layers applied/i, false],
      ["msi_level / top_candidate_msi_level", /msi level|msi_level/i, false],
      ["UV chromophore evidence", /flavonol|uv chromophore/i, false],
      ["RT prediction evidence", /rt prediction|retention time prediction/i, false],
      ["level_1_match / reference standard", /level[- ]?1/i, false],
      ["purity_score / peak purity", /purity/i, false],
      ["taxon prior", /taxon prior/i, false],
      ["layer skip reasons", /layer skipped/i, false],
      ["data governance (data_tier/abs_status)", /abs status|data tier/i, false],
    ];
    const observed: Array<{ feature: string; rendered: boolean; expected: boolean }> = [];
    for (const [feature, re, expected] of featureNames) {
      const rendered = has(re);
      observed.push({ feature, rendered, expected });
      if (rendered) present.push(feature);
      else absent.push(feature);
      expect(rendered).toBe(expected);
    }
    // Snapshot the audit matrix itself.
    expect(observed).toMatchSnapshot("backend-feature-visibility-matrix");
    // eslint-disable-next-line no-console
    console.log("ABSENT FROM PANEL:", absent.join(", "));
  });

  it("shows the fixture's summary-level report lines are not rendered anywhere", () => {
    const summary = richIdentify.analysis_response.summary as Record<string, unknown>;
    // These are the strings the backend puts in the report for a human:
    expect(summary.isolation_layer).toBe("applied");
    expect(
      (summary.chromatography_layers as Record<string, unknown>).top_candidate_msi_level,
    ).toBe(2);
    const { container } = render(
      <TooltipProvider delayDuration={0}>
        <ResultsPage onNavigateToMechanism={() => {}} />
      </TooltipProvider>,
    );
    const withinPanel = within(container);
    expect(withinPanel.queryByText(/isolation_layer/i)).toBeNull();
    expect(withinPanel.queryByText(/top_candidate_msi_level/i)).toBeNull();
    expect(container).toMatchSnapshot("summary-lines-absence");
  });
});