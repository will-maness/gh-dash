# PR Cycle Time — Implementation Plan

## Overview

Implement PR cycle time analysis end-to-end: fetch closed PRs from the GitHub
REST API v3, calculate average hours from `created_at` to `merged_at` across
all merged PRs, write the result to `public/data.json`, and wire up
`public/app.js` to read that file and update the `#pr-cycle-time` card in the
browser dashboard.

**Scope:** Four files change — `src/github.js`, `src/metrics.js`, `cli.js`,
and `public/index.html`. One new file is created — `public/app.js`.

**Data flow:**
```
cli.js --owner --repo
  → fetchPRs()       [src/github.js]    — GET /repos/{owner}/{repo}/pulls?state=closed
  → prCycleTime()    [src/metrics.js]   — compute average hours (merged only)
  → public/data.json                    — written by cli.js via fs.writeFileSync
  → public/app.js                       — fetch("data.json"), update #pr-cycle-time
```

---

## Sub-Task 1 — Add `fetchPRs` to `src/github.js`

**Intent:** Fetch all closed pull requests for a repo using the same request
pattern already established by `fetchRepo`. The function must page through
results until the API returns fewer than 100 items per page (GitHub's max),
collecting every PR across all pages.

**Expected Outcomes:**
- `fetchPRs(owner, repo)` is exported from `src/github.js`
- It returns a flat array of raw GitHub PR objects (all pages combined)
- It reuses the same headers and optional `GITHUB_TOKEN` pattern as `fetchRepo`
- It throws a descriptive error on any non-OK HTTP response

**Function Signature:**
```
async function fetchPRs(owner, repo, perPage = 100) → Promise<object[]>
```

**Algorithm:**
1. Set `page = 1`, `allPRs = []`
2. Loop:
   a. GET `/repos/{owner}/{repo}/pulls?state=closed&per_page={perPage}&page={page}`
   b. Throw if response is not OK
   c. Parse JSON into `batch`
   d. Push `batch` items onto `allPRs`
   e. If `batch.length < perPage`, break — last page reached (works correctly whether `perPage` is the default 100 or a smaller caller-supplied value)
   f. Increment `page`, continue
3. Return `allPRs`

**Edge Cases:**
- Repo with zero closed PRs → API returns `[]` on page 1 → return `[]` (no error)
- Rate limit hit (403 or 429) → throw with status message (same pattern as `fetchRepo`)
- Private repo without token → 404 from GitHub → throw with status message

**Relevant Context:**
- Pattern to follow: `fetchRepo` in `src/github.js` lines 14–32
- Base URL constant already defined at line 5
- Headers construction (with optional auth) at lines 16–23

**Status:** [ ] pending

---

## Sub-Task 2 — Implement `prCycleTime` in `src/metrics.js`

**Intent:** Replace the `return null` stub with the actual calculation. The
function receives the raw array from `fetchPRs` and must return the average
duration in hours between `created_at` and `merged_at`, considering only PRs
that were actually merged (not just closed without merging).

**Expected Outcomes:**
- `prCycleTime(prs)` returns a `number` (hours, rounded to one decimal place)
  when at least one merged PR exists in the input
- Returns `null` when the input array is empty or contains no merged PRs
- Does not mutate the input array

**Algorithm:**
1. Filter `prs` to only those where `merged_at` is not null/undefined
   — closed PRs that were not merged have `merged_at: null`
2. If the filtered list is empty, return `null`
3. For each merged PR, compute:
   `durationHours = (new Date(pr.merged_at) - new Date(pr.created_at)) / 3_600_000`
4. Sum all `durationHours` values
5. Divide by the count of merged PRs
6. Return `Math.round(result * 10) / 10` (one decimal place)

**Edge Cases:**
- `prs` is an empty array → return `null`
- No PRs have `merged_at` set (all were closed without merging) → return `null`
- Single merged PR → average of one value, still returns a number
- Extremely large numbers (old repos) → JavaScript `Date` handles millisecond
  arithmetic safely for any realistic repo age

**Relevant Context:**
- Stub signature already defined in `src/metrics.js` lines 12–14
- JSDoc comment on stub already documents the expected return type

**Status:** [ ] pending

---

## Sub-Task 3 — Wire `cli.js` to fetch PRs, compute metric, write `data.json`

**Intent:** Activate the metrics pipeline in the CLI. `cli.js` currently has
the `fetchRepo` call commented out as a placeholder. Replace that placeholder
with the real pipeline: fetch PRs, calculate cycle time, write output to
`public/data.json` so the browser can read it.

**Expected Outcomes:**
- Running `node cli.js --owner <owner> --repo <repo>` fetches PRs, calculates
  cycle time, and writes `public/data.json`
- Console output confirms the repo being analyzed and the result
- `public/data.json` has the shape:
  ```json
  {
    "owner": "...",
    "repo": "...",
    "prCycleTime": 42.3
  }
  ```
  where `prCycleTime` is either a number or `null`
- On API error, the existing `main().catch` handler prints the message and
  exits with code 1 (no new error handling needed)

**Changes to `cli.js`:**
1. Add `require('./src/github')` destructuring to also import `fetchPRs`
2. Add `require('./src/metrics')` to import `prCycleTime`
3. Add `require('fs')` for `fs.writeFileSync`
4. In `main()`, replace the commented-out placeholder with:
   a. Call `fetchPRs(owner, repo)`
   b. Call `prCycleTime(prs)`
   c. Build the result object
   d. Write JSON to `public/data.json` via `fs.writeFileSync`
   e. Log a confirmation message

**Relevant Context:**
- Current placeholder comment: `cli.js` line 36
- `parseArgs` and `main` structure: `cli.js` lines 13–37
- Output path: `'./public/data.json'` (simple relative path, CLI always run from project root)
- `public/data.json` does not exist yet — `fs.writeFileSync` will create it

**Status:** [ ] pending

---

## Sub-Task 4 — Create `public/app.js` and wire it into `index.html`

**Intent:** Add the client-side JavaScript that reads `public/data.json` and
updates the `#pr-cycle-time` DOM element. This is the final link in the data
flow — it makes the computed metric visible in the browser.

**Expected Outcomes:**
- `public/app.js` fetches `data.json` relative to the HTML file
- On success, it updates `#repo-label` with `{owner}/{repo}` and updates
  `#pr-cycle-time` with the value (e.g. `42.3 hrs`) and removes the
  `placeholder` CSS class so the value renders in dark text
- If `prCycleTime` is `null`, the card shows `"N/A"` (still removes
  `placeholder` class so it does not look broken)
- If `data.json` is missing or the fetch fails, the card retains its `"—"`
  placeholder silently (no console errors shown to the user)
- `public/index.html` gets a single `<script src="app.js"></script>` tag
  added before `</body>`

**Algorithm for `app.js`:**
1. `fetch('data.json')` — relative path works when served from `public/`
2. Parse response as JSON
3. Set `#repo-label` text to `{data.owner}/{data.repo}`
4. Determine display value:
   - `data.prCycleTime !== null` → `"${data.prCycleTime} hrs"`
   - otherwise → `"N/A"`
5. Set `#pr-cycle-time` text content to the display value
6. Remove the `placeholder` class from `#pr-cycle-time`
7. Wrap entire block in try/catch — silently swallow errors so the static
   HTML degrades gracefully when `data.json` has not been generated yet

**Relevant Context:**
- DOM target: `public/index.html` line 118 — `id="pr-cycle-time"` with class `placeholder`
- DOM target: `public/index.html` line 112 — `id="repo-label"`
- CSS for `.placeholder` color override: `index.html` lines 79–81
- The `<script>` tag belongs at the bottom of `<body>`, before `</body>` on
  line 145

**Status:** [ ] pending

---

## Edge Case Summary

| Scenario | Handled Where | Behavior |
|---|---|---|
| Repo has no closed PRs | `prCycleTime` in metrics.js | Returns `null` |
| All closed PRs were closed without merging | `prCycleTime` in metrics.js | Returns `null` |
| API rate limit (403/429) | `fetchPRs` in github.js | Throws, cli.js catch exits with code 1 |
| Private repo, no token | `fetchPRs` in github.js | Throws 404 error, exits with code 1 |
| `data.json` not yet generated | `app.js` try/catch | Dashboard silently shows placeholder |
| `null` cycle time in data.json | `app.js` display logic | Shows "N/A", not a broken number |
| Single merged PR | `prCycleTime` average of 1 | Returns that PR's duration |
| Very large repos (1000s of PRs) | Pagination loop in `fetchPRs` | All pages fetched before calculating |
