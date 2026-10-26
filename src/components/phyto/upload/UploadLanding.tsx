"use client";

import * as React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/auth/AuthProvider";
import { SampleAnalysisDialog } from "./SampleAnalysisDialog";
import { APP_META, FEATURE_FLAGS, LANDING, VALUE_PROPS } from "@/lib/phyto/constants";

/**
 * Unauthenticated /upload experience: the value proposition first, the
 * sign-in form beside it. The form is the same email/password + Google
 * sign-in the login page offers, embedded so the visitor never loses the
 * pitch while signing in.
 */
export function UploadLanding() {
  const { signIn } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function run(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void run(() => signIn({ provider: "password", email, password }));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
      <div className="grid items-start gap-8 lg:grid-cols-5 lg:gap-12">
        {/* Value proposition */}
        <section className="space-y-5 lg:col-span-3" aria-labelledby="landing-headline">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {APP_META.name}
          </p>
          <h1
            id="landing-headline"
            className="text-balance text-3xl font-semibold tracking-tight md:text-4xl"
          >
            {LANDING.headline}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{LANDING.subheadline}</p>

          <ul className="space-y-3" aria-label="What Phytospectra gives you">
            {VALUE_PROPS.map((prop) => (
              <li key={prop} className="flex items-start gap-2.5">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  style={{ width: "1rem", height: "1rem" }}
                />
                <span className="text-sm">{prop}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <SampleAnalysisDialog />
            <span className="text-xs text-muted-foreground">
              {LANDING.demo_hint}
            </span>
          </div>
        </section>

        {/* Sign-in card */}
        <section className="lg:col-span-2" aria-labelledby="signin-heading">
          <Card>
            <CardHeader>
              <CardTitle id="signin-heading">Sign in to upload</CardTitle>
              <CardDescription>
                {APP_META.tagline}. New accounts start with 50 free analysis
                tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription aria-live="assertive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                data-testid="google-signin"
                onClick={() => void run(() => signIn({ provider: "google" }))}
              >
                {busy ? "Connecting…" : "Sign in with Google"}
              </Button>

              {FEATURE_FLAGS.orcid_signin && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  data-testid="orcid-signin"
                  onClick={() => void run(() => signIn({ provider: "orcid" }))}
                >
                  Sign in with ORCID
                </Button>
              )}

              <div className="relative text-center text-xs text-muted-foreground">
                <Separator className="absolute inset-x-0 top-1/2" />
                <span className="relative bg-card px-2">or continue with email</span>
              </div>

              <form className="space-y-3" onSubmit={onSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="landing-email">Email</Label>
                  <Input
                    id="landing-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="landing-password">Password</Label>
                  <Input
                    id="landing-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in with email"}
                </Button>
              </form>

              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  style={{ width: "0.85rem", height: "0.85rem" }}
                />
                {LANDING.trust_note}
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}