# Repo Audit & Change Guide

_Last updated: 2026-04-21 (UTC)_

## What is in this repository

This project currently contains **two parallel app implementations**:

1. **Legacy monolith (currently live)**
   - `index.html` includes inline CSS + inline JS and can run by itself.
   - This is the version loaded when you open the site directly.

2. **Modular rewrite (not wired to `index.html`)**
   - `js/` + `css/` directories are a split architecture version.
   - `src/` is a second modular track with similar files/components.

Because these three structures coexist, a change in one place may not appear in production if the active entrypoint is still `index.html`.

## Which code path currently “works”

- **Guaranteed runnable now**: `index.html` monolith.
- **Modular `js/`**: source code is present, but deployment wiring to use it is missing in the current root HTML.
- **`src/` track**: looks like a newer architecture path, also not wired as the default app entrypoint.

## Where to change files depending on your goal

### A) You want immediate visual/design changes in the live app
Edit:
- `index.html` (inline style + inline script)

This is the fastest way to apply a new design right now.

### B) You want maintainable long-term architecture
Adopt **one** modular track and retire the others:
- Keep either `js/ + css/` **or** `src/`.
- Then make `index.html` load that chosen app entrypoint.
- Remove duplicate/unmaintained paths after migration.

### C) You want to fix auth, db, OCR, sync, Teams integrations
If using the modular architecture, update service files:
- `js/services/auth.js`
- `js/services/db.js`
- `js/services/ocr.js`
- `js/services/sync.js`
- `js/services/teams.js`

## Link / wiring double-check checklist

When switching to modular entrypoints, verify all of these:

1. `index.html` includes module script for selected app entry (`js/app.js` or `src/app.js`).
2. CSS links point to actual stylesheet files.
3. `manifest.json` icon paths exist (`icons/` and/or `assets/`).
4. `sw.js` cache list points to files that still exist.
5. Relative import paths in modules resolve from their file location.

## High-impact cleanup recommendation

1. Decide a **single source of truth** (`src/` recommended for clearer component boundaries).
2. Point `index.html` to that app.
3. Run a pass to remove duplicate dead files and stale docs references.
4. Add a lightweight CI check that validates JS syntax and basic path existence.
