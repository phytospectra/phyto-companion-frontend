Phytospectra Frontend — README
==============================

This is the **Phytospectra frontend**: an honesty-first UI for an AI-native
natural product drug discovery platform. Every claim carries a verdict badge
(color + text + tooltip — never color alone); every candidate is one click
from its evidence graph; every mechanism hypothesis carries its disclaimer
at the top of the panel, never buried in a footer.

> **What this package is.** A Next.js 16 (App Router) implementation of the
> honesty-first UI patterns specified in the platform's frontend contract.
> It runs against an in-memory mock API (`src/lib/phyto/mock-api.ts`) that
> throws the same `InsufficientTokensError` class the real axios
> interceptor would throw on a 402. **Swapping the mock for the real
> `https://api.phytospectra.com` is a mechanical change** — the component
> contracts (props in / props out) are identical.

> **What this package is NOT.** It is not the spec's literal Vite + React
> 18 standalone repo. The spec called for Vite + React 18 + Firebase Auth
> + MSW + Cytoscape + Plotly + Vitest + Playwright + Firebase Hosting. The
> sandbox this code was authored in runs Next.js 16 with React 19, so the
> implementation is on Next.js. The component / data-contract / state-store
> / honesty-pattern layer is portable to the spec's Vite target with
> minimal changes (mostly file-system layout and a handful of `next/*`
> imports replaced with `react-router` equivalents).

---

## Quick start

```bash
# from the repo root
npm install        # or: bun install / pnpm install
npm run dev        # starts on http://localhost:3000
```

The demo starts **signed in** as `Dr. M. Rivera` with 50 free tokens so you
can immediately exercise every page. No Firebase, no Stripe, no real
backend required — the mock API handles everything.

## Available scripts

| Script            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start the dev server (port 3000)                   |
| `npm run build`   | Production build                                    |
| `npm run start`   | Start the production server                         |
| `npm run lint`    | ESLint check                                        |

## Architecture

The frontend is organised in five layers, each of which is a drop-in
swap away from the production spec:

1. **Data layer** — `src/lib/phyto/{types,fixtures,constants,formatting}.ts`
   TypeScript interfaces mirror the backend API contract verbatim
   (`CandidateRank`, `RunState`, `MechanismHypothesis`, `SiteLocalization`,
   `EvidenceGraph`, `TokenBalance`, etc.). Swap `fixtures.ts` for TanStack
   Query hooks hitting `https://api.phytospectra.com`.

2. **State layer** — `src/lib/phyto/{stores,mock-api}.ts`
   Zustand stores hold the in-memory auth user + token balance
   (`useAuthStore`, `useTokenStore`). The mock API throws
   `InsufficientTokensError` on a simulated 402 — exactly what the real
   axios interceptor would do. Idempotency keys are deduped per key.

3. **Common leaf components** — `src/components/phyto/common/`
   `VerdictBadge`, `UncertaintyBadge`, `DisclaimerBanner`, `CostBadge`,
   `InsufficientTokensModal`, `LoadingSpinner`, `EmptyState`. These are
   the platform's honesty primitives.

4. **Specialist pages** — `src/components/phyto/{upload,analysis,network,
   elucidation,mechanism,billing,ResultsPage,SettingsPage}.tsx`. Each
   consumes only the data layer + stores + common components.

5. **Layout** — `src/components/phyto/layout/AppShell.tsx`. Sticky header
   with balance badge + theme toggle + user menu, sidebar nav, sticky
   footer.

See `ARCHITECTURE.md` (in the source repo, not this package) for the full
diagrams of the token flow, the error-handling strategy, and the testing
strategy.

## Honesty contract (acceptance criteria)

These are demonstrated end-to-end in the demo:

- ✅ Every verdict badge has **color + text + tooltip**.
- ✅ Every candidate shows its **ranking interval** (ties are first-class).
  "Ranks 2–3 (tied)" not "Rank 2".
- ✅ Every candidate, network node, and mechanism claim has an
  **Evidence button** opening a slide-over with: evidence graph,
  supporting features, unmatched observed peaks, unmatched predicted
  peaks, cross-modal propagation, and citations.
- ✅ Every mechanism hypothesis carries its disclaimer at the
  **top of the panel** (role="note", uppercase).
- ✅ Every checkpoint requires a **typed reason (min 10 chars)** for
  **both Approve and Reject**. Both buttons disabled until satisfied.
- ✅ Every metered button shows a **CostBadge** with the token cost +
  current balance + post-op balance before the user clicks.
- ✅ A 402 response opens a modal showing balance / required / difference
  and an auto-retry banner. After top-up, the failed operation retries
  automatically.

## Deploying

This package is a Next.js 16 app, deployable to Vercel, Firebase Hosting,
or any Node.js host:

```bash
npm run build
npm run start
```

For Firebase Hosting specifically, add a `firebase.json`:

```json
{
  "hosting": {
    "site": "phytospectra-app",
    "public": "dist",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

Then `firebase deploy --only hosting --project phyto-companion-prod`.

## License

AGPL-3.0 — matches the backend. See `LICENSE`.

## Acknowledgements

Built as a Phase 1 demo of the honesty-first patterns specified by the
Phytospectra platform contract. The full backend API contract lives at
`https://github.com/phytospectra/phyto-companion` (separate repo).
