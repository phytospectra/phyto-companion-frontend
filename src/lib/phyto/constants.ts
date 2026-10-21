import type { TokenPack, Verdict, WorkflowMeta } from "./types";

/**
 * Pricing table — mirrors what the backend would expose via GET /tools.
 * Every metered operation has an explicit token cost. The frontend shows
 * this cost before the user authorises the operation (CostBadge).
 */
export const PRICING_TABLE = {
  run_analysis: 10,
  network_ms2: 4,
  network_hsqc: 3,
  network_fused: 5,
  network_bioactivity: 6,
  elucidate_candidates: 8,
  elucidate_novel: 12,
  elucidate_localize: 6,
  metabolomics_step: 5,
  pharmacology_targets: 5,
  pharmacology_network: 7,
  pharmacology_mechanism: 15,
  llm_explain: 3,
  llm_hypothesize: 5,
  nmr_search: 2,
} as const;

export type MeteredOperationId = keyof typeof PRICING_TABLE;

/**
 * The four workflows a user can launch from the Upload page. Each carries an
 * estimated total token cost so the user can compare before committing.
 */
export const WORKFLOWS: WorkflowMeta[] = [
  {
    id: "identify",
    label: "Identify",
    description:
      "Rank known candidates against observed spectra. Best when you have a suspected compound family.",
    estimated_tokens: 28,
    steps: ["Detect", "Network MS2", "Elucidate", "Report"],
  },
  {
    id: "compare",
    label: "Compare",
    description:
      "Differential analysis between sample groups. Produces feature table, volcano plot, and pathway enrichment.",
    estimated_tokens: 42,
    steps: ["Detect", "Normalize", "Statistics", "Differential", "Enrich"],
  },
  {
    id: "novelty",
    label: "Novelty",
    description:
      "Generate novel structural relatives of a top-1 candidate and localise the edit site.",
    estimated_tokens: 35,
    steps: ["Elucidate", "Novel", "Localize", "Report"],
  },
  {
    id: "mechanism_hypothesis",
    label: "Mechanism Hypothesis",
    description:
      "Generate a literature-grounded mechanism hypothesis. Output is explicitly a hypothesis, not an identification.",
    estimated_tokens: 50,
    steps: ["Targets", "Network", "Literature", "Hypothesize"],
  },
];

/**
 * Verdict metadata: color token (Tailwind class fragment) + short label +
 * longer tooltip definition. Every verdict badge shows color AND text AND a
 * tooltip — never color alone.
 */
export interface VerdictMeta {
  color: "emerald" | "amber" | "rose" | "violet" | "slate" | "orange";
  short: string;
  definition: string;
}

export const VERDICT_META: Record<Verdict, VerdictMeta> = {
  CONFIRMED: {
    color: "emerald",
    short: "Confirmed",
    definition:
      "Multiple independent spectral features match a reference at the species level. Suitable for publication as an identification (subject to reviewer sign-off).",
  },
  TENTATIVE: {
    color: "amber",
    short: "Tentative",
    definition:
      "Most features match a reference, but at least one unexplained peak remains. Report as 'putatively identified' and recommend confirmatory experiment.",
  },
  AMBIGUOUS: {
    color: "rose",
    short: "Ambiguous",
    definition:
      "Two or more candidates are statistically indistinguishable given the evidence. Do not select one. Report the tie.",
  },
  CANDIDATE: {
    color: "violet",
    short: "Candidate",
    definition:
      "A plausible structural candidate from the search space, but evidence is insufficient to advance it past candidate status.",
  },
  ABSTAIN: {
    color: "slate",
    short: "Abstain",
    definition:
      "The system declines to rank this candidate. Common cause: coverage below the minimum threshold or conflicting modalities.",
  },
  NOVELTY_FLAGGED: {
    color: "orange",
    short: "Novelty-flagged",
    definition:
      "No known reference matches the observed features. Flagged as a potential novel structure. Requires synthetic confirmation before any publication claim.",
  },
};

/**
 * Token packs available for purchase via Stripe Checkout.
 */
export const TOKEN_PACKS: TokenPack[] = [
  {
    id: "pack_100",
    tokens: 100,
    price_usd: 9,
    label: "Starter",
  },
  {
    id: "pack_500",
    tokens: 500,
    price_usd: 39,
    label: "Researcher",
    popular: true,
  },
  {
    id: "pack_2000",
    tokens: 2000,
    price_usd: 129,
    label: "Lab",
  },
];

/** New users get 50 free tokens. */
export const FREE_TOKENS_ON_SIGNUP = 50;

/**
 * App-level constants.
 */
export const APP_META = {
  name: "Phytospectra",
  tagline: "An honest companion for natural product drug discovery",
  version: "0.1.0-demo",
  model_version: "phyto-orchestrator-v0.4.2",
} as const;
