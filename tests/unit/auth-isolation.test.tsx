import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const firebase = vi.hoisted(() => ({ listener: null as null | ((user: unknown) => Promise<void>), unsubscribe: vi.fn() }));
vi.mock("firebase/auth", () => ({
  onIdTokenChanged: vi.fn((_auth, listener) => { firebase.listener = listener; return firebase.unsubscribe; }),
  signOut: vi.fn(),
}));
vi.mock("@/auth/firebase", () => ({ auth: {}, googleProvider: {} }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

it("refreshes tokens, clears account data and rejects late tokens from the previous user", async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
  for (const key of ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID"]) vi.stubEnv(`NEXT_PUBLIC_FIREBASE_${key}`, "test-only");
  const { AuthProvider, useAuth } = await import("@/auth/AuthProvider");
  const { useTokenStore } = await import("@/lib/phyto/stores");
  const { getToken } = await import("@/api/client");
  function Probe() { const auth = useAuth(); return <div>{auth.user?.uid ?? auth.status}</div>; }
  const client = new QueryClient();
  render(<QueryClientProvider client={client}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
  await waitFor(() => expect(firebase.listener).toBeTypeOf("function"));
  const user = (uid: string, token: Promise<string>) => ({ uid, getIdToken: () => token });
  await act(() => firebase.listener!(user("alice", Promise.resolve("alice-token"))));
  expect(getToken()).toBe("alice-token");
  client.setQueryData(["run", "private"], { secret: "alice-only" });
  useTokenStore.setState({ balance: { user_id: "alice", balance: 30, last_updated: "now" }, pendingRetryOp: { operation_id: "old", retry: vi.fn() } });
  let resolve!: (token: string) => void;
  const late = firebase.listener!(user("alice", new Promise<string>(r => { resolve = r; })));
  await act(() => firebase.listener!(user("bob", Promise.resolve("bob-token"))));
  await act(async () => { resolve("stale-alice-token"); await late; });
  expect(screen.getByText("bob")).toBeInTheDocument();
  expect(getToken()).toBe("bob-token");
  expect(client.getQueryData(["run", "private"])).toBeUndefined();
  expect(useTokenStore.getState().balance).toBeNull();
  expect(useTokenStore.getState().pendingRetryOp).toBeNull();
  await act(() => firebase.listener!(user("bob", Promise.reject(new Error("expired")))));
  expect(getToken()).toBeNull();
  expect(screen.getByText("unauthenticated")).toBeInTheDocument();
});
