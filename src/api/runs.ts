/**
 * Runs API — typed calls against the orchestrator's run endpoints.
 *
 * Thin wrappers over `apiClient` so screens never hand-build paths or
 * idempotency keys. Extends the Phase 1 client; it does not replace it.
 */

import { apiClient, type ApiClient } from "./client";
import type { RunState, WorkflowId } from "./types";

export interface StartRunRequest {
  workflow: WorkflowId;
  user_goal: string;
  /** Optional upload payload. The mock backend ignores the body. */
  files?: string[];
  metadata?: Record<string, string | undefined>;
  compound_metadata?: Record<string, string | number | undefined>;
}

export interface StartRunResponse {
  run_id: string;
  status: RunState["status"];
}

export interface CheckpointDecision {
  approved: boolean;
  reason: string;
}

export interface RunsApi {
  start(body: StartRunRequest, idempotencyKey?: string): Promise<StartRunResponse>;
  get(runId: string, signal?: AbortSignal): Promise<RunState>;
  submitCheckpoint(
    runId: string,
    decision: CheckpointDecision,
    idempotencyKey?: string
  ): Promise<RunState>;
  pause(runId: string): Promise<RunState>;
  cancel(runId: string): Promise<RunState>;
}

export function createRunsApi(client: ApiClient): RunsApi {
  return {
    start(body, idempotencyKey) {
      return client.post<StartRunResponse>("/runs", body, { idempotencyKey });
    },
    get(runId, signal) {
      return client.get<RunState>(`/runs/${encodeURIComponent(runId)}`, {
        signal,
      });
    },
    submitCheckpoint(runId, decision, idempotencyKey) {
      return client.post<RunState>(
        `/runs/${encodeURIComponent(runId)}/checkpoint`,
        decision,
        { idempotencyKey }
      );
    },
    pause(runId) {
      return client.post<RunState>(`/runs/${encodeURIComponent(runId)}/pause`, {});
    },
    cancel(runId) {
      return client.post<RunState>(`/runs/${encodeURIComponent(runId)}/cancel`, {});
    },
  };
}

export const runsApi: RunsApi = createRunsApi(apiClient);
