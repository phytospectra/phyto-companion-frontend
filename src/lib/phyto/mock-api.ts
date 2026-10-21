"use client";

import {
  MOCK_BALANCE,
  MOCK_CANDIDATE_RANKS,
  MOCK_MECHANISM_HYPOTHESIS,
  MOCK_NETWORKS,
  MOCK_RUN_STATE,
  MOCK_SITE_LOCALIZATION,
  MOCK_TRANSACTIONS,
} from "./fixtures";
import { PRICING_TABLE, type MeteredOperationId } from "./constants";
import {
  InsufficientTokensError,
  type BillingTransaction,
  type CandidateRank,
  type MechanismHypothesis,
  type Network,
  type RunState,
  type SiteLocalization,
  type TokenBalance,
  type TopupResponse,
  type TokenPackId,
} from "./types";
import { addTokens, spendTokens, useTokenStore } from "./stores";

/**
 * Mock API client.
 *
 * This stands in for the real axios-based `src/api/client.ts` from the
 * spec. The contract is identical from the caller's perspective: a method
 * takes a request shape, returns a promise of the response shape, and
 * throws an `InsufficientTokensError` on a simulated 402. The 401/403/404
 * branches of the real client are not needed in the demo because there
 * is no real auth to fail.
 *
 * Idempotency: every metered POST takes an `idempotency_key` argument.
 * Re-calling the same operation with the same key returns the cached
 * result without charging again. This mirrors the backend's behaviour
 * and is what makes network-retry safe.
 */

const LATENCY_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const idempotencyCache = new Map<
  string,
  { result: unknown; charged: number }
>();

/**
 * Charge tokens for an operation. Throws InsufficientTokensError (the same
 * class the real axios interceptor would throw on a 402 response) when
 * the balance is insufficient.
 */
function chargeOrThrow(
  opId: MeteredOperationId,
  operation_id: string,
  idempotency_key: string
): number {
  const cost = PRICING_TABLE[opId];
  const state = useTokenStore.getState();
  const balance = state.balance ?? MOCK_BALANCE;

  if (idempotencyCache.has(idempotency_key)) {
    // Re-submission of the same idempotency key: return cached result, do
    // not re-charge.
    return idempotencyCache.get(idempotency_key)!.charged;
  }

  if (balance.balance < cost) {
    // The real backend would return a 402 with body
    // { detail, balance, required, topup_url }. The axios interceptor
    // would throw InsufficientTokensError. Here we throw directly.
    const err = new InsufficientTokensError(
      {
        detail: "Insufficient tokens",
        balance: balance.balance,
        required: cost,
        topup_url: "/billing/topup",
      },
      operation_id
    );
    // Set the store so the modal opens.
    state.setInsufficientTokensError({
      operation_id,
      balance: balance.balance,
      required: cost,
      topup_url: "/billing/topup",
    });
    throw err;
  }

  spendTokens(cost);
  idempotencyCache.set(idempotency_key, { result: undefined, charged: cost });
  return cost;
}

