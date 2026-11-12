import { afterEach, expect, it, vi } from "vitest";
import { apiClient, setToken, clearToken, SessionChangedError, RequestTimeoutError, IdempotencyConflictError } from "@/api/client";

afterEach(() => { clearToken(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("discards a response returned after the authenticated session changed", async () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  let resolve!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  setToken("alice");
  const pending = apiClient.get('/runs/private');
  setToken("bob");
  resolve(new Response(JSON.stringify({ secret: "alice-data" })));
  await expect(pending).rejects.toBeInstanceOf(SessionChangedError);
});
it("keeps a mutation response through token rotation for the same principal", async () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  let resolve!: (response: Response) => void;
  const fetch = vi.fn((_url: RequestInfo | URL, _options?: RequestInit) =>
    new Promise<Response>(r => { resolve = r; }));
  vi.stubGlobal("fetch", fetch);
  setToken("alice-before-refresh", "alice");
  const pending = apiClient.post('/analysis', {}, { idempotencyKey: 'same-account-key' });
  setToken("alice-after-refresh", "alice");
  resolve(new Response(JSON.stringify({ run_id: 'accepted-run' })));
  await expect(pending).resolves.toEqual({ run_id: 'accepted-run' });
  expect(new Headers(fetch.mock.calls[0][1]?.headers).get('Authorization'))
    .toBe('Bearer alice-before-refresh');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("invalidates in-flight responses when the principal changes even if token text matches", async () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  let resolve!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  setToken("opaque-token", "alice");
  const pending = apiClient.get('/runs/private');
  setToken("opaque-token", "bob");
  resolve(new Response(JSON.stringify({ secret: 'alice-only' })));
  await expect(pending).rejects.toBeInstanceOf(SessionChangedError);
});
it("invalidates a response after sign-out and re-login as the same principal", async () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  let resolve!: (response: Response) => void;
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  setToken("alice-token", "alice");
  const pending = apiClient.get('/runs/private');
  clearToken();
  setToken("alice-token", "alice");
  resolve(new Response(JSON.stringify({ secret: 'previous-session' })));
  await expect(pending).rejects.toBeInstanceOf(SessionChangedError);
});
it("bounds a hanging request without replaying a mutation", async () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  const fetch = vi.fn((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  vi.stubGlobal("fetch", fetch);
  await expect(apiClient.post('/analysis', {}, { timeoutMs: 5 })).rejects.toBeInstanceOf(RequestTimeoutError);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("preserves the caller's idempotency key and exposes conflicts without retry", async () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  const fetch = vi.fn(async (_url: RequestInfo | URL, _options?: RequestInit) => new Response(JSON.stringify({ detail: "Idempotency-Key already used" }), { status: 409 }));
  vi.stubGlobal("fetch", fetch);
  await expect(apiClient.post('/analysis', {}, { idempotencyKey: "request-123456789" })).rejects.toBeInstanceOf(IdempotencyConflictError);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(new Headers(fetch.mock.calls[0][1]?.headers).get('Idempotency-Key')).toBe("request-123456789");
});
it("surfaces the structured conflict detail: message, run id, outcome and recovery", async () => {
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  const fetch = vi.fn(async (_url: RequestInfo | URL, _options?: RequestInit) => new Response(JSON.stringify({
    detail: {
      message: "the original request's outcome is uncertain; operator reconciliation required before any resubmission",
      run_id: "run-uncertain-001", outcome: "uncertain",
      recovery: "an operator must determine whether effects occurred and record the decision; never retry with a new key until then",
    },
  }), { status: 409 }));
  vi.stubGlobal("fetch", fetch);
  const rejection = await apiClient.post('/analysis', {}, { idempotencyKey: "request-123456789" }).catch((e: unknown) => e);
  expect(rejection).toBeInstanceOf(IdempotencyConflictError);
  const conflict = rejection as IdempotencyConflictError;
  expect(conflict.message).toContain("uncertain");
  expect(conflict.runId).toBe("run-uncertain-001");
  expect(conflict.outcome).toBe("uncertain");
  expect(conflict.recovery).toContain("never retry with a new key");
  expect(fetch).toHaveBeenCalledTimes(1);
});
