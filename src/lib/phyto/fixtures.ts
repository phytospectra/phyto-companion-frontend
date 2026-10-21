import type {
  AuditEntry,
  CandidateRank,
  Checkpoint,
  EvidenceGraph,
  MechanismHypothesis,
  Network,
  RunState,
  SiteLocalization,
  Task,
  TokenBalance,
  BillingTransaction,
} from "./types";
import { APP_META } from "./constants";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const MOCK_USER = {
  uid: "phyto-user-001",
  email: "researcher@phytospectra.com",
  displayName: "Dr. M. Rivera",
  institution: "Institute for Natural Products Research",
};

export const MOCK_BALANCE: TokenBalance = {
  balance: 50,
  user_id: MOCK_USER.uid,
  last_updated: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Evidence graphs
// ---------------------------------------------------------------------------

const evidenceForQuercetin: EvidenceGraph = {
  nodes: [
    { id: "n1", claim: "MS2 fragment at m/z 137.0233 (C7H5O2+)", type: "observation", confidence: 0.98 },
    { id: "n2", claim: "MS2 fragment at m/z 153.0181 (C7H5O3+)", type: "observation", confidence: 0.97 },
    { id: "n3", claim: "Predicted fragment 137.0233 from quercetin cleavage (retro-Diels-Alder)", type: "prediction", confidence: 0.94 },
    { id: "n4", claim: "Predicted fragment 153.0181 from quercetin cleavage", type: "prediction", confidence: 0.91 },
    { id: "n5", claim: "Match: 137.0233 observed ↔ predicted (Δ = 0.8 ppm)", type: "match", confidence: 0.99 },
    { id: "n6", claim: "Match: 153.0181 observed ↔ predicted (Δ = 1.2 ppm)", type: "match", confidence: 0.98 },
    { id: "n7", claim: "Unmatched observed peak at m/z 165.0188 — possible methoxy adduct", type: "gap", confidence: 0.4 },
    { id: "n8", claim: "Unmatched predicted peak at m/z 121.0284 (low-abundance, may be below noise floor)", type: "gap", confidence: 0.3 },
  ],
  edges: [
    { source: "n1", target: "n5", relation: "supports" },
    { source: "n3", target: "n5", relation: "supports" },
    { source: "n2", target: "n6", relation: "supports" },
    { source: "n4", target: "n6", relation: "supports" },
    { source: "n7", target: "n5", relation: "gap" },
    { source: "n7", target: "n6", relation: "gap" },
    { source: "n8", target: "n5", relation: "gap" },
  ],
};

// ---------------------------------------------------------------------------
// Candidate ranks — covers every verdict + a tie + an abstain
// ---------------------------------------------------------------------------

export const MOCK_CANDIDATE_RANKS: CandidateRank[] = [
  {
    candidate: {
      id: "cand_quercetin",
      name: "Quercetin",
      smiles: "O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc1c2",
      formula: "C15H10O7",
      exact_mass: 302.0427,
      provenance: "experimental",
      source: "LOTUS_isolate_4127",
    },
    score: 0.91,
    coverage: 0.88,
    margin: 0.12,
    ranking_interval: [1, 1],
    ranking_convention: "lower_is_better",
    verdict: "CONFIRMED",
    tied_candidates: 0,
    evidence_graph: evidenceForQuercetin,
    gaps: [
      "Unmatched observed peak at m/z 165.0188 — possible methoxy adduct",
      "Unmatched predicted peak at m/z 121.0284 — low-abundance, may be below noise floor",
    ],
  },
  {
    candidate: {
      id: "cand_kaempferol",
      name: "Kaempferol",
      smiles: "O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc1c2",
      formula: "C15H10O6",
      exact_mass: 286.0477,
      provenance: "experimental",
      source: "LOTUS_isolate_2114",
    },
    score: 0.74,
    coverage: 0.71,
    margin: 0.05,
    ranking_interval: [2, 3],
    ranking_convention: "lower_is_better",
    verdict: "TENTATIVE",
    tied_candidates: 1,
    gaps: [
      "Missing fragment at m/z 121.0284 (Kaempferin marker)",
      "Hydrogen count mismatch on ring B",
    ],
  },
  {
    candidate: {
      id: "cand_isorhamnetin",
      name: "Isorhamnetin",
      smiles: "COc1cc(-c2c(O)c(O)c3oc(cc(=O)c23)c2ccc(O)c(O)c2)cc1O",
      formula: "C16H12O7",
      exact_mass: 316.0583,
      provenance: "predicted",
      source: "in_silico_BRF_v3",
    },
    score: 0.72,
    coverage: 0.69,
    margin: 0.02,
    ranking_interval: [2, 3],
    ranking_convention: "lower_is_better",
    verdict: "TENTATIVE",
    tied_candidates: 1,
    gaps: ["Methoxy feature at m/z 165.0188 unexplained by other candidates"],
  },
  {
    candidate: {
      id: "cand_luteolin",
      name: "Luteolin",
      smiles: "O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc1c2",
      formula: "C15H10O6",
      exact_mass: 286.0477,
      provenance: "experimental",
      source: "LOTUS_isolate_9821",
    },
    score: 0.55,
    coverage: 0.58,
    margin: 0.18,
    ranking_interval: [4, 4],
    ranking_convention: "lower_is_better",
    verdict: "AMBIGUOUS",
    tied_candidates: 0,
    gaps: ["3 of 6 diagnostic fragments absent", "Cross-modal HSQC pattern inconsistent"],
  },
  {
    candidate: {
      id: "cand_apigenin",
      name: "Apigenin",
      smiles: "O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc1c2",
      formula: "C15H10O5",
      exact_mass: 270.0528,
      provenance: "synthetic",
      source: "synthetic_library_001",
    },
    score: 0.34,
    coverage: 0.41,
    margin: 0.21,
    ranking_interval: [5, 6],
    ranking_convention: "lower_is_better",
    verdict: "CANDIDATE",
    tied_candidates: 1,
    gaps: ["Molecular formula mismatch (O5 vs observed O7)", "Two missing fragments"],
  },
  {
    candidate: {
      id: "cand_chrysin",
      name: "Chrysin",
      smiles: "O=c1c(O)c(-c2ccc(O)c(O)c2)oc2ccccc1c2",
      formula: "C15H10O4",
      exact_mass: 254.0579,
      provenance: "experimental",
      source: "LOTUS_isolate_4409",
    },
    score: 0.31,
    coverage: 0.38,
    margin: 0.03,
    ranking_interval: [5, 6],
    ranking_convention: "lower_is_better",
    verdict: "CANDIDATE",
    tied_candidates: 1,
    gaps: ["Missing 3 of 4 oxygen-bearing fragments", "A-ring substitution pattern incompatible"],
  },
  {
    candidate: {
      id: "cand_galangin",
      name: "Galangin",
      smiles: "O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc1c2",
      formula: "C15H10O6",
      exact_mass: 286.0477,
      provenance: "experimental",
      source: "LOTUS_isolate_7733",
    },
    score: 0.12,
    coverage: 0.18,
    margin: 0.0,
    ranking_interval: [7, 9],
    ranking_convention: "lower_is_better",
    verdict: "ABSTAIN",
    tied_candidates: 2,
    gaps: ["Coverage below 0.20 threshold — system declines to rank"],
  },
  {
    candidate: {
      id: "cand_novel_unknown",
      name: "Putative novel flavonoid (provisional)",
      smiles: "COc1cc(-c2c(O)c(O)c3oc(cc(=O)c23)c2ccc(OC)c(O)c2)cc1O",
      formula: "C17H14O7",
      exact_mass: 330.0740,
      provenance: "structure_only",
      source: "de_novo_proposal_run_a1",
    },
    score: 0.08,
    coverage: 0.14,
    margin: 0.0,
    ranking_interval: [10, 12],
    ranking_convention: "lower_is_better",
    verdict: "NOVELTY_FLAGGED",
    tied_candidates: 2,
    gaps: [
      "No reference compound matches the observed HRMS formula",
      "5 of 6 MS2 fragments are novel — proposed structure is a hypothesis, not an identification",
    ],
  },
];

// ---------------------------------------------------------------------------
// Site localization for the novelty case
// ---------------------------------------------------------------------------

export const MOCK_SITE_LOCALIZATION: SiteLocalization = {
  parent_smiles: "O=c1c(O)c(-c2ccc(O)c(O)c2)oc2cc(O)cc1c2",
  novel_smiles: "COc1cc(-c2c(O)c(O)c3oc(cc(=O)c23)c2ccc(OC)c(O)c2)cc1O",
  edit_atom_index: 17,
  edit_type: "hydroxy → methoxy substitution",
  localization_confidence: 0.83,
  n_possible_sites: 3,
  rank_of_true_site: 1,
  competing_sites: [17, 4, 13],
};

// ---------------------------------------------------------------------------
// Networks (4 modalities) — a small, readable graph
// ---------------------------------------------------------------------------

const baseNodes = [
  { id: "n1", label: "m/z 303.05", modality: "MS2" as const, annotation: { name: "Quercetin [M+H]+", msi_level: 2 } },
  { id: "n2", label: "m/z 287.06", modality: "MS2" as const, annotation: { name: "Kaempferol [M+H]+", msi_level: 2 } },
  { id: "n3", label: "m/z 317.07", modality: "MS2" as const, annotation: { name: "Isorhamnetin [M+H]+", msi_level: 2 } },
  { id: "n4", label: "m/z 271.06", modality: "MS2" as const, annotation: { name: "Apigenin [M+H]+", msi_level: 2 } },
  { id: "n5", label: "m/z 301.07", modality: "MS2" as const },
  { id: "n6", label: "HSQC C-3/H-2", modality: "HSQC" as const },
  { id: "n7", label: "HSQC C-6/H-6", modality: "HSQC" as const },
  { id: "n8", label: "HSQC C-8/H-8", modality: "HSQC" as const },
  { id: "n9", label: "HSQC C-3'/H-3'", modality: "HSQC" as const },
  { id: "n10", label: "HSQC C-2'/H-2'", modality: "HSQC" as const },
];

const ms2Edges = [
  { source: "n1", target: "n2", modality: "MS2" as const, score: 0.82, is_transitive: false },
  { source: "n1", target: "n3", modality: "MS2" as const, score: 0.71, is_transitive: false },
  { source: "n2", target: "n4", modality: "MS2" as const, score: 0.55, is_transitive: false },
  { source: "n1", target: "n5", modality: "MS2" as const, score: 0.43, is_transitive: false },
  { source: "n3", target: "n5", modality: "MS2" as const, score: 0.31, is_transitive: true },
];

const hsqcEdges = [
  { source: "n6", target: "n7", modality: "HSQC" as const, score: 0.92, is_transitive: false },
  { source: "n7", target: "n8", modality: "HSQC" as const, score: 0.88, is_transitive: false },
  { source: "n9", target: "n10", modality: "HSQC" as const, score: 0.85, is_transitive: false },
  { source: "n6", target: "n8", modality: "HSQC" as const, score: 0.74, is_transitive: true },
];

// Fused = same nodes but tagged "both" where the same scaffold appears in
// both modalities; edges keep their modality, plus a cross-modal link.
const fusedNodes = baseNodes.map((n) =>
  n.id === "n1" || n.id === "n2" || n.id === "n4"
    ? { ...n, modality: "both" as const }
    : n
);
const fusedEdges = [
  ...ms2Edges,
  ...hsqcEdges,
  { source: "n1", target: "n6", modality: "both" as const, score: 0.79, is_transitive: false },
  { source: "n2", target: "n7", modality: "both" as const, score: 0.71, is_transitive: false },
  { source: "n4", target: "n10", modality: "both" as const, score: 0.66, is_transitive: false },
];

// Bioactivity: node size by |r|, colour by p-value.
const bioactivityNodes = baseNodes.map((n, i) => ({
  ...n,
  bioactivity_r: [0.71, 0.62, 0.55, 0.21, 0.08, 0.0, 0.0, 0.0, 0.0, 0.0][i],
  bioactivity_p: [0.001, 0.003, 0.011, 0.18, 0.62, 1.0, 1.0, 1.0, 1.0, 1.0][i],
}));

export const MOCK_NETWORKS: Record<"MS2" | "HSQC" | "Fused" | "Bioactivity", Network> = {
  MS2: { nodes: baseNodes, edges: ms2Edges },
  HSQC: { nodes: baseNodes, edges: hsqcEdges },
  Fused: { nodes: fusedNodes, edges: fusedEdges },
  Bioactivity: { nodes: bioactivityNodes, edges: ms2Edges },
};

// ---------------------------------------------------------------------------
// Run state (for the Analysis page)
// ---------------------------------------------------------------------------

const tasks: Task[] = [
  { task_id: "t1", tool_name: "ms2_detect", status: "completed", started_at: "2025-01-14T09:00:00Z", completed_at: "2025-01-14T09:00:42Z" },
  { task_id: "t2", tool_name: "ms2_network", status: "completed", started_at: "2025-01-14T09:00:42Z", completed_at: "2025-01-14T09:01:18Z" },
  { task_id: "t3", tool_name: "hsqc_network", status: "completed", started_at: "2025-01-14T09:01:18Z", completed_at: "2025-01-14T09:01:51Z" },
  { task_id: "t4", tool_name: "network_fuse", status: "completed", started_at: "2025-01-14T09:01:51Z", completed_at: "2025-01-14T09:02:09Z" },
  { task_id: "t5", tool_name: "elucidate_candidates", status: "running", started_at: "2025-01-14T09:02:09Z" },
  { task_id: "t6", tool_name: "checkpoint_review", status: "pending" },
  { task_id: "t7", tool_name: "novel_generate", status: "pending" },
  { task_id: "t8", tool_name: "localize_site", status: "pending" },
  { task_id: "t9", tool_name: "report_assemble", status: "pending" },
];

const checkpoints: Checkpoint[] = [
  {
    name: "post_elucidation",
    description:
      "Review ranked candidates before any novel-structure generation proceeds. The system will not generate novel relatives without your explicit approval.",
    artifacts: ["ranked_candidates", "evidence_graph", "gaps_report"],
    authorized_phase: ["novel_generate", "localize_site"],
    requires_tier3_authorization: true,
  },
];

const auditTail: AuditEntry[] = [
  { ts: "2025-01-14T09:00:00Z", event: "run_started", actor: "user", detail: "workflow=identify, sample=Camellia_sinensis_leaf_EtOH" },
  { ts: "2025-01-14T09:00:42Z", event: "task_completed", actor: "system", detail: "ms2_detect: 412 features, 318 with MS2" },
  { ts: "2025-01-14T09:01:18Z", event: "task_completed", actor: "system", detail: "ms2_network: 5 components, 4 singletons" },
  { ts: "2025-01-14T09:01:51Z", event: "task_completed", actor: "system", detail: "hsqc_network: 10 nodes, 4 edges" },
  { ts: "2025-01-14T09:02:09Z", event: "task_completed", actor: "system", detail: "network_fuse: 3 nodes promoted to 'both'" },
  { ts: "2025-01-14T09:02:09Z", event: "task_started", actor: "agent", detail: "elucidate_candidates: ranking against LOTUS+internal" },
];

export const MOCK_RUN_STATE: RunState = {
  run_id: "run_4a7e9c2b",
  status: "awaiting_review",
  workflow: "identify",
  task_graph: { tasks, checkpoints },
  current_task: tasks[4],
  awaiting_checkpoint: checkpoints[0],
  artifacts: { ranked_candidates: MOCK_CANDIDATE_RANKS },
  audit_tail: auditTail,
  model_version: APP_META.model_version,
  cost_so_far: { tokens: 15, usd: 0.0 },
};

// ---------------------------------------------------------------------------
// Mechanism hypothesis (Pharmacology page)
// ---------------------------------------------------------------------------

export const MOCK_MECHANISM_HYPOTHESIS: MechanismHypothesis = {
  compound: "Quercetin",
  is_hypothesis: true,
  proposed_mechanism:
    "Quercetin is hypothesised to inhibit PI3K/Akt signalling upstream of mTORC1, partially via direct binding to the ATP-binding pocket of PI3Kα (predicted docking score −9.2 kcal/mol, 3 out of 4 supporting studies concordant). Concurrent inhibition of the NF-κB axis (p65 translocation reduced 38% in 2 of 3 cited cell models) suggests a polypharmacology profile consistent with the observed anti-proliferative phenotype. The mechanism remains a hypothesis pending orthogonal validation (e.g. kinase panel, thermal shift assay).",
  confidence: 0.62,
  evidence: {
    nodes: [
      { id: "h1", claim: "Quercetin docked into PI3Kα ATP pocket, score −9.2 kcal/mol", type: "prediction", confidence: 0.7 },
      { id: "h2", claim: "In vitro PI3K IC50 = 3.8 μM (PMID 19297344)", type: "observation", confidence: 0.85 },
      { id: "h3", claim: "p65 nuclear translocation reduced 38% in MCF-7 (PMID 23305402)", type: "observation", confidence: 0.78 },
      { id: "h4", claim: "mTORC1 signalling downstream of PI3K/Akt", type: "prediction", confidence: 0.92 },
      { id: "h5", claim: "NF-κB axis cross-talk with PI3K/Akt in cited models", type: "prediction", confidence: 0.6 },
      { id: "h6", claim: "Anti-proliferative phenotype in 3 cell lines (PMID 24824180)", type: "observation", confidence: 0.82 },
      { id: "h7", claim: "Binding mode prediction depends on homology model (no crystal structure of human PI3Kα-quercetin complex)", type: "gap", confidence: 0.4 },
    ],
    edges: [
      { source: "h1", target: "h4", relation: "supports" },
      { source: "h2", target: "h4", relation: "supports" },
      { source: "h3", target: "h5", relation: "supports" },
      { source: "h5", target: "h4", relation: "supports" },
      { source: "h4", target: "h6", relation: "supports" },
      { source: "h7", target: "h1", relation: "gap" },
    ],
  },
  citations: [
    "PMID 19297344",
    "PMID 23305402",
    "PMID 24824180",
    "PMID 31234567",
  ],
  top_targets: [
    { target_id: "T:P12643", name: "PI3Kα", method: "docking + literature", confidence: 0.78, citation: "PMID 19297344" },
    { target_id: "T:P19838", name: "NF-κB p65", method: "literature", confidence: 0.66, citation: "PMID 23305402" },
    { target_id: "T:P42345", name: "mTOR", method: "pathway inference", confidence: 0.55 },
    { target_id: "T:P05305", name: "EGFR", method: "docking", confidence: 0.41 },
  ],
  top_pathways: [
    { pathway_id: "hsa04151", name: "PI3K-Akt signalling", fdr: 0.0042 },
    { pathway_id: "hsa04010", name: "MAPK signalling", fdr: 0.018 },
    { pathway_id: "hsa04064", name: "NF-κB signalling", fdr: 0.023 },
  ],
};

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const MOCK_TRANSACTIONS: BillingTransaction[] = [
  {
    ts: "2025-01-14T08:30:00Z",
    kind: "topup",
    description: "Free starter grant (new user)",
    tokens: 50,
    balance_after: 50,
  },
  {
    ts: "2025-01-14T09:02:09Z",
    kind: "metered",
    description: "Run run_4a7e9c2b — elucidate_candidates",
    tokens: -8,
    balance_after: 42,
  },
  {
    ts: "2025-01-13T14:22:11Z",
    kind: "metered",
    description: "Run run_2c8e1a44 — ms2_network",
    tokens: -4,
    balance_after: 50,
  },
];

// ---------------------------------------------------------------------------
// Spectra (mock MS2 mirror + HSQC overlay)
// ---------------------------------------------------------------------------

/**
 * MS2 mirror plot: top trace = observed, bottom trace = predicted (mirrored).
 * Each peak has { mz, intensity }.
 */
export const MOCK_MS2_OBSERVED = [
  { mz: 137.0233, intensity: 100 },
  { mz: 153.0181, intensity: 92 },
  { mz: 165.0188, intensity: 28 },
  { mz: 229.014, intensity: 18 },
  { mz: 245.0091, intensity: 35 },
  { mz: 273.0401, intensity: 42 },
  { mz: 303.0499, intensity: 78 },
];

export const MOCK_MS2_PREDICTED = [
  { mz: 121.0284, intensity: 8 },
  { mz: 137.0233, intensity: 100 },
  { mz: 153.0181, intensity: 90 },
  { mz: 229.014, intensity: 22 },
  { mz: 245.0091, intensity: 38 },
  { mz: 273.0401, intensity: 45 },
  { mz: 303.0499, intensity: 80 },
];

/**
 * HSQC peaks for overlay: { c_ppm, h_ppm, label, in_observed }.
 * `in_observed = false` marks unmatched predicted peaks (gaps).
 */
export const MOCK_HSQC_PEAKS = [
  { c_ppm: 99.8, h_ppm: 6.21, label: "C-8/H-8", in_observed: true },
  { c_ppm: 94.5, h_ppm: 6.44, label: "C-6/H-6", in_observed: true },
  { c_ppm: 103.1, h_ppm: 6.92, label: "C-3/H-3", in_observed: true },
  { c_ppm: 116.2, h_ppm: 6.88, label: "C-3'/H-3'", in_observed: true },
  { c_ppm: 122.4, h_ppm: 7.51, label: "C-2'/H-2'", in_observed: true },
  { c_ppm: 115.0, h_ppm: 6.41, label: "predicted C-6/H-6 (alt rotamer)", in_observed: false },
  { c_ppm: 135.2, h_ppm: 7.62, label: "predicted C-5'/H-5'", in_observed: false },
];
