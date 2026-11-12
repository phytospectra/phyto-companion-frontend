# UI acceptance record — 2026-11-12 (browser pass)

What was actually rendered and inspected in a real browser, and what remains
blocked. This is the inspection record; screenshots referenced below are
preserved beside the operational transcript (`/tmp/phyto-ops-20261112/ui-evidence/`).

## Environment

- Frontend revision `29dc536` + the file-input accessibility fix (this branch).
- Production builds served via `.next/standalone/server.js` (Node 26.11.1):
  mock build (`NEXT_PUBLIC_USE_MOCKS=true`, port 3000) and live build
  (`NEXT_PUBLIC_USE_MOCKS=false`, port 3001).
- Browser: ZCode in-app browser (Chromium IAB), 1280×720 and 390×844
  viewports. Screenshots: `ui-evidence/` (desktop upload, narrow upload,
  settings, login).

## Checks performed

| Page / state | Result |
|---|---|
| /upload (mock, desktop) | Renders: labelled form controls, drop zone (role=button, keyboard Enter/Space, focus ring), token-cost status, workflow cards. Screenshot preserved. |
| /upload (mock, 390×844) | No horizontal overflow (scrollWidth == clientWidth == 390); mobile nav collapses to a "Primary" navigation. Screenshot preserved. |
| Form error announcement | Submitting without files raises a `role=alert` announcement: "Add at least one spectra file… before starting the analysis." |
| Control naming audit | After the fix below: zero unnamed `input/textarea/select/button` controls on /upload, /settings, /login. |
| /settings (mock) | h1 "Account & model preferences"; zero unnamed controls. Screenshot preserved. |
| /login (mock) | "Continue with Google" / "Sign in with email"; zero unnamed controls. Screenshot preserved. |
| Live build (mocks off) | Signed-out visitors get the value-prop landing on /upload (h1 "Upload your NMR / LC-MS data…"); protected workspace surfaces require Firebase sign-in — not exercised (see blockers). |
| Dark-mode toggle | Present and labelled ("Switch to dark mode") on every page checked. |

## Defect found and fixed

`FileDropZone`'s hidden `<input type="file">` was focusable and unnamed: an
anonymous control in the tab order for keyboard and screen-reader users. The
drop zone div is already the accessible trigger (`role="button"`,
`tabIndex={0}`, Enter/Space handling, aria-label), so the raw input was
excluded with `aria-hidden="true"` and `tabIndex={-1}`. Verified in the
browser after rebuild: zero unnamed controls.

## Known harness limitations (not page defects)

- The IAB Playwright surface could not resolve the submit button by role
  name (its accessible name embeds a nested status region); the click was
  issued through a page-side script for the error-announcement check. The
  same button is covered by unit tests.
- This session's model cannot render screenshots; pixel-level judgment was
  replaced by DOM-snapshot audits (roles, accessible names, states, layout
  overflow) plus preserved screenshots for a human reviewer.
- File upload interaction could not be driven (IAB does not support file
  choosers); the drop-zone keyboard/click wiring is unit-tested.

## Blockers (external)

- **Firebase identity**: the live ResearchWorkspace (the durable run-history
  surface with the new outcome states) sits behind Firebase sign-in. Without
  a staging Firebase project and disposable test identities (the documented
  staging prerequisite), the authenticated workspace flow cannot be exercised
  in a browser. Its behavior is covered by component tests
  (`tests/unit/research-workspace.test.tsx`, including the new admitted /
  awaiting_review / structured-409 cases) and by the backend authenticated
  contract suite.
- Playwright e2e is not run in CI and was not run locally (browsers not
  provisioned); this record is the browser evidence.

## 2026-11-12 round 2 — integrated live-workspace verification (offline auth)

The live ResearchWorkspace was exercised in a real browser against the real
authenticated backend **without Firebase staging**, via a build-gated offline
demo identity in `AuthProvider` (`NEXT_PUBLIC_RESEARCH_DEMO=true`; the mock
verifier's `mock:<uid>` token flows through the exact production module
graph). The earlier separate demo-route approach was removed: per-route
client bundling duplicated the api-client module and silently dropped the
bearer token — the production AuthProvider path carries it correctly.

Verified in the browser (screenshots: `backend docs/evidence/2026-11-12/`):

1. `/upload` loads capabilities through the real middleware and enables the
   workspace (no alerts).
2. Submit a reference-ranking query → durable `Outcome: awaiting review`
   rendered in the detail view and "awaiting review · review required" in
   the owner-scoped history.
3. Backend SIGKILL → restart → "Refresh history" reloads the durable history
   and "Load or refresh run" re-hydrates the run — **recovery through the
   real UI**, no loss.
4. Review checkbox + "Record review and complete checkpoint" → `Outcome:
   completed`; the durable store shows the run completed with no admitted
   approvals left open.

Product fix found by this pass: the workspace's mount-time capabilities
request races the parent AuthProvider's token effect; one bounded 500 ms
retry (never a loop) now covers it, with a regression test
(`recovers once from the mount-time auth race without user action`).

Account-isolation in the browser remains component-tested only (single
offline principal available); live multi-identity checks still need the
staging Firebase project.
