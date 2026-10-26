/**
 * Starts the MSW worker when mocks are explicitly enabled.
 *
 * No NODE_ENV gate: demo deployments are production builds with
 * NEXT_PUBLIC_USE_MOCKS=true baked in, and without the worker every API
 * call escapes to the real orchestrator with a mock token it rejects.
 *
 * Loaded from a client component in the root layout so the service worker
 * is registered before the first application fetch.
 */

let readyPromise: Promise<void> | null = null;

/**
 * The browser worker needs a real service worker container. Unit tests run
 * in jsdom (no serviceWorker) and use the node `server` worker instead.
 */
function canRunBrowserWorker(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    !navigator.userAgent.includes("jsdom")
  );
}

export function initMocks(): Promise<void> {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== "true") return Promise.resolve();
  if (!canRunBrowserWorker()) return Promise.resolve();
  // Memoised: instrumentation-client and the API client's readiness gate
  // share one start — setupWorker.start must not run twice.
  readyPromise ??= (async () => {
    const { worker } = await import("./browser");
    await worker.start({ onUnhandledFrame: "warn" });
  })();
  return readyPromise;
}

/**
 * Resolves once the mock worker intercepts fetches. The API client awaits
 * this before every request: production pages hydrate faster than the
 * service worker activates, and a request fired in that window would leak
 * to the real backend and fail.
 */
export function whenMocksReady(): Promise<void> {
  return initMocks();
}
