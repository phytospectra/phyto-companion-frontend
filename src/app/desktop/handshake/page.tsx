"use client";

/**
 * Desktop sign-in handshake.
 *
 * Phytospectra Desktop opens this page with ?port=<HANDSHAKE_PORT>, listens
 * on http://127.0.0.1:<port> itself, and expects either
 *   - a POST form with token/uid/email, or
 *   - a redirect to /handshake?token=...&uid=...&email=...
 * After Firebase sign-in completes we POST the ID token to the loopback
 * listener; a redirect fallback covers browsers that block the POST.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/auth/AuthProvider";

export default function DesktopHandshakePage() {
  const { idToken, status, signIn } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const [port, setPort] = React.useState(8765);
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = Number(params.get("port"));
    if (Number.isInteger(raw) && raw > 0 && raw < 65536) setPort(raw);
  }, []);

  // The desktop app also accepts the token via redirect; build the URL once
  // a token exists and try the POST first.
  React.useEffect(() => {
    if (!idToken || done) return;
    const user = JSON.parse(window.sessionStorage.getItem("phyto-handshake-user") ?? "{}");
    const form = document.createElement("form");
    form.method = "POST";
    form.action = `http://127.0.0.1:${port}/handshake`;
    form.style.display = "none";
    for (const [key, value] of Object.entries({
      token: idToken,
      uid: user.uid ?? "",
      email: user.email ?? "",
    })) {
      const input = document.createElement("input");
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    }
    document.body.appendChild(form);
    const timer = window.setTimeout(() => {
      // If the POST never completes (mixed-content blocked, app closed),
      // fall back to the GET redirect the desktop handler also accepts.
      window.location.replace(
        `http://127.0.0.1:${port}/handshake?token=${encodeURIComponent(idToken)}`,
      );
    }, 4000);
    form.submit();
    setDone(true);
    return () => window.clearTimeout(timer);
  }, [idToken, port, done]);

  async function withBusy(fn: () => Promise<void>): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "authenticated") {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {done ? "Signed in!" : "Finishing sign-in…"}
            </CardTitle>
            <CardDescription>
              {done
                ? "Handing the session back to Phytospectra Desktop. If the app does not continue automatically, leave this tab open for a few seconds — it will retry."
                : "Retrieving your session token…"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in for Phytospectra Desktop</CardTitle>
          <CardDescription>
            Sign in once here; the desktop app receives the session
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={() => void withBusy(() => signIn({ provider: "google" }))}
          >
            {busy ? "Signing in…" : "Continue with Google"}
          </Button>
          <div className="relative text-center text-xs text-muted-foreground">
            or with email
          </div>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void withBusy(() =>
                signIn({ provider: "password", email, password }));
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="hs-email">Email</Label>
              <Input
                id="hs-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hs-password">Password</Label>
              <Input
                id="hs-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}