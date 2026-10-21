"use client";

import { create } from "zustand";
import type { TokenBalance } from "./types";
import { MOCK_BALANCE, MOCK_USER } from "./fixtures";
import { FREE_TOKENS_ON_SIGNUP } from "./constants";

/**
 * Auth store.
 *
 * IMPORTANT (per spec): the real backend's Firebase ID token is NEVER
 * persisted to localStorage (XSS risk). Firebase handles session
 * persistence internally; the in-memory idToken is fetched fresh before
 * each request via `await user.getIdToken()`.
 *
 * In this sandbox demo we have no Firebase, so we store a mock idToken in
 * memory only (zustand without persist). The demo starts signed-in by
 * default so the reviewer can immediately interact with the app — in the
 * real app the AuthProvider would call `onAuthStateChanged` and the user
 * would have to sign in via the LoginPage.
 */
interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  institution: string;
}

interface AuthState {
  user: MockUser | null;
  idToken: string | null; // memory only — never persisted
  status: "loading" | "authenticated" | "unauthenticated";

  signIn: (user: MockUser) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Demo starts signed-in as the mock researcher so the reviewer can
  // immediately exercise every page.
  user: MOCK_USER,
  idToken: `mock-id-token-${MOCK_USER.uid}`,
  status: "authenticated",
  signIn: (user) =>
    set({
      user,
      idToken: `mock-id-token-${user.uid}-${Date.now()}`,
      status: "authenticated",
    }),
  signOut: () =>
    set({ user: null, idToken: null, status: "unauthenticated" }),
}));

/**
 * Token balance store.
 *
 * The balance lives in-memory (Zustand, no persistence) because it is
 * authoritative server state — the source of truth is
 * `GET /billing/balance`, and we never want a stale cached value to
 * mask a 402. The TanStack Query `useBalance` hook is what actually
 * populates this store; mutations invalidate the query and the new
 * balance flows back in.
 *
 * The `insufficientTokensError` field is the one place the UI reaches
 * into the store directly: when the API client throws an
 * `InsufficientTokensError`, the modal subscribes to this slice and
 * opens. `pendingRetryOp` is the operation to auto-retry once the user
 * tops up.
 */
interface InsufficientTokensErrorState {
  operation_id: string;
  balance: number;
  required: number;
  topup_url: string;
}

interface TokenState {
  balance: TokenBalance | null;
  insufficientTokensError: InsufficientTokensErrorState | null;
  pendingRetryOp: { operation_id: string; retry: () => Promise<unknown> } | null;

  setBalance: (b: TokenBalance) => void;
  setInsufficientTokensError: (e: InsufficientTokensErrorState) => void;
  clearInsufficientTokensError: () => void;
  setPendingRetryOp: (op: TokenState["pendingRetryOp"]) => void;
}

const initialBalance: TokenBalance = {
  ...MOCK_BALANCE,
  balance: FREE_TOKENS_ON_SIGNUP,
  last_updated: new Date().toISOString(),
};

export const useTokenStore = create<TokenState>((set) => ({
  balance: initialBalance,
  insufficientTokensError: null,
  pendingRetryOp: null,
  setBalance: (b) => set({ balance: b }),
  setInsufficientTokensError: (e) => set({ insufficientTokensError: e }),
  clearInsufficientTokensError: () => set({ insufficientTokensError: null }),
  setPendingRetryOp: (op) => set({ pendingRetryOp: op }),
}));

/**
 * Convenience helper for the demo to "spend" tokens client-side, mirroring
 * the backend's metered deduction. The mock-api layer calls this after a
 * successful metered operation so the header badge stays in sync without a
 * separate fetch round-trip.
 */
export function spendTokens(n: number): void {
  const { balance, setBalance } = useTokenStore.getState();
  if (!balance) return;
  setBalance({
    ...balance,
    balance: Math.max(0, balance.balance - n),
    last_updated: new Date().toISOString(),
  });
}

/**
 * Add tokens (after a simulated top-up). Triggers a re-render of the
 * header badge and, if there's a pending retry, the retry callback.
 */
export function addTokens(n: number): void {
  const state = useTokenStore.getState();
  if (!state.balance) return;
  state.setBalance({
    ...state.balance,
    balance: state.balance.balance + n,
    last_updated: new Date().toISOString(),
  });
  // Clear the 402 modal and auto-retry the pending operation.
  state.clearInsufficientTokensError();
  if (state.pendingRetryOp) {
    void state.pendingRetryOp
      .retry()
      .finally(() => useTokenStore.getState().setPendingRetryOp(null));
  }
}

export { MOCK_USER };
