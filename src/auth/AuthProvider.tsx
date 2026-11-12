"use client";

import * as React from "react";
import { setToken, clearToken } from "@/api/client";
import { QueryClientContext } from "@tanstack/react-query";
import { useTokenStore } from "@/lib/phyto/stores";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type SignInOptions =
  | { provider: "google" }
  | { provider: "orcid" }
  | { provider: "password"; email: string; password: string };

export interface AuthContextValue {
  user: AuthUser | null;
  idToken: string | null;
  status: AuthStatus;
  signIn: (options: SignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

const MOCK_USER: AuthUser = {
  uid: "mock-user-001",
  email: "researcher@phytospectra.com",
  displayName: "Dr. M. Rivera",
  photoURL: null,
};
const MOCK_TOKEN = "mock-id-token-mock-user-001";

/**
 * Offline research-demo identity (build-gated): seeds an authenticated
 * principal WITHOUT Firebase so the live workspace can be exercised in a
 * browser against a dry-run backend (whose mock verifier accepts
 * "mock:<uid>" tokens). Identical plumbing to mock mode so the token flows
 * through the exact production module graph. Never set in production builds.
 */
const DEMO_USER: AuthUser = {
  uid: "alice",
  email: "alice@demo.local",
  displayName: "Demo Alice",
  photoURL: null,
};
const DEMO_TOKEN = "mock:alice";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const RESEARCH_DEMO = process.env.NEXT_PUBLIC_RESEARCH_DEMO === "true";
// Offline identity: either the mock plane or the research-demo build.
const OFFLINE_IDENTITY = USE_MOCKS || RESEARCH_DEMO;
const OFFLINE_USER = USE_MOCKS ? MOCK_USER : DEMO_USER;
const OFFLINE_TOKEN = USE_MOCKS ? MOCK_TOKEN : DEMO_TOKEN;

function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

const FIREBASE_CONFIGURED = isFirebaseConfigured();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = React.useContext(QueryClientContext);
  const accountUid = React.useRef<string | null>(null);
  const resetAccount = React.useCallback(() => {
    clearToken();
    queryClient?.clear();
    useTokenStore.setState({ balance: null, insufficientTokensError: null, pendingRetryOp: null });
  }, [queryClient]);
  // Initial state is derived rather than assigned in an effect: that avoids a
  // first-paint flash of the signed-out UI and a needless extra render.
  const [user, setUser] = React.useState<AuthUser | null>(() =>
    OFFLINE_IDENTITY ? OFFLINE_USER : null
  );
  const [idToken, setIdToken] = React.useState<string | null>(() =>
    OFFLINE_IDENTITY ? OFFLINE_TOKEN : null
  );
  const [status, setStatus] = React.useState<AuthStatus>(() => {
    if (OFFLINE_IDENTITY) return "authenticated";
    return FIREBASE_CONFIGURED ? "loading" : "unauthenticated";
  });

  // Offline identity (mock mode or research-demo): no Firebase, no network.
  // Only the API client (an external system) is touched here; auth state is
  // already initialised above.
  React.useEffect(() => {
    if (!OFFLINE_IDENTITY) return;
    setToken(OFFLINE_TOKEN, OFFLINE_USER.uid);
    return () => clearToken();
  }, []);

  // Real mode: subscribe to Firebase auth state.
  React.useEffect(() => {
    if (OFFLINE_IDENTITY) return;

    if (!FIREBASE_CONFIGURED) {
      clearToken();
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const [{ onIdTokenChanged, signOut: fbSignOut }, { auth }] =
        await Promise.all([
          import("firebase/auth"),
          import("./firebase"),
        ]);

      if (!active) return;
      let generation = 0;
      unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
        if (!active) return;
        const current = ++generation;
        if (accountUid.current !== (fbUser?.uid ?? null)) {
          resetAccount();
          accountUid.current = fbUser?.uid ?? null;
          setUser(null);
          setIdToken(null);
          setStatus("loading");
        }
        if (!fbUser) {
          setUser(null);
          setIdToken(null);
          setStatus("unauthenticated");
          clearToken();
          return;
        }
        let token: string;
        try {
          token = await fbUser.getIdToken();
        } catch {
          if (!active || current !== generation) return;
          resetAccount();
          setUser(null);
          setIdToken(null);
          setStatus("unauthenticated");
          return;
        }
        if (!active || current !== generation) return;
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        });
        setIdToken(token);
        setStatus("authenticated");
        setToken(token, fbUser.uid);
      });

      void fbSignOut;
    })().catch(() => {
      if (!active) return;
      resetAccount();
      setUser(null);
      setIdToken(null);
      setStatus("unauthenticated");
    });

    return () => {
      active = false;
      unsubscribe?.();
      resetAccount();
    };
  }, [resetAccount]);

  const signIn = React.useCallback(async (options: SignInOptions) => {
    if (OFFLINE_IDENTITY) {
      setUser(OFFLINE_USER);
      setIdToken(OFFLINE_TOKEN);
      setStatus("authenticated");
      setToken(OFFLINE_TOKEN, OFFLINE_USER.uid);
      return;
    }

    const [
      { signInWithPopup, signInWithEmailAndPassword, OAuthProvider },
      { auth, googleProvider },
    ] = await Promise.all([import("firebase/auth"), import("./firebase")]);

    if (options.provider === "google") {
      await signInWithPopup(auth, googleProvider);
    } else if (options.provider === "orcid") {
      // Generic OIDC provider. Requires the provider to be registered in the
      // Firebase console with ORCID's client credentials first; the button
      // stays behind FEATURE_FLAGS.orcid_signin until then.
      // TODO(oauth): register the ORCID provider (firebase console →
      // Identity Platform → OIDC) and flip FEATURE_FLAGS.orcid_signin.
      const orcidProvider = new OAuthProvider("oidc.orcid");
      orcidProvider.addScope("openid");
      await signInWithPopup(auth, orcidProvider);
    } else {
      await signInWithEmailAndPassword(auth, options.email, options.password);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    resetAccount();
    setUser(null);
    setIdToken(null);
    setStatus("unauthenticated");
    if (OFFLINE_IDENTITY) {
      setUser(null);
      setIdToken(null);
      setStatus("unauthenticated");
      clearToken();
      return;
    }

    const [{ signOut: fbSignOut }, { auth }] = await Promise.all([
      import("firebase/auth"),
      import("./firebase"),
    ]);
    await fbSignOut(auth);
  }, [resetAccount]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, idToken, status, signIn, signOut }),
    [user, idToken, status, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth context. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
