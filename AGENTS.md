# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack

Plain Node.js (CJS, `'use strict'`), no framework, no bundler, no TypeScript. Node ≥ 18 required (uses native `fetch`). No test framework is configured yet.

## Code style
Use CommonJS (require/module.exports), not ES modules.
Function names use camelCase. Files use kebab-case.
No external dependencies beyond node-fetch.

## Run

```bash
# Requires a .env file with GITHUB_TOKEN (optional but avoids rate limits)
node --env-file=.env cli.js --repos <owner/repo> [<owner/repo> ...]
```

The `npm start` script wraps the above — both are equivalent.

## Architecture rules
All GitHub API calls must go through src/github.js.
Metric calculation functions live in src/metrics.js only.
The dashboard is a single HTML file at public/index.html.
Do not create additional HTML files or a build step.

## Architecture

```
cli.js                       ← entry point; parses --repos slugs
  src/github.js              ← GitHub REST API v3 client (fetchRepo, fetchPRs, fetchCommits, fetchBranches)
  src/metrics.js             ← metric calculations (prCycleTime, prFrequency, contributorTrends, …)
  src/compare.js             ← buildCompareRows() — ranks data.json map into compare.json array
  → public/data.json         ← written by cli.js via fs.writeFileSync (keyed map, all metrics)
  → public/compare.json      ← written by cli.js via fs.writeFileSync (sorted ranking array)
public/app.js                ← browser JS; fetches data.json + compare.json, updates DOM
public/index.html            ← static dashboard; served separately (no dev server configured)
```

## Critical Conventions

- **`GITHUB_TOKEN` is read from `process.env`** — loaded via `--env-file=.env` (Node 18+ built-in), not `dotenv`. Never require `dotenv`.
- **`public/data.json` is the only IPC between CLI and browser** — cli.js writes it, app.js reads it via `fetch('data.json')` (relative URL, must be served from `public/`).
- **`fetchPRs` fetches only `state=closed`** — uses `batch.length < perPage` (default 100) as the pagination stop condition.
- **`prCycleTime()` uses `merged_at != null`** to exclude closed-but-not-merged PRs; returns `null` (not 0) when no merged PRs exist. The result is stored as `avgCycleTimeHours` in both data.json and compare.json.
- **`prFrequency()` uses the same PR array** — merged PRs per day over the 100-PR window span; returns `null` when fewer than 2 merged PRs exist or span is zero.
- **`compare.json` is built from the data.json map** via `buildCompareRows()` — no second GitHub fetch.
- **app.js silently swallows all errors** via a bare `catch {}` block — the dashboard degrades to static placeholders when `data.json` is absent.
- **Dashboard metric cards show `placeholder` CSS class** (grey text `#d0d7de`) until app.js removes it after populating real values.
- Rounding: all metrics use `Math.round(value * 10) / 10` — one decimal place.
- All `require` paths use `./src/` relative to project root; cli.js is always run from the project root.

## Error handling
All GitHub API calls must handle 404 (repo not found) and
403 (rate limited) responses explicitly. Never throw uncaught errors.