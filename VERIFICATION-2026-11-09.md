# Offline frontend verification — 2026-11-09

Source tested: `9632bb151316417822040d86019c9053899826b5`.

## Diagnosis

Previous installed-dependency runs stalled before diagnostics. A fresh `tsc --noEmit --incremental false` showed negligible CPU while holding an open declaration file. `ls -lO node_modules/typescript/lib/typescript.js` reported `compressed,dataless`. This is evidence of macOS on-demand filesystem hydration in the Documents checkout, not a demonstrated type error. The diagnostic process was stopped, not repeatedly retried with longer timeouts.

## Reproduction and results

Copy `git ls-files` tracked files into a fresh temporary directory outside the cloud-managed Documents tree, preserving relative paths. Do not copy `.env` credentials or existing `node_modules`. From that directory run:

```sh
npm ci --ignore-scripts --no-audit --no-fund
./node_modules/.bin/tsc --noEmit --incremental false
npm run test:unit
NEXT_TELEMETRY_DISABLED=1 npm run build
```

Installation requires public package-registry access or a complete pre-populated cache; this is **not an air-gapped setup**. `npm ci --prefix` from elsewhere produced a root-package lock validation error; running `npm ci` inside the checkout succeeded without modifying package.json or package-lock.json. No lockfile repair or broad dependency update was needed. Lifecycle scripts were disabled for dependency installation; normal named test/build scripts were then run explicitly.

Environment: macOS arm64, Node 26.11.1; locked Next.js 16.4.2, Vitest 5.0.5. Temporary hydrated checkout installation exited 0. Typecheck exited 0 without diagnostics. Unit tests: **seven files, 28 tests passed in 2.70 seconds**, including auth account-switch/refresh/late-token isolation and live workflow/billing guards. Production build exited 0: compilation 14.7 seconds, build TypeScript 9.3 seconds, 13/13 static pages generated. Existing Vite future-config warning and zero-size chart warnings under DOM simulation were retained, not suppressed to obtain a pass.

## Boundaries

These are deterministic offline transport/UI tests and a production artifact build, not browser integration or authenticated staging evidence. The default build does not prove valid Firebase configuration, login, token revocation, live authoritative billing, or support for the real reference-HSQC workflow in the frontend. No frontend GitHub CI was configured at this revision. No deployment, real login, purchase, inference, training, or production operation occurred.
