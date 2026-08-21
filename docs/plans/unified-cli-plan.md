# Unified CLI Plan

## Top-Level Overview

Replace the two separate CLI modes (`--owner/--repo` and `--compare`) with a single `--repos` flag
that accepts one or more `owner/repo` slugs. Every repo supplied gets the full set of metrics
computed and written to `public/data.json`. A `public/compare.json` ranking is also produced
whenever more than one slug is provided (or always, to keep the table populated).

As part of this work:
- `prCycleTime` (data.json) and `avgCycleTimeHours` (compare.json) are confirmed to be the
  same calculation, then unified under the single field name `avgCycleTimeHours` throughout.
- `commitFrequency` is renamed to `prFrequency` and its calculation is changed from
  "commits/day over the last 30 days" to "PRs/day derived from the 100-PR window"
  (i.e. `100 / daysBetweenOldestAndNewestPR`).
- `server.js` `/refresh` endpoint is updated to use the new `--repos` flag.
- `public/app.js` and `public/index.html` are updated to read the renamed/unified fields.

The 100-PR cap in `fetchPRs` is intentionally kept as-is. All pagination constraints
and skip-page resilience remain unchanged.

---

## Sub-Tasks

---

### Sub-Task 1 — Validate and document the prCycleTime / avgCycleTimeHours discrepancy

**Intent**
Before renaming anything, pin down exactly why the two values differ today, verify they
use the same underlying formula, and document the finding in this plan file. This is a
read-only investigation step.

**Expected Outcomes**
- Confirmed (or contradicted) that `prCycleTime()` in `src/metrics.js` is the sole calculation
  used by both code paths.
- The reason the stored values differ is recorded: different PR datasets (100-PR cap hit at
  different times / different runs), not a formula difference.
- No code is changed in this step.

**Todo List**
1. Read `src/metrics.js` `prCycleTime()` — note the exact formula.
2. Read `src/compare.js` `analyzeRepo()` — confirm it calls `prCycleTime(prs)` directly.
3. Read `cli.js` `runSingle()` — confirm it also calls `prCycleTime(prs)` directly.
4. Confirm both functions pass the raw PR array returned by `fetchPRs` — same function,
   same 100-PR cap, no additional filtering before the call.
5. Record finding: the values differ because `data.json` and `compare.json` were generated
   in separate CLI runs at different times, not because of a formula divergence.
6. Update this plan file with the confirmed finding under the relevant sub-task.

**Relevant Context**
- `src/metrics.js` — `prCycleTime()` at line 12
- `src/compare.js` — `analyzeRepo()` at line 17
- `cli.js` — `runSingle()` at line 47
- Current `data.json`: axios `prCycleTime: 78`, compare.json: axios `avgCycleTimeHours: 187.9`

**Status**: [x] done

---

### Sub-Task 2 — Implement prFrequency metric in src/metrics.js

**Intent**
Replace the commit-based `commitFrequency` function with a PR-based `prFrequency` function.
The new metric answers: "given the 100 PRs we fetched, how many PRs per day does this repo
merge on average?" This makes cycle time and frequency share the same data source (the PR array)
and eliminates the separate commit fetch dependency for this metric.

**Expected Outcomes**
- A new exported function `prFrequency(prs)` in `src/metrics.js`.
- The function uses only `merged_at` timestamps from the PR array.
- Returns `null` when fewer than 2 merged PRs exist (cannot compute a span).
- Returns a number (one decimal place) representing merged PRs per day.
- The old `commitFrequency` function is removed.

**Calculation**
```
span = merged_at of newest merged PR − merged_at of oldest merged PR  (in days)
prFrequency = mergedPRCount / span
```
Edge cases:
- Fewer than 2 merged PRs → return null
- span === 0 (all PRs merged on same day) → return null (avoid division by zero)

**Todo List**
1. In `src/metrics.js`, add `prFrequency(prs)` below `prCycleTime`.
2. Filter to merged PRs only (`merged_at != null`).
3. Sort by `merged_at` ascending; take first and last timestamps.
4. Compute span in days; guard against span === 0 or count < 2.
5. Return `Math.round((mergedCount / spanDays) * 10) / 10`.
6. Remove the old `commitFrequency` function entirely.
7. Update `module.exports` to export `prFrequency` instead of `commitFrequency`.

**Relevant Context**
- `src/metrics.js` — existing `commitFrequency()` at line 33 (to be replaced)
- `src/metrics.js` — `prCycleTime()` at line 12 (same PR array input, use as reference)

**Status**: [x] done

---

### Sub-Task 3 — Unify CLI into a single --repos flag in cli.js

**Intent**
Remove `--owner`, `--repo`, and `--compare` flags. Add a single `--repos` flag that accepts
one or more `owner/repo` slugs. For each slug, compute and merge all metrics into `data.json`.
After all slugs are processed, always write a sorted `compare.json`.

**Expected Outcomes**
- `cli.js` has one argument: `--repos slug [slug ...]`.
- A single slug run produces the same data.json output as today's `--owner/--repo` run.
- A multi-slug run produces data.json entries for all repos AND a compare.json ranking.
- Commits are no longer fetched (commit frequency metric removed; `fetchCommits` call dropped).
- The field `prCycleTime` in the data.json result object is renamed to `avgCycleTimeHours`.
- The field `commitFrequency` is renamed to `prFrequency`.
- `compare.json` continues to hold `{ repo, avgCycleTimeHours, totalMergedPRs }` per entry.
- Old `runSingle` and `runCompare` functions are removed; replaced by unified `runRepos(slugs)`.

**Field rename mapping**

