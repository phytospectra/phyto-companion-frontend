/**
 * Starts the MSW worker in development when mocks are explicitly enabled.
 *
 * Loaded from a client component in the root layout so the service worker
 * is registered before the first application fetch.
 */
export async function initMocks(): Promise<void> {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_USE_MOCKS !== "true"
  ) {
    return;
  }

  const { worker } = await import("./browser");
  await worker.start({ onUnhandledFrame: "warn" });
}
