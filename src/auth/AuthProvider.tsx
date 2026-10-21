"use client";

import * as React from "react";
import { setToken, clearToken } from "@/api/client";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type SignInOptions =
  | { provider: "google" }
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

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [idToken, setIdToken] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>("loading");

  // Mock mode: no Firebase, no network. Authenticated immediately.
  React.useEffect(() => {
    if (!USE_MOCKS) return;
    setUser(MOCK_USER);
    setIdToken(MOCK_TOKEN);
    setStatus("authenticated");
    setToken(MOCK_TOKEN);
    return () => clearToken();
  }, []);

  // Real mode: subscribe to Firebase auth state.
  React.useEffect(() => {
    if (USE_MOCKS) return;

    if (!isFirebaseConfigured()) {
      setStatus("unauthenticated");
      clearToken();
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const [{ onAuthStateChanged, signOut: fbSignOut }, { auth }] =
        await Promise.all([
          import("firebase/auth"),
          import("./firebase"),
        ]);

      unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (!active) return;
        if (!fbUser) {
          setUser(null);
          setIdToken(null);
          setStatus("unauthenticated");
          clearToken();
          return;
        }
        const token = await fbUser.getIdToken();
        if (!active) return;
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
        });
        setIdToken(token);
        setStatus("authenticated");
        setToken(token);
      });

      // Keep the signature reference alive for the unmount path.
      void fbSignOut;
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = React.useCallback(async (options: SignInOptions) => {
    if (USE_MOCKS) {
      setUser(MOCK_USER);
      setIdToken(MOCK_TOKEN);
      setStatus("authenticated");
      setToken(MOCK_TOKEN);
      return;
    }

    const [{ signInWithPopup, signInWithEmailAndPassword }, { auth, googleProvider }] =
      await Promise.all([import("firebase/auth"), import("./firebase")]);

    if (options.provider === "google") {
      await signInWithPopup(auth, googleProvider);
    } else {
      await signInWithEmailAndPassword(auth, options.email, options.password);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    if (USE_MOCKS) {
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
  }, []);

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
