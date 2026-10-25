/**
 * Contract-type fix tests (frontend follow-up pass 1).
 *
 * Each test pins the correct render of a representative backend value for
 * the three silent-corruption type bugs fixed in pass 1:
 *
 *   1. `tied_candidates`: number → string[]  (backend CandidateRank.tied_candidates
 *      is list[str] of candidate ids, shared/phyto_shared/models.py:431)
 *   2. `formula`: string → {counts: Record<string, number>}  (backend
 *      MolecularFormula, shared/phyto_shared/models.py:225-288)
 *   3. `margin`: number → number | null, with ±Infinity possible  (backend
 *      margin is "float | None ... may be inf", models.py:427-429)
 *
 * Edge cases: empty tie list, unicode-free Hill ordering, null margin,
 * +Infinity margin. None of these may render as "NaN%" or "[object Object]".
 */
import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UncertaintyBadge } from "@/components/phyto/common/UncertaintyBadge";
import {
  formatFormula,
  formatMargin,
  formulaMatches,
  formatRankInterval,
} from "@/lib/phyto/formatting";
import type { CandidateRank } from "@/lib/phyto/types";

function rank(overrides: Partial<CandidateRank>): CandidateRank {
  return {
    candidate: {
      id: "cand_x",
      name: "X",
      smiles: "C",
      formula: { counts: { C: 1 } },
      exact_mass: 12,
      provenance: "experimental",
      source: "test",
    },
    score: 0.5,
    coverage: 0.5,
    margin: 0.1,
    ranking_interval: [1, 1],
    ranking_convention: "lower_is_better",
    verdict: "TENTATIVE",
    tied_candidates: [],
    gaps: [],
    ...overrides,
  };
}

describe("tied_candidates (backend list[str])", () => {
  it("counts tied candidate ids and renders 'tied with N'", () => {
    render(
      <TooltipProvider delayDuration={0}>
        <UncertaintyBadge
          rank={rank({
            tied_candidates: ["cand_a", "cand_b"],
            ranking_interval: [1, 1],
          })}
        />
      </TooltipProvider>,
    );
    expect(screen.getByText(/tied with 2/)).toBeInTheDocument();
  });

  it("renders 'Rank 1' with no tie when the list is empty", () => {
    expect(
      formatRankInterval(rank({ tied_candidates: [], ranking_interval: [1, 1] })),
    ).toBe("Rank 1");
  });

  it("formatRankInterval counts ids, not raw list length misuse", () => {
    expect(
      formatRankInterval(
        rank({ tied_candidates: ["cand_a"], ranking_interval: [1, 1] }),
      ),
    ).toBe("Rank 1 (tied with 1)");
  });
});

describe("formula (backend MolecularFormula {counts})", () => {
  it("renders Hill notation identically to the backend's __str__", () => {
    // Backend: MolecularFormula(counts={"C":15,"H":10,"O":7}) -> "C15H10O7"
    expect(formatFormula({ counts: { C: 15, H: 10, O: 7 } })).toBe("C15H10O7");
    // Hill order: C, H, then alphabetical — N before O even if input is not.
    expect(formatFormula({ counts: { O: 2, N: 4, C: 8, H: 10 } })).toBe(
      "C8H10N4O2",
    );
    // No carbon: fully alphabetical.
    expect(formatFormula({ counts: { N: 1, H: 3 } })).toBe("H3N");
  });

  it("never renders '[object Object]'", () => {
    render(
      <TooltipProvider delayDuration={0}>
        <span data-testid="f">{formatFormula({ counts: { C: 6, H: 6 } })}</span>
      </TooltipProvider>,
    );
    expect(screen.getByTestId("f").textContent).toBe("C6H6");
    expect(screen.getByTestId("f").textContent).not.toContain("object Object");
  });

  it("search helper matches against the Hill-notation string", () => {
    expect(formulaMatches({ counts: { C: 15, H: 10, O: 7 } }, "C15H10")).toBe(
      true,
    );
    expect(formulaMatches({ counts: { C: 15, H: 10, O: 7 } }, "C16")).toBe(
      false,
    );
  });
});

describe("margin (backend float | None, may be inf)", () => {
  it("renders a normal margin as a percentage", () => {
    expect(formatMargin(0.12)).toBe("12%");
  });

  it("renders null margin as '—' (no distinct competitor), never NaN%", () => {
    expect(formatMargin(null)).toBe("—");
    expect(formatMargin(undefined)).toBe("—");
    const rendered = formatMargin(null);
    expect(rendered).not.toMatch(/NaN/);
  });

  it("renders +Infinity as '∞', never 'Infinity%'", () => {
    expect(formatMargin(Number.POSITIVE_INFINITY)).toBe("∞");
    expect(formatMargin(Number.POSITIVE_INFINITY)).not.toMatch(/NaN|Infinity/);
  });

  it("UncertaintyBadge: null margin shows no small-margin warning", () => {
    render(
      <TooltipProvider delayDuration={0}>
        <UncertaintyBadge rank={rank({ margin: null })} />
      </TooltipProvider>,
    );
    expect(screen.queryByText(/margin /)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it("UncertaintyBadge: infinite margin is not a small margin — no warning, no NaN", () => {
    // An infinite margin means no distinct competitor: the small-margin
    // warning must NOT fire, and nothing may render NaN or Infinity%.
    render(
      <TooltipProvider delayDuration={0}>
        <UncertaintyBadge rank={rank({ margin: Number.POSITIVE_INFINITY })} />
      </TooltipProvider>,
    );
    expect(screen.queryByText(/margin /)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity%/);
  });

  it("ResultsPage-style Stat renders ∞ for an infinite margin", () => {
    // The Stat pattern ResultsPage/ElucidationPage use after the fix.
    expect(formatMargin(Number.POSITIVE_INFINITY)).toBe("∞");
  });

  it("UncertaintyBadge: small finite margin keeps the warning", () => {
    render(
      <TooltipProvider delayDuration={0}>
        <UncertaintyBadge rank={rank({ margin: 0.03 })} />
      </TooltipProvider>,
    );
    expect(screen.getByText(/margin 3%/)).toBeInTheDocument();
  });
});