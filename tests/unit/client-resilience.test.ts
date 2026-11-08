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
