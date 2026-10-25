import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account — Phytospectra" };

/**
 * Account/billing landing. Stripe Checkout is wired server-side by the
 * billing service; the desktop app opens this page for "Buy tokens".
 */
export default function AccountBillingPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-lg space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Tokens &amp; billing</h1>
        <p className="text-muted-foreground">
          Token purchases open in Stripe Checkout. Sign in first — use the
          same account as the desktop app — and the balance shown there
          refreshes on the next analysis run.
        </p>
        <a
          href="/login"
          className="inline-block rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground"
        >
          Sign in to manage tokens
        </a>
      </div>
    </div>
  );
}