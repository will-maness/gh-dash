# Contributor Count — Implementation Plan

## Overview

The **Contributors** card in the dashboard (`#contributors`) has always shown `—` because:
1. No scalar contributor count is ever computed from the commit data
2. `cli.js` never writes a `contributorCount` field to `public/data.json`
3. `public/app.js` has no code to read or render that field

The fix touches four files in a strict pipeline order:
`src/metrics.js` → `cli.js` → `public/data.json` (auto-generated) → `public/app.js`

The definition of "contributor count" will be: **total unique authors across all fetched commits**
(not constrained to a 90-day window, since `fetchCommits` returns whatever the MCP default page returns — typically 30 commits).

---

## Sub-Tasks

---

### Sub-Task 1 — Add `uniqueContributorCount()` to `src/metrics.js`

**Intent**
Introduce a pure, single-purpose function that derives a scalar unique-contributor count from the same commit array already passed to `contributorTrends()`. Adding a dedicated function keeps metric calculation isolated to `src/metrics.js` per the architecture rules, and makes the logic independently testable.

**Expected Outcomes**
- A new exported function `uniqueContributorCount(commits)` exists in `src/metrics.js`
- It returns a `number` (>= 0): the count of distinct `author.login` values (falling back to `commit.committer.name` when login is absent), matching the deduplication logic already used in `contributorTrends()`
- It returns `0` when `commits` is empty or falsy
- The existing exports in `module.exports` are updated to include the new function

**Todo List**
- [ ] Add `uniqueContributorCount(commits)` function after `sparklinePoints()` in `src/metrics.js`
- [ ] Use a `Set` to collect unique contributor identifiers, matching the `author.login || commit.committer.name` fallback pattern from `contributorTrends()` (lines 77–78)
- [ ] Return `contributorSet.size`
- [ ] Add the function to the `module.exports` at the bottom of the file

**Relevant Context**
- `src/metrics.js` line 77: `const contributor = commit.author?.login || commit.commit.committer.name;`
- `src/metrics.js` line 145: `module.exports = { prCycleTime, commitFrequency, contributorTrends, sparklinePoints, staleBranches };`
- Pattern to follow: `staleBranches()` (lines 124–143) — simple loop, returns a scalar

**Status** — `[ ] pending`

---

### Sub-Task 2 — Wire `uniqueContributorCount` into `cli.js`

**Intent**
Call the new metric function in `runSingle()` and add its result to the object written to `public/data.json`. This is the only coupling point between the Node runtime and the browser dashboard.

**Expected Outcomes**
- `cli.js` imports `uniqueContributorCount` from `src/metrics.js`
- `runSingle()` calls `uniqueContributorCount(commits)` using the `commits` array already fetched
- The result object written to `public/data.json` includes a `contributorCount` field (integer)
- The CLI console output logs the contributor count alongside PR cycle time and stale branches

**Todo List**
- [ ] Add `uniqueContributorCount` to the destructured require on line 14 of `cli.js`
- [ ] In `runSingle()`, after `const trends = contributorTrends(commits);`, add `const contributorCount = uniqueContributorCount(commits);`
- [ ] Add `contributorCount` to the result object (lines 65–71) alongside the other fields
- [ ] Add `console.log(`Contributors: ${contributorCount}`)` after the stale branches log line

**Relevant Context**
- `cli.js` line 14: `const { prCycleTime, contributorTrends, sparklinePoints, staleBranches } = require('./src/metrics');`
- `cli.js` lines 65–71: the `result` object built before `writeFileSync`
- `cli.js` line 58: `const trends = contributorTrends(commits);` — `commits` is already in scope here
- `data.json` shape after this sub-task: `{ owner, repo, prCycleTime, contributorSparkline, staleBranches, contributorCount }`

**Status** — `[ ] pending`

---

### Sub-Task 3 — Render `contributorCount` in `public/app.js`

**Intent**
Read the new `contributorCount` field from `data.json` and populate the `#contributors` DOM element, following the identical pattern used for `staleBranches` and `prCycleTime`.

**Expected Outcomes**
- `app.js` reads `data.contributorCount` after the existing `staleBranches` block
- The `#contributors` element is updated with the count value
- The `placeholder` CSS class is removed from the element so the value renders in dark text (not grey)
- When `contributorCount` is `0` or absent, the element is left at its `—` placeholder (no change)

**Todo List**
- [ ] After the `staleBranches` block (lines 21–25 of `app.js`), add a new block for `contributorCount`
- [ ] Guard with `data.contributorCount !== undefined && data.contributorCount !== null`
- [ ] Set `element.textContent = data.contributorCount`
- [ ] Call `element.classList.remove('placeholder')`

**Relevant Context**
- `public/app.js` lines 21–25: the `staleBranches` block — copy this pattern exactly
- `public/index.html` line 228: `<p class="card-value placeholder" id="contributors">—</p>`
- `public/index.html` line 229: card description currently reads "Unique authors in last 90 days" — this is inaccurate; the actual scope is whatever `fetchCommits` returns (default MCP page, ~30 commits, no date filter). Update the description to "Unique authors in recent commits" as part of this sub-task.

**Status** — `[ ] pending`

---

### Sub-Task 4 — Regenerate `public/data.json`

**Intent**
Re-run the CLI to produce a fresh `data.json` that includes the new `contributorCount` field, verifying the full pipeline end-to-end.

**Expected Outcomes**
- `public/data.json` contains a `contributorCount` key with an integer value > 0
- All previously working fields (`prCycleTime`, `staleBranches`, `contributorSparkline`) are still present and unchanged

**Todo List**
- [ ] Run `node --env-file=.env cli.js --owner axios --repo axios`
- [ ] Confirm `public/data.json` contains `contributorCount` with a non-zero integer
- [ ] Confirm all other fields are still present

**Relevant Context**
- `public/data.json` current shape (post last run): `{ owner, repo, prCycleTime, contributorSparkline, staleBranches }`
- CLI uses `--env-file=.env` for `GITHUB_TOKEN`; the `.env` file already exists

**Status** — `[ ] pending`
