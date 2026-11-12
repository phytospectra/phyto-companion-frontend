# Dependency security analysis — 2026-11-12

`npm audit` findings after removing the unused `@mdxeditor/editor` and
`react-syntax-highlighter` dependencies (dead code: neither was imported
anywhere in `src/`, `tests/` or `public/`; removing them eliminated five
moderate findings tied to js-yaml, prismjs and refractor).

Remaining: **5 high, 7 moderate, 0 critical.**

## Findings, severity, reachability and mitigation

| Package | Severity | Advisory subject | Reachability in this app | Mitigation / decision |
|---|---|---|---|---|
| `@grpc/grpc-js` (via `firebase` → `@firebase/firestore`) | high | gRPC error-message disclosure and auth-context issues (Node server runtime) | **Not reachable.** The app imports only `firebase/app` + auth modules (`src/auth/firebase.ts`); Firestore/gRPC code is never imported, and the browser web SDK does not execute the Node gRPC client. | **Accepted, tracked.** Monitor the firebase release line for the upstream fix; bump when a non-breaking release lands. |
| `firebase` | high (meta: the chain above) | same | direct dependency, but only the auth surface executes | same |
| `@firebase/firestore`, `@firebase/firestore-compat` | high | same chain | never imported (no `firestore` imports anywhere in `src/`) | same |
| `sharp` (direct) | high | bundled libvips/libheif/librsvg CVEs | **Not reachable.** `next/image` is not used anywhere in `src/`; Next's image optimizer (sharp's only execution path) never runs. | **Accepted, tracked.** Optionally pin `images.unoptimized` if `next/image` is ever introduced; bump when a fixed sharp release lands. |
| `typescript-eslint` chain + `minimatch` | moderate (7) | ESLint tooling DoS/glob issues | **Dev-only.** ESLint toolchain never ships in the production bundle. | **Accepted, tracked.** Fixed by routine dev-dependency bumps (`fixAvailable: true` for these). |
| `js-yaml` (via `eslint` → `@eslint/eslintrc`) | high (DoS advisories) | quadratic merge-key/omap CPU consumption when parsing YAML | **Dev-only and trusted input.** Reached only by ESLint parsing project configuration files; never in the production bundle; no released fix at 4.3.2. | **Accepted, tracked.** Re-review on each eslint bump. |

## Enforcement (not just an advisory)

`scripts/npm-audit-gate.mjs` runs in CI and fails the build when:

- any **critical** finding appears, or
- any **high** finding appears for a package outside the accepted baseline
  above (the five named high entries with their recorded rationale), or
- the accepted baseline itself shrinks without a corresponding doc update
  (the gate requires this file to name every accepted high finding).

Moderate dev-tooling findings are reported but do not block, so routine
toolchain updates stay visible in CI logs.

## Acceptance

The project records explicit acceptance of the five high findings with the
reachability arguments above, contingent on the review cadence: this file is
re-reviewed whenever `firebase`, `next`/`sharp` or the ESLint toolchain is
bumped, and the CI gate enforces that any new high/critical finding cannot
merge silently. Operator sign-off on this acceptance is recorded in the
completion ledger.