export const mockApi = {
  // -------------------------------------------------------------------------
  // Health + meta
  // -------------------------------------------------------------------------
  async health(): Promise<{ status: string; service: string; dry_run: boolean }> {
    await sleep(LATENCY_MS);
    return { status: "ok", service: "orchestrator", dry_run: false };
  },

  // -------------------------------------------------------------------------
  // Billing
  // -------------------------------------------------------------------------
  async getBalance(): Promise<TokenBalance> {
    await sleep(LATENCY_MS);
    const b = useTokenStore.getState().balance ?? MOCK_BALANCE;
    return { ...b };
  },

  async topup(
    pack_id: TokenPackId,
    idempotency_key: string
  ): Promise<TopupResponse> {
    await sleep(LATENCY_MS);
    // Simulate Stripe checkout redirect — in real life the user is sent to
    // checkout_url and returns to /billing/success?session_id=...; here we
    // simulate the return-trip immediately so the demo flows end-to-end.
    const session_id = `cs_test_${idempotency_key.slice(0, 8)}`;
    return {
      checkout_url: `/billing/success?session_id=${session_id}&simulated=1`,
      session_id,
    };
  },

  /**
   * Simulate the user returning from Stripe checkout. In the real flow
   * this is triggered by the /billing/success route polling the balance
   * until it increases. Here we just add the pack's tokens immediately.
   */
  async confirmTopup(pack_id: TokenPackId): Promise<TokenBalance> {
    await sleep(LATENCY_MS);
    const packMap: Record<TokenPackId, number> = {
      pack_100: 100,
      pack_500: 500,
      pack_2000: 2000,
    };
    addTokens(packMap[pack_id]);
    return this.getBalance();
  },

  async listTransactions(): Promise<BillingTransaction[]> {
    await sleep(LATENCY_MS);
    return MOCK_TRANSACTIONS;
  },

  // -------------------------------------------------------------------------
  // Orchestration runs
  // -------------------------------------------------------------------------
  async startRun(
    body: {
      user_goal: string;
      workflow: "identify" | "compare" | "novelty" | "mechanism_hypothesis";
    },
    idempotency_key: string
  ): Promise<{ run_id: string; status: "running" }> {
    chargeOrThrow("run_analysis", `run:${idempotency_key}`, idempotency_key);
    await sleep(LATENCY_MS);
    return { run_id: MOCK_RUN_STATE.run_id, status: "running" };
  },

  async getRun(run_id: string): Promise<RunState> {
    await sleep(LATENCY_MS);
    // For the demo we always return the same fixture, but we make a shallow
    // copy so callers can mutate it for the checkpoint flow.
    return {
      ...MOCK_RUN_STATE,
      run_id,
    };
  },

  async submitCheckpoint(
    run_id: string,
    checkpoint_name: string,
    body: { approved: boolean; reason: string }
  ): Promise<RunState> {
    await sleep(LATENCY_MS);
    const next: RunState = {
      ...MOCK_RUN_STATE,
      run_id,
      status: body.approved ? "running" : "failed",
      awaiting_checkpoint: undefined,
      current_task: MOCK_RUN_STATE.task_graph.tasks[5],
      audit_tail: [
        ...MOCK_RUN_STATE.audit_tail,
        {
          ts: new Date().toISOString(),
          event: body.approved ? "checkpoint_approved" : "checkpoint_rejected",
          actor: "user",
          detail: `checkpoint=${checkpoint_name}; reason="${body.reason}"`,
        },
      ],
    };
    return next;
  },

  // -------------------------------------------------------------------------
  // Networks
  // -------------------------------------------------------------------------
  async getNetwork(
    modality: "MS2" | "HSQC" | "Fused" | "Bioactivity",
    idempotency_key: string
  ): Promise<Network> {
    const opMap: Record<typeof modality, MeteredOperationId> = {
      MS2: "network_ms2",
      HSQC: "network_hsqc",
      Fused: "network_fused",
      Bioactivity: "network_bioactivity",
    };
    chargeOrThrow(opMap[modality], `network:${modality}:${idempotency_key}`, idempotency_key);
    await sleep(LATENCY_MS);
    return MOCK_NETWORKS[modality];
  },

  // -------------------------------------------------------------------------
  // Elucidation
  // -------------------------------------------------------------------------
  async rankCandidates(idempotency_key: string): Promise<{
    ranks: CandidateRank[];
    provenance_manifest_id: string;
  }> {
    chargeOrThrow(
      "elucidate_candidates",
      `elucidate:${idempotency_key}`,
      idempotency_key
    );
    await sleep(LATENCY_MS);
    return {
      ranks: MOCK_CANDIDATE_RANKS,
      provenance_manifest_id: "pm_4a7e9c2b_v1",
    };
  },

  async generateNovel(idempotency_key: string): Promise<CandidateRank[]> {
    chargeOrThrow(
      "elucidate_novel",
      `novel:${idempotency_key}`,
      idempotency_key
    );
    await sleep(LATENCY_MS);
    return MOCK_CANDIDATE_RANKS.filter(
      (r) => r.verdict === "NOVELTY_FLAGGED"
    );
  },

  async localizeSite(idempotency_key: string): Promise<SiteLocalization> {
    chargeOrThrow(
      "elucidate_localize",
      `localize:${idempotency_key}`,
      idempotency_key
    );
    await sleep(LATENCY_MS);
    return MOCK_SITE_LOCALIZATION;
  },

  // -------------------------------------------------------------------------
  // Pharmacology
  // -------------------------------------------------------------------------
  async hypothesizeMechanism(
    idempotency_key: string
  ): Promise<MechanismHypothesis> {
    chargeOrThrow(
      "pharmacology_mechanism",
      `mechanism:${idempotency_key}`,
      idempotency_key
    );
    await sleep(LATENCY_MS);
    return MOCK_MECHANISM_HYPOTHESIS;
  },

  // -------------------------------------------------------------------------
  // LLM
  // -------------------------------------------------------------------------
  async explainHypothesis(
    hypothesis: MechanismHypothesis,
    idempotency_key: string
  ): Promise<string> {
    chargeOrThrow("llm_explain", `llm:${idempotency_key}`, idempotency_key);
    await sleep(LATENCY_MS);
    return `The proposed mechanism for ${hypothesis.compound} rests on two legs: (1) direct inhibition of PI3Kα (docking + IC50) and (2) suppression of NF-κB signalling (p65 translocation assay). Confidence is moderate (0.62) because the docking pose is computed against a homology model — the binding mode gap (h7) is the dominant uncertainty. Recommended orthogonal experiment: thermal shift assay on purified PI3Kα with and without ${hypothesis.compound}.`;
  },
};

/**
 * Generate a fresh Idempotency-Key (UUID v4) for a user action. The same
 * key must be reused if the action is retried (e.g. on network failure
 * or after a 402-induced top-up). In the demo we let the caller manage
 * key lifetime; in the real app the React Query mutationFn closure
 * captures the key once per user click.
 */
export function newIdempotencyKey(): string {
  // Lightweight v4 — sufficient for demo. Real app imports `uuid` v4.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
