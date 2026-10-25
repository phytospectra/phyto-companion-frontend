/**
 * Phytospectra API contract types.
 *
 * These mirror the backend response shapes defined in the API_CONTRACT
 * section of the platform specification. In a real deployment they would
 * live in `src/api/types.ts` of the standalone Vite/React frontend
 * repository and be consumed by TanStack Query hooks.
 *
 * In this sandbox demo the same types are used as the contract between the
 * mock API layer (`src/lib/phyto/mock-api.ts`) and the UI, so swapping the
 * mock for a real fetch against `https://api.phytospectra.com` is a
 * mechanical change.
 */

// ---------------------------------------------------------------------------
// Verdict enum
// ---------------------------------------------------------------------------

export type Verdict =
  | "CONFIRMED"
  | "TENTATIVE"
  | "AMBIGUOUS"
  | "CANDIDATE"
  | "ABSTAIN"
  | "NOVELTY_FLAGGED";

// ---------------------------------------------------------------------------
// Candidate + ranking
// ---------------------------------------------------------------------------

export interface Candidate {
  id: string;
  name: string;
  smiles: string;
  /**
   * Elemental composition. Mirrors the backend's MolecularFormula
   * (shared/phyto_shared/models.py): `counts` maps element symbol → integer
   * count >= 1, Hill-notation str() gives the display form.
   */
  formula: { counts: Record<string, number> };
  exact_mass: number;
  provenance: "experimental" | "predicted" | "synthetic" | "structure_only";
  source: string;
}

export interface EvidenceNode {
  id: string;
  claim: string;
  type: "observation" | "prediction" | "match" | "gap";
  confidence?: number;
}

export interface EvidenceEdge {
  source: string;
  target: string;
  relation: "supports" | "contradicts" | "gap";
}

export interface EvidenceGraph {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}

export interface CandidateRank {
  candidate: Candidate;
  score: number;
  coverage: number;
  margin: number | null;
  /** [best_rank, worst_rank] — the rank is an interval, not a point. */
  ranking_interval: [number, number];
  ranking_convention: "higher_is_better" | "lower_is_better";
  verdict: Verdict;
  /** Candidate ids statistically tied with this one (backend: list[str]). */
  tied_candidates: string[];
  evidence_graph?: EvidenceGraph;
  gaps: string[];
}

// ---------------------------------------------------------------------------
// Run state + task graph + checkpoints
// ---------------------------------------------------------------------------

export type RunStatus =
  | "pending"
  | "running"
  | "awaiting_review"
  | "complete"
  | "failed";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface Task {
  task_id: string;
  tool_name: string;
  status: TaskStatus;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

export interface Checkpoint {
  name: string;
  description: string;
  artifacts: string[];
  authorized_phase: string[];
  requires_tier3_authorization: boolean;
}

export interface AuditEntry {
  ts: string;
  event: string;
  actor: "user" | "system" | "agent";
  detail?: string;
}

export interface RunState {
  run_id: string;
  status: RunStatus;
  workflow: "identify" | "compare" | "novelty" | "mechanism_hypothesis";
  task_graph: { tasks: Task[]; checkpoints: Checkpoint[] };
  current_task?: Task;
  awaiting_checkpoint?: Checkpoint;
  verdict?: string;
  artifacts: Record<string, unknown>;
  audit_tail: AuditEntry[];
  model_version: string;
  cost_so_far: { tokens: number; usd: number };
}

// ---------------------------------------------------------------------------
// Networks (MS2 / HSQC / Fused / Bioactivity)
// ---------------------------------------------------------------------------

export interface NetworkNode {
  id: string;
  label: string;
  modality: "MS2" | "HSQC" | "both";
  annotation?: { name: string; msi_level: number };
  propagated_from?: string;
  bioactivity_r?: number;
  bioactivity_p?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  modality: "MS2" | "HSQC" | "both";
  score: number;
  is_transitive: boolean;
}

export interface Network {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

// ---------------------------------------------------------------------------
// Novel structures + site localization
// ---------------------------------------------------------------------------

export interface SiteLocalization {
  parent_smiles: string;
  novel_smiles: string;
  edit_atom_index: number;
  edit_type: string;
  localization_confidence: number;
  n_possible_sites: number;
  rank_of_true_site?: number;
  competing_sites: number[];
}

// ---------------------------------------------------------------------------
// Mechanism hypothesis
// ---------------------------------------------------------------------------

export interface MechanismTarget {
  target_id: string;
  name: string;
  method: string;
  confidence: number;
  citation?: string;
}

export interface MechanismPathway {
  pathway_id: string;
  name: string;
  fdr: number;
}

export interface MechanismHypothesis {
  compound: string;
  is_hypothesis: true; // always true — the type system enforces the disclaimer
  proposed_mechanism: string;
  confidence: number;
  evidence: EvidenceGraph;
  citations: string[];
  top_targets: MechanismTarget[];
  top_pathways: MechanismPathway[];
}

// ---------------------------------------------------------------------------
// Billing + tokens
// ---------------------------------------------------------------------------

export interface TokenBalance {
  balance: number;
  user_id: string;
  last_updated: string;
}

export type TokenPackId = "pack_100" | "pack_500" | "pack_2000";

export interface TokenPack {
  id: TokenPackId;
  tokens: number;
  price_usd: number;
  label: string;
  popular?: boolean;
}

export interface TopupResponse {
  checkout_url: string;
  session_id: string;
}

export interface BillingTransaction {
  ts: string;
  kind: "topup" | "metered";
  description: string;
  tokens: number; // signed: + for topup, - for metered
  balance_after: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface InsufficientTokensErrorBody {
  detail: string;
  balance: number;
  required: number;
  topup_url: string;
}

export class InsufficientTokensError extends Error {
  readonly balance: number;
  readonly required: number;
  readonly topup_url: string;
  readonly operation_id: string;

  constructor(body: InsufficientTokensErrorBody, operation_id: string) {
    super(body.detail);
    this.name = "InsufficientTokensError";
    this.balance = body.balance;
    this.required = body.required;
    this.topup_url = body.topup_url;
    this.operation_id = operation_id;
  }
}

// ---------------------------------------------------------------------------
// Workflow / pricing meta
// ---------------------------------------------------------------------------

export type WorkflowId =
  | "identify"
  | "compare"
  | "novelty"
  | "mechanism_hypothesis";

export interface WorkflowMeta {
  id: WorkflowId;
  label: string;
  description: string;
  estimated_tokens: number;
  steps: string[];
}