| Old field (data.json) | New field (data.json) |
|-----------------------|-----------------------|
| `prCycleTime`         | `avgCycleTimeHours`   |
| `commitFrequency`     | `prFrequency`         |

**Todo List**
1. Update `parseArgs` to parse `--repos` instead of `--owner`, `--repo`, `--compare`.
2. Write `async function runRepos(slugs)`:
   a. For each slug (sequentially or in parallel — parallel is fine):
      - Split into `[owner, repo]`
      - Fetch repo metadata, PRs, branches (no commits fetch)
      - Compute `avgCycleTimeHours` (via `prCycleTime()` — same function, renamed field)
      - Compute `prFrequency` (new function)
      - Compute `staleBranches`, `contributorTrends`, `sparklinePoints`, `uniqueContributorCount`
        (contributors still use commits — keep `fetchCommits` for those two metrics only)
      - Build result object with unified field names
      - Merge into `data.json` map
   b. Build `compare.json` array from all slugs, sorted by `avgCycleTimeHours`.
   c. Write both files.
3. Remove `runSingle` and `runCompare` functions.
4. Update `main()` to call `runRepos(args.repos)`.
5. Update usage error message to reflect new flag.
6. Update `src/compare.js` to export `buildCompareRows(repoMap)` — takes the data.json map
   already computed and produces the sorted compare.json array without re-fetching.

**Relevant Context**
- `cli.js` — `runSingle()` at line 47, `runCompare()` at line 34, `parseArgs()` at line 17
- `src/compare.js` — `analyzeRepo()` currently re-fetches PRs; this is the duplication to eliminate
- `src/metrics.js` — `prCycleTime()`, new `prFrequency()` (from Sub-Task 2)
- `src/github.js` — `fetchCommits` still needed for contributor metrics only

**Status**: [x] done

---

### Sub-Task 4 — Update server.js /refresh endpoint

**Intent**
The `/refresh` endpoint currently spawns `cli.js --owner X --repo Y`. Update it to use the
new `--repos owner/repo` flag so the server stays in sync with the CLI interface.

**Expected Outcomes**
- `runCLI` in `server.js` spawns `cli.js --repos owner/repo` instead of `--owner X --repo Y`.
- Behavior is otherwise identical: one repo refreshed, data.json updated, compare.json updated.

**Todo List**
1. In `server.js` `runCLI(owner, repo)`, change the spawn args from
   `['--env-file=.env', 'cli.js', '--owner', owner, '--repo', repo]`
   to `['--env-file=.env', 'cli.js', '--repos', `${owner}/${repo}`]`.
2. No other changes to server.js.

**Relevant Context**
- `server.js` — `runCLI()` at line 71

**Status**: [x] done

---

### Sub-Task 5 — Update public/app.js and public/index.html for renamed fields

**Intent**
The frontend reads `data.prCycleTime` and `data.commitFrequency` from `data.json`. After the
backend rename these keys no longer exist. Update app.js to read `avgCycleTimeHours` and
`prFrequency`, and update index.html labels/descriptions to match.

**Expected Outcomes**
- `app.js` reads `data.avgCycleTimeHours` for the PR Cycle Time card (was `data.prCycleTime`).
- `app.js` reads `data.prFrequency` for the frequency card (was `data.commitFrequency`).
- `index.html` card title updated from "Commit Frequency" to "PR Frequency".
- `index.html` card description updated to reflect the new metric definition
  (merged PRs per day, based on 100-PR window).
- `index.html` data-context methodology blurb for the frequency metric updated to match.
- compare.json rows still use `avgCycleTimeHours` — no change needed in `loadCompareTable()`.

**Todo List**
1. In `app.js` `renderRepo()`:
   - Change `data.prCycleTime` → `data.avgCycleTimeHours` (lines 34–35).
   - Change `data.commitFrequency` → `data.prFrequency` (line 67–69); remove `.toFixed(1)`
     (already one decimal from the metric function) and append `/day` unit suffix.
2. In `index.html`:
   - Card title: "Commit Frequency" → "PR Frequency".
   - Card description: "Commits per day (last 30 days)" →
     "Merged PRs per day (100-PR window)".
   - Data-context methodology block for Commit Frequency: rewrite to describe the new
     PR-based calculation.

**Relevant Context**
- `public/app.js` — `renderRepo()` lines 32–76
- `public/index.html` — card at line 325–329; methodology block at lines 373–375

**Status**: [x] done

---

## Field Name Reference (Before → After)

| Location | Old field | New field |
|---|---|---|
| `data.json` per-repo object | `prCycleTime` | `avgCycleTimeHours` |
| `data.json` per-repo object | `commitFrequency` | `prFrequency` |
| `compare.json` per-entry | `avgCycleTimeHours` | `avgCycleTimeHours` (unchanged) |
| `app.js` card read | `data.prCycleTime` | `data.avgCycleTimeHours` |
| `app.js` card read | `data.commitFrequency` | `data.prFrequency` |
| `index.html` card title | Commit Frequency | PR Frequency |

## Confirmed Finding (Sub-Task 1 result)

Both `runSingle()` in `cli.js` and `analyzeRepo()` in `src/compare.js` call the same
`prCycleTime()` function from `src/metrics.js` with the same raw PR array from `fetchPRs`.
The formula is identical: sum of `(merged_at − created_at)` in hours divided by merged PR count,
rounded to one decimal place.

The stored values differ (e.g. axios: 78 hrs in data.json vs 187.9 hrs in compare.json) solely
because the two files were written by separate CLI runs at different points in time. The 100-PR
cap means each run sees a different slice of history. There is no formula divergence.

**Conclusion:** safe to unify under a single field name `avgCycleTimeHours` — no calculation
changes needed, only field renaming.
