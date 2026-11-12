import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

beforeEach(() => {
  vi.resetModules();
  // AuthProvider reads these NEXT_PUBLIC_* flags at module evaluation, so
  // stub before the dynamic import below.
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  vi.stubEnv("NEXT_PUBLIC_RESEARCH_DEMO", "true");
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

it("seeds the offline research-demo principal without Firebase", async () => {
  const { AuthProvider, useAuth } = await import("@/auth/AuthProvider");
  const { getToken } = await import("@/api/client");
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.status).toBe("authenticated"));
  expect(result.current.user?.uid).toBe("alice");
  expect(result.current.idToken).toBe("mock:alice");
  await waitFor(() => expect(getToken()).toBe("mock:alice"));
});
