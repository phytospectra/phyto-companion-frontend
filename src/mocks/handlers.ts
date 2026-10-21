/**
 * MSW request handlers for the Phytospectra backend contract.
 *
 * Handlers are typed against `src/api/types.ts`. Where a fixture exists in
 * `src/lib/phyto/fixtures.ts` it is returned directly; endpoints without a
 * fixture get small synthetic responses.
 *
 * Behaviour shared by all handlers:
 *   - 401 when the Authorization header is missing or not a Bearer token
 *   - 402 for metered operations when the balance is insufficient
 *   - Idempotency-Key replay returns the cached body without re-charging
 */

import { http, HttpResponse, type RequestHandler } from "msw";
import {
  MOCK_BALANCE,
  MOCK_CANDIDATE_RANKS,
  MOCK_MECHANISM_HYPOTHESIS,
  MOCK_NETWORKS,
  MOCK_RUN_STATE,
  MOCK_SITE_LOCALIZATION,
  MOCK_TRANSACTIONS,
} from "@/lib/phyto/fixtures";
import { PRICING_TABLE, TOKEN_PACKS } from "@/lib/phyto/constants";
import type {
  Balance,
  CandidateRank,
  Citation,
  EvidenceGraph,
  MechanismHypothesis,
  Network,
  NetworkEdge,
  NetworkNode,
  Plan,
  RunState,
  SiteLocalization,
  Task,
  Transaction,
  Workspace,
} from "@/api/types";

// ---------------------------------------------------------------------------
// In-memory state (reset between tests via resetMockState)
// ---------------------------------------------------------------------------

interface MockState {
  balance: Balance;
  transactions: Transaction[];
  idempotency: Map<string, { status: number; body: unknown }>;
  runs: Map<string, RunState>;
}

function initialState(): MockState {
  return {
    balance: {
      user_id: MOCK_BALANCE.user_id,
      balance: MOCK_BALANCE.balance,
      reserved: 0,
      last_updated: MOCK_BALANCE.last_updated,
      plan_id: "plan_free",
    },
    transactions: MOCK_TRANSACTIONS.map((tx, i) => ({
      transaction_id: `tx_${i + 1}`,
      ts: tx.ts,
      kind: tx.kind,
      description: tx.description,
      tokens: tx.tokens,
      balance_after: tx.balance_after,
    })),
    idempotency: new Map(),
    runs: new Map([[MOCK_RUN_STATE.run_id, MOCK_RUN_STATE as RunState]]),
  };
}

let state: MockState = initialState();

