/**
 * Backend API contract types.
 *
 * These mirror the response shapes served by the Phytospectra backend
 * (orchestrator + billing). They are the types the live API client and the
 * MSW handlers are checked against.
 */

// ---------------------------------------------------------------------------
// Verdicts and evidence
// ---------------------------------------------------------------------------

export type Verdict =
  | "CONFIRMED"
  | "TENTATIVE"
  | "AMBIGUOUS"
  | "CANDIDATE"
  | "ABSTAIN"
  | "NOVELTY_FLAGGED";

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

// ---------------------------------------------------------------------------
// Candidates
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

export interface CandidateRank {
  candidate: Candidate;
  score: number;
  coverage: number;
  margin: number | null;
  /** [best_rank, worst_rank] — the rank is an interval, never a point. */
  ranking_interval: [number, number];
  ranking_convention: "higher_is_better" | "lower_is_better";
  verdict: Verdict;
  /** Candidate ids statistically tied with this one (backend: list[str]). */
  tied_candidates: string[];
  evidence_graph?: EvidenceGraph;
  gaps: string[];
}

// ---------------------------------------------------------------------------
// Runs, task graph, checkpoints
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

export type WorkflowId =
  | "identify"
  | "compare"
  | "novelty"
  | "mechanism_hypothesis";

export interface RunState {
  run_id: string;
  status: RunStatus;
  workflow: WorkflowId;
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
// Networks
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
// Novel structures
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
// Mechanism hypothesis + citations
// ---------------------------------------------------------------------------

export interface Citation {
  citation_id: string;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  doi?: string;
  pmid?: string;
  url?: string;
}

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
  /** Always true — the type system enforces the disclaimer. */
  is_hypothesis: true;
  proposed_mechanism: string;
  confidence: number;
  evidence: EvidenceGraph;
  citations: string[];
  top_targets: MechanismTarget[];
  top_pathways: MechanismPathway[];
}

// ---------------------------------------------------------------------------
// Billing, plans, workspaces
// ---------------------------------------------------------------------------

export interface Balance {
  user_id: string;
  balance: number;
  /** Tokens held against in-flight metered operations. */
  reserved: number;
  last_updated: string;
  plan_id?: string;
}

export type TransactionKind = "topup" | "metered" | "refund";

export interface Transaction {
  transaction_id: string;
  ts: string;
  kind: TransactionKind;
  description: string;
  /** Signed: positive for credits, negative for metered spend. */
  tokens: number;
  balance_after: number;
  operation_id?: string;
  stripe_session_id?: string;
}

export interface Plan {
  plan_id: string;
  name: string;
  monthly_tokens: number;
  price_usd: number;
  features: string[];
  is_active: boolean;
}

export interface WorkspaceMember {
  user_id: string;
  email: string;
  role: "owner" | "admin" | "member";
}

export interface Workspace {
  workspace_id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  members: WorkspaceMember[];
  plan_id?: string;
}
