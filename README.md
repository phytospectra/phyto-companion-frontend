Phytospectra Frontend
=====================

An honesty-first UI for an AI-native natural product drug discovery
platform. Every claim carries a verdict badge (color + text + tooltip —
never color alone); every candidate is one click from its evidence graph;
every mechanism hypothesis carries its disclaimer at the top of the panel,
never buried in a footer.

The app is **Next.js 16 (App Router) + React 19 + TypeScript**, styled with
Tailwind CSS v4 and shadcn/ui. It runs fully offline against an in-browser
MSW mock backend, and switches to the real API by changing environment
variables — no code changes.

---

## Quick start

```bash
npm install --legacy-peer-deps   # React 19 peers still settle with legacy resolution
cp .env.example .env.local
npm run dev                      # http://localhost:3000
```

With `NEXT_PUBLIC_USE_MOCKS=true` (the default in `.env.example`) the demo
starts **signed in** as `Dr. M. Rivera` with 50 free tokens, so every page is
immediately reachable. No Firebase project, Stripe account, or backend is
required.

To run against a real backend instead, set `NEXT_PUBLIC_USE_MOCKS=false`,
fill in the Firebase keys, and point `NEXT_PUBLIC_API_BASE_URL` at the
orchestrator. The login page then performs real Firebase sign-in.

## Scripts

| Script                    | What it does                                            |
| ------------------------- | ------------------------------------------------------- |
| `npm run dev`             | Dev server on port 3000 (Turbopack)                     |
| `npm run build`           | Production build (standalone output)                    |
| `npm run start`           | Serve the production build                              |
| `npm run lint`            | ESLint                                                  |
| `npm run test:unit`       | Vitest unit suite (12 tests)                            |
| `npm run test:unit:watch` | Vitest in watch mode                                    |
| `npm run test:e2e`        | Playwright E2E suite (2 specs, chromium)                |

The E2E suite starts its own dev server with mocks enabled, so it needs no
external services. Install the browser once with
`npx playwright install chromium`.

## Routes

File-based App Router routes under `src/app/`:

| Route                 | Screen                                                     |
| --------------------- | ---------------------------------------------------------- |
| `/`                   | Redirects to `/upload` (or `/login` when unauthenticated)   |
| `/upload`             | Drop spectra, describe the sample, pick a workflow          |
| `/analysis/[run_id]`  | Task graph, token meter, human checkpoint, audit tail       |
| `/network`            | MS2 / HSQC / fused / bioactivity network views              |
| `/elucidation`        | Ranked candidates, novelty, site localisation               |
| `/pharmacology`       | Target interactions and mechanism hypothesis                |
| `/results/[run_id]`   | Assembled report                                            |
| `/billing`            | Token packs, transactions, 402 demo                         |
| `/settings`           | LLM provider and model version                              |
| `/login`              | Firebase sign-in (Google + email/password)                  |

`not-found.tsx`, `error.tsx`, and a reusable `ErrorBoundary` provide the
failure surfaces; `/api` is a health route used by smoke checks.

## Architecture

1. **Backend contract** — `src/api/types.ts` mirrors the orchestrator's
   response shapes verbatim (`CandidateRank`, `RunState`,
   `MechanismHypothesis`, `SiteLocalization`, `EvidenceGraph`,
   `TokenBalance`, …). This is the single source of truth for data shapes.

2. **API client** — `src/api/client.ts` is a typed `fetch` wrapper. Every
   non-2xx response becomes a typed error (`UnauthorizedError`,
   `InsufficientTokensError`, `ValidationError`, `ServerError`,
   `ServiceUnavailableError`, `NetworkError`), so nothing is silently
   swallowed. It attaches the bearer token from `setToken()`,
   generates/forwards `Idempotency-Key`, and honours `AbortSignal`.
   FastAPI validation payloads are parsed into per-field messages.

3. **Mock backend** — `src/mocks/` holds MSW handlers typed against the
   contract, plus browser and Node workers. `src/instrumentation-client.ts`
   starts the browser worker in development; it is a client-only entry
   point because MSW's `msw/browser` export is `null` under the Node
   condition and must stay out of the server bundle. The Node worker is
   used by unit tests.

4. **Auth** — `src/auth/` contains the Firebase module, `AuthProvider`
   (subscribes to `onAuthStateChanged`, pushes the ID token into the API
   client, never persists it to storage), `LoginPage`, and `ProtectedRoute`.
   When mocks are on, auth short-circuits to a fixed demo user.

5. **State** — `src/lib/phyto/stores.ts` holds Zustand stores for the auth
   user and token balance (`useAuthStore`, `useTokenStore`), including the
   402 error state and queued retry operation.

6. **UI** — `src/components/phyto/` is split into `common/` (honesty
   primitives: `VerdictBadge`, `UncertaintyBadge`, `DisclaimerBanner`,
   `CostBadge`, `InsufficientTokensModal`), `layout/` (`AppShell`,
   `AppFrame`, `PageHeader`), and one directory per feature page.

## Testing

- **Unit** (`tests/unit/`, Vitest + Testing Library, jsdom): API client
  error mapping and token handling, `VerdictBadge` accessibility contract,
  `CostBadge` arithmetic, `LoginPage` sign-in flow, and the 402 modal.
- **E2E** (`tests/e2e/`, Playwright): the upload → analysis-checkpoint happy
  path, and billing 402 → modal → billing navigation.

## Environment variables

See `.env.example` for the full annotated list. In short:

| Variable                             | Purpose                                        |
| ------------------------------------ | ---------------------------------------------- |
| `NEXT_PUBLIC_USE_MOCKS`              | `true` serves everything from MSW              |
| `NEXT_PUBLIC_API_BASE_URL`           | Orchestrator base URL (real mode)              |
| `NEXT_PUBLIC_FIREBASE_*`             | Firebase web app config (real mode)            |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key only; secrets stay server-side |

Nothing in `NEXT_PUBLIC_*` is secret. Firebase ID tokens are held in memory
by `AuthProvider` and never written to `localStorage`.

## Honesty contract

Demonstrated end-to-end in the demo:

- Verdict badges always carry color + text + tooltip, and meet WCAG 1.4.1.
- Candidate ranks are intervals; ties are first-class ("Ranks 2–3 (tied)").
- Candidates, network nodes, and mechanism claims each have an Evidence
  control opening the graph, matched/unmatched peaks, and citations.
- Mechanism hypotheses carry their disclaimer at the top of the panel.
- Checkpoints require a typed reason (min 10 chars) for both approve and
  reject; both buttons stay disabled until it is satisfied.
- Metered actions show cost, current balance, and post-operation balance
  before the click.
- A 402 opens a modal stating balance, required, and shortfall, with an
  automatic retry queued for after top-up.

## Deploying

The build uses `output: "standalone"`.

```bash
npm run build
npm run start
```

Any Node host (or a container built from `.next/standalone`) works. For
Firebase Hosting, configure a rewrite of `**` to the server function rather
than the SPA fallback used by a static export, since routes are
server-rendered.

## License

The software is available under the [Apache License 2.0](LICENSE).