/** Reset the mock backend to its initial state (used by tests). */
export function resetMockState(): void {
  state = initialState();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAuthorized(request: Request): boolean {
  const header = request.headers.get("Authorization");
  return typeof header === "string" && header.startsWith("Bearer ") &&
    header.slice("Bearer ".length).trim().length > 0;
}

function unauthorized(): HttpResponse<{ detail: string }> {
  return HttpResponse.json(
    { detail: "Missing or invalid Authorization header." },
    { status: 401 }
  );
}

function insufficient(
  balance: number,
  required: number
): HttpResponse<{
  detail: string;
  balance: number;
  required: number;
  topup_url: string;
}> {
  return HttpResponse.json(
    {
      detail: "Insufficient tokens",
      balance,
      required,
      topup_url: "/billing",
    },
    { status: 402 }
  );
}

/**
 * Charge a metered operation. Handles auth, idempotency replay, and the
 * 402 branch. Returns either an error response or the charge result.
 */
function charge(
  request: Request,
  cost: number
): { response: HttpResponse<Record<string, unknown>> } | { response: null } {
  if (!isAuthorized(request)) return { response: unauthorized() };

  const key = request.headers.get("Idempotency-Key");
  if (key && state.idempotency.has(key)) {
    const cached = state.idempotency.get(key)!;
    return {
      response: HttpResponse.json(cached.body as Record<string, unknown>, {
        status: cached.status,
      }),
    };
  }

  if (state.balance.balance < cost) {
    return {
      response: insufficient(state.balance.balance, cost),
    };
  }

  state.balance = {
    ...state.balance,
    balance: state.balance.balance - cost,
    last_updated: new Date().toISOString(),
  };
  state.transactions = [
    {
      transaction_id: `tx_${state.transactions.length + 1}`,
      ts: new Date().toISOString(),
      kind: "metered",
      description: `metered operation (${cost} tokens)`,
      tokens: -cost,
      balance_after: state.balance.balance,
    },
    ...state.transactions,
  ];
  return { response: null };
}

/** Record a response body for idempotent replay. */
function remember(request: Request, status: number, body: unknown): void {
  const key = request.headers.get("Idempotency-Key");
  if (key) state.idempotency.set(key, { status, body });
}

function runFromFixture(runId: string): RunState {
  return { ...(MOCK_RUN_STATE as RunState), run_id: runId };
}

// ---------------------------------------------------------------------------
// Synthetic data for endpoints without fixtures
// ---------------------------------------------------------------------------

const SYNTHETIC_NETWORK_NODE: NetworkNode = {
  id: "syn_n1",
  label: "synthetic feature",
  modality: "MS2",
};

const SYNTHETIC_NETWORK_EDGE: NetworkEdge = {
  source: "syn_n1",
  target: "syn_n2",
  modality: "MS2",
  score: 0.5,
  is_transitive: false,
};

const SYNTHETIC_EVIDENCE: EvidenceGraph = {
  nodes: [
    { id: "e1", claim: "observed peak matches reference", type: "match", confidence: 0.9 },
  ],
  edges: [],
};

const SYNTHETIC_CITATION: Citation = {
  citation_id: "cit_1",
  title: "Synthetic mock citation",
  authors: ["Mock, A."],
  journal: "Journal of Mock Results",
  year: 2025,
  doi: "10.0000/mock",
};

const PLANS: Plan[] = [
  {
    plan_id: "plan_free",
    name: "Free",
    monthly_tokens: 50,
    price_usd: 0,
    features: ["50 free tokens", "Single workspace"],
    is_active: true,
  },
  {
    plan_id: "plan_research",
    name: "Research",
    monthly_tokens: 2000,
    price_usd: 129,
    features: ["2,000 tokens/month", "Priority queue"],
    is_active: false,
  },
];

const WORKSPACE: Workspace = {
  workspace_id: "ws_001",
  name: "Institute for Natural Products Research",
  owner_user_id: MOCK_BALANCE.user_id,
  created_at: "2025-01-01T00:00:00Z",
  members: [
    { user_id: MOCK_BALANCE.user_id, email: "researcher@phytospectra.com", role: "owner" },
  ],
  plan_id: "plan_free",
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const handlers: RequestHandler[] = [
  // Health + meta ------------------------------------------------------------
  http.get("*/health", () =>
    HttpResponse.json({ status: "ok", service: "orchestrator", dry_run: true })
  ),

  http.get("*/tools", () => HttpResponse.json({ pricing: PRICING_TABLE })),

  // Billing ------------------------------------------------------------------
  http.get("*/billing/balance", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    return HttpResponse.json(state.balance);
  }),

  http.get("*/billing/plans", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    return HttpResponse.json(PLANS);
  }),

  http.post("*/billing/topup", async ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const body = (await request.json()) as {
      pack_id?: string;
      tokens?: number;
    };
    const pack = TOKEN_PACKS.find((p) => p.id === body.pack_id);
    const tokens = pack?.tokens ?? body.tokens ?? 0;
    const sessionId = `cs_test_${Date.now()}`;
    return HttpResponse.json({
      checkout_url: `/billing/success?session_id=${sessionId}&simulated=1`,
      session_id: sessionId,
      tokens,
    });
  }),

  http.post("*/billing/topup/confirm", async ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const body = (await request.json()) as { pack_id?: string; tokens?: number };
    const pack = TOKEN_PACKS.find((p) => p.id === body.pack_id);
    const tokens = pack?.tokens ?? body.tokens ?? 0;
    state.balance = {
      ...state.balance,
      balance: state.balance.balance + tokens,
      last_updated: new Date().toISOString(),
    };
    state.transactions = [
      {
        transaction_id: `tx_${state.transactions.length + 1}`,
        ts: new Date().toISOString(),
        kind: "topup",
        description: `top-up ${pack?.label ?? "custom"} (+${tokens})`,
        tokens,
        balance_after: state.balance.balance,
      },
      ...state.transactions,
    ];
    return HttpResponse.json(state.balance);
  }),

  http.get("*/billing/transactions", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    return HttpResponse.json(state.transactions);
  }),

  // Runs ---------------------------------------------------------------------
  http.post("*/analysis", async ({ request }) => {
    const check = charge(request, PRICING_TABLE.run_analysis);
    if (check.response) return check.response;
    const body = (await request.json()) as {
      user_goal?: string;
      workflow?: RunState["workflow"];
    };
    const runId = `run_${Date.now().toString(36)}`;
    const run: RunState = {
      ...runFromFixture(runId),
      workflow: body.workflow ?? "identify",
    };
    state.runs.set(runId, run);
    remember(request, 202, { run_id: runId, status: "running" });
    return HttpResponse.json({ run_id: runId, status: "running" }, { status: 202 });
  }),

  http.get("*/runs/:run_id", ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const runId = String(params.run_id);
    const run = state.runs.get(runId) ?? runFromFixture(runId);
    return HttpResponse.json(run);
  }),

  http.post("*/runs/:run_id/checkpoint", async ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const runId = String(params.run_id);
    const body = (await request.json()) as { approved: boolean; reason?: string };
    const base = state.runs.get(runId) ?? runFromFixture(runId);
    const next: RunState = {
      ...base,
      status: body.approved ? "running" : "failed",
      awaiting_checkpoint: undefined,
      audit_tail: [
        ...base.audit_tail,
        {
          ts: new Date().toISOString(),
          event: body.approved ? "checkpoint_approved" : "checkpoint_rejected",
          actor: "user",
          detail: `reason="${body.reason ?? ""}"`,
        },
      ],
    };
    state.runs.set(runId, next);
    return HttpResponse.json(next);
  }),

  http.get("*/runs/:run_id/citation", ({ request }) =>
    isAuthorized(request)
      ? HttpResponse.json(SYNTHETIC_CITATION)
      : unauthorized()
  ),

  // Networks -----------------------------------------------------------------
  http.post("*/networks/ms2", ({ request }) => {
    const check = charge(request, PRICING_TABLE.network_ms2);
    if (check.response) return check.response;
    return HttpResponse.json(MOCK_NETWORKS.MS2);
  }),

  http.post("*/networks/hsqc", ({ request }) => {
    const check = charge(request, PRICING_TABLE.network_hsqc);
    if (check.response) return check.response;
    return HttpResponse.json(MOCK_NETWORKS.HSQC);
  }),

  http.post("*/networks/fused", ({ request }) => {
    const check = charge(request, PRICING_TABLE.network_fused);
    if (check.response) return check.response;
    return HttpResponse.json(MOCK_NETWORKS.Fused);
  }),

  http.post("*/networks/bioactivity", ({ request }) => {
    const check = charge(request, PRICING_TABLE.network_bioactivity);
    if (check.response) return check.response;
    return HttpResponse.json(MOCK_NETWORKS.Bioactivity);
  }),

  http.get("*/networks/ms2/:job_handle_id", ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    return HttpResponse.json(MOCK_NETWORKS.MS2);
  }),

  http.post("*/networks/export/cytoscape", ({ request }) =>
    isAuthorized(request)
      ? HttpResponse.json({
          elements: {
            nodes: MOCK_NETWORKS.Fused.nodes.map((n) => ({
              data: { id: n.id, label: n.label },
            })),
            edges: MOCK_NETWORKS.Fused.edges.map((e, i) => ({
              data: { id: `e${i}`, source: e.source, target: e.target },
            })),
          },
        })
      : unauthorized()
  ),

  http.post("*/networks/export/graphml", ({ request }) =>
    isAuthorized(request)
      ? HttpResponse.json({ filename: "network.graphml", content: "<graphml/>" })
      : unauthorized()
  ),

  http.post("*/networks/summary", ({ request }) =>
    isAuthorized(request)
      ? HttpResponse.json({
          n_nodes: MOCK_NETWORKS.MS2.nodes.length,
          n_edges: MOCK_NETWORKS.MS2.edges.length,
        })
      : unauthorized()
  ),

  // Elucidation --------------------------------------------------------------
  http.post("*/elucidate/candidates", ({ request }) => {
    const check = charge(request, PRICING_TABLE.elucidate_candidates);
    if (check.response) return check.response;
    return HttpResponse.json({
      ranks: MOCK_CANDIDATE_RANKS as CandidateRank[],
      provenance_manifest_id: "pm_mock_v1",
    });
  }),

  http.post("*/elucidate/evidence", ({ request }) =>
    isAuthorized(request)
      ? HttpResponse.json(SYNTHETIC_EVIDENCE)
      : unauthorized()
  ),

  http.post("*/elucidate/novel", ({ request }) => {
    const check = charge(request, PRICING_TABLE.elucidate_novel);
    if (check.response) return check.response;
    return HttpResponse.json(
      (MOCK_CANDIDATE_RANKS as CandidateRank[]).filter(
        (r) => r.verdict === "NOVELTY_FLAGGED"
      )
    );
  }),

  http.post("*/elucidate/localize", ({ request }) => {
    const check = charge(request, PRICING_TABLE.elucidate_localize);
    if (check.response) return check.response;
    return HttpResponse.json(MOCK_SITE_LOCALIZATION as SiteLocalization);
  }),

  // Pharmacology -------------------------------------------------------------
  http.post("*/pharmacology/mechanism", ({ request }) => {
    const check = charge(request, PRICING_TABLE.pharmacology_mechanism);
    if (check.response) return check.response;
    return HttpResponse.json(
      MOCK_MECHANISM_HYPOTHESIS as MechanismHypothesis
    );
  }),

  http.post("*/pharmacology/targets", ({ request }) => {
    const check = charge(request, PRICING_TABLE.pharmacology_targets);
    if (check.response) return check.response;
    return HttpResponse.json(MOCK_MECHANISM_HYPOTHESIS.top_targets);
  }),

  http.post("*/pharmacology/network", ({ request }) => {
    const check = charge(request, PRICING_TABLE.pharmacology_network);
    if (check.response) return check.response;
    return HttpResponse.json({
      nodes: [SYNTHETIC_NETWORK_NODE],
      edges: [SYNTHETIC_NETWORK_EDGE],
    });
  }),

  http.post("*/pharmacology/admet", ({ request }) =>
    isAuthorized(request)
      ? HttpResponse.json({ admet: "not modelled in mock" })
      : unauthorized()
  ),

  // LLM ----------------------------------------------------------------------
  http.post("*/llm/explain", ({ request }) => {
    const check = charge(request, PRICING_TABLE.llm_explain);
    if (check.response) return check.response;
    return HttpResponse.json({
      explanation:
        "Mock explanation: the ranked candidate is supported by matched MS2 fragments; confidence is limited by the binding-mode gap.",
    });
  }),

  http.post("*/llm/hypothesize", ({ request }) => {
    const check = charge(request, PRICING_TABLE.llm_hypothesize);
    if (check.response) return check.response;
    return HttpResponse.json(MOCK_MECHANISM_HYPOTHESIS);
  }),

  http.post("*/llm/recommend-experiments", ({ request }) =>
    isAuthorized(request)
      ? HttpResponse.json({ experiments: ["Thermal shift assay on PI3Kα"] })
      : unauthorized()
  ),

  http.post("*/llm/summarize-literature", ({ request }) =>
    isAuthorized(request)
      ? HttpResponse.json({ summary: "Mock literature summary." })
      : unauthorized()
  ),

  // Metabolomics -------------------------------------------------------------
  http.post("*/metabolomics/:step", async ({ request, params }) => {
    const check = charge(request, PRICING_TABLE.metabolomics_step);
    if (check.response) return check.response;
    return HttpResponse.json({
      step: String(params.step),
      status: "ok",
    });
  }),

  // NMR search ---------------------------------------------------------------
  http.post("*/nmr_search/peaks", ({ request }) => {
    const check = charge(request, PRICING_TABLE.nmr_search);
    if (check.response) return check.response;
    return HttpResponse.json({ matches: [] });
  }),

  http.post("*/nmr_search/compound_shifts", ({ request }) => {
    const check = charge(request, PRICING_TABLE.nmr_search);
    if (check.response) return check.response;
    return HttpResponse.json({ shifts: [] });
  }),

  // Literature ---------------------------------------------------------------
  http.get("*/literature/paper/:pmid", ({ request, params }) =>
    isAuthorized(request)
      ? HttpResponse.json({ ...SYNTHETIC_CITATION, pmid: String(params.pmid) })
      : unauthorized()
  ),

  http.post("*/literature/search", ({ request }) =>
    isAuthorized(request) ? HttpResponse.json({ results: [] }) : unauthorized()
  ),

  http.post("*/literature/compound", ({ request }) =>
    isAuthorized(request) ? HttpResponse.json({ results: [] }) : unauthorized()
  ),

  http.post("*/literature/target", ({ request }) =>
    isAuthorized(request) ? HttpResponse.json({ results: [] }) : unauthorized()
  ),

  // Workspaces ---------------------------------------------------------------
  http.post("*/workspaces", ({ request }) =>
    isAuthorized(request) ? HttpResponse.json(WORKSPACE) : unauthorized()
  ),

  http.get("*/workspaces/:workspace_id", ({ request }) =>
    isAuthorized(request) ? HttpResponse.json(WORKSPACE) : unauthorized()
  ),

  http.get("*/workspaces/:workspace_id/usage", ({ request }) =>
    isAuthorized(request)
      ? HttpResponse.json({ tokens_used: 12, tokens_remaining: state.balance.balance })
      : unauthorized()
  ),

  http.post("*/workspaces/:workspace_id/members", ({ request }) =>
    isAuthorized(request) ? HttpResponse.json(WORKSPACE) : unauthorized()
  ),

  http.delete("*/workspaces/:workspace_id/members/:uid", ({ request }) =>
    isAuthorized(request) ? HttpResponse.json(WORKSPACE) : unauthorized()
  ),

  http.post("*/workspaces/:workspace_id/pool/topup", ({ request }) =>
    isAuthorized(request) ? HttpResponse.json(state.balance) : unauthorized()
  ),
];

export default handlers;
