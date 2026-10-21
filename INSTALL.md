# How to push this code to GitHub

This package was prepared in a sandbox with **no GitHub credentials**, so
it could not be pushed directly. Instead, it's been packaged as a clean
git repo + bundle + tarball. From any machine with GitHub access, do
**one** of the following:

---

## Option A — Clone from the git bundle, then push (recommended)

The bundle preserves the clean Phase 1 commit history.

```bash
# 1. Clone from the bundle
git clone /path/to/phytospectra-frontend-phase1.bundle phyto-companion

# 2. Enter the repo
cd phyto-companion

# 3. Re-point origin at the real GitHub remote
git remote remove origin
git remote add origin https://github.com/phytospectra/phyto-companion.git

# 4. Push
git push -u origin main
```

If `phytospectra/phyto-companion` is meant to hold **both** the backend
and the frontend (monorepo), instead push the frontend into a
subdirectory:

```bash
# From inside an existing phyto-companion checkout
git fetch /path/to/phytospectra-frontend-phase1.bundle main:phyto-frontend
git subtree add --prefix=frontend phyto-frontend --squash
git push origin main
```

## Option B — Extract the tarball, commit, push

Use this if you don't want the bundle's history and want a single fresh
commit.

```bash
# 1. Extract
tar -xzf phytospectra-frontend-phase1.tar.gz
cd phytospectra-frontend

# 2. Init a fresh repo and commit
git init
git add .
git commit -m "Phase 1: Foundation — Phytospectra frontend (Next.js 16)"

# 3. Push to GitHub
git branch -M main
git remote add origin https://github.com/phytospectra/phyto-companion.git
git push -u origin main
```

---

## Verifying the push worked

After pushing, on GitHub:

1. Open `https://github.com/phytospectra/phyto-companion`
2. Confirm `README.md`, `LICENSE`, `package.json`, and `src/components/phyto/`
   appear in the file tree
3. Confirm the latest commit message is `Phase 1: Foundation — Phytospectra frontend (Next.js 16)`

## What's in the package

| File                                       | What it is                                       |
| ------------------------------------------ | ------------------------------------------------ |
| `phytospectra-frontend/`                   | The standalone repo directory (ready to push)    |
| `phytospectra-frontend-phase1.bundle`      | Git bundle preserving Phase 1 commit history      |
| `phytospectra-frontend-phase1.tar.gz`      | Tarball of the same files (no .git)               |
| `INSTALL.md` (this file)                   | Push instructions                                 |

## What the package contains

30 frontend source files across:

- `src/lib/phyto/` — types, fixtures, constants, formatting, stores, mock-api
- `src/components/phyto/common/` — VerdictBadge, CostBadge, DisclaimerBanner,
  InsufficientTokensModal, UncertaintyBadge, EmptyState, LoadingSpinner
- `src/components/phyto/evidence/` — EvidenceGraph (SVG) + EvidencePanel
- `src/components/phyto/network/` — NetworkGraph (SVG) + NetworkPage (4 modality tabs)
- `src/components/phyto/elucidation/` — CandidateTable, NovelStructureViewer,
  SiteLocalizationPanel, ElucidationPage
- `src/components/phyto/analysis/` — TaskGraphViewer, CheckpointApproval, AuditTail
- `src/components/phyto/upload/` — FileDropZone, MetadataForm, WorkflowSelector
- `src/components/phyto/mechanism/` — MechanismHypothesisPanel with disclaimer
- `src/components/phyto/billing/` — Token packs, transactions, 402 demo
- `src/components/phyto/layout/` — AppShell, PageHeader
- `src/components/phyto/spectra/` — SpectrumViewer (recharts MS2 + HSQC)
- `src/components/phyto/{ResultsPage,SettingsPage}.tsx`
- `src/app/{layout,page,globals.css}` — Next.js entry
- Plus the full shadcn/ui component library the above depends on
