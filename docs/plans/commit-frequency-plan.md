# Commit Frequency Plan

## Overview

The Commit Frequency card in `public/index.html` (`#commit-frequency`) currently displays a static placeholder (`—`). The card's description reads "Commits per day (last 30 days)". The metric function `commitFrequency()` in `src/metrics.js` is a stub that returns `null`, and neither `cli.js` nor `public/app.js` are wired to produce or consume the value.

The goal is to implement the full pipeline: calculate commits-per-day from the last 30 days of commit data, emit the result to `public/data.json`, and display it on the dashboard.

**Scope:** Three files change — `src/metrics.js`, `cli.js`, `public/app.js`. The HTML card and the `fetchCommits` function in `src/github.js` are already correct and do not need to change.

---

## Sub-Tasks

---

### Sub-Task 1 — Implement `commitFrequency()` in `src/metrics.js`

**Intent**
Replace the stub body with a real calculation. The function receives the full array of commit objects already fetched by `fetchCommits`. It must count only commits from the last 30 days and divide by 30 to get a commits-per-day rate.

**Expected Outcomes**
- `commitFrequency([])` returns `null` (no data guard).
- `commitFrequency(commits)` returns a number rounded to one decimal place (same rounding convention as `prCycleTime`).
- A commit's date is read from `commit.commit.committer.date`, consistent with how `contributorTrends` and `staleBranches` access dates.
- Commits older than 30 days are excluded from both the count and the denominator (denominator is always 30 days).

**Todo List**
1. In `src/metrics.js`, open the `commitFrequency(commits)` function body.
2. Add a null/empty guard — return `null` when `commits` is falsy or empty.
3. Compute a `cutoff` date as `now - 30 days` (same pattern used in `staleBranches`).
4. Filter commits to those whose `commit.committer.date` is >= the cutoff, skipping any commit with a missing date.
5. Divide the filtered count by 30 and round to one decimal place.
6. Return the result.

**Relevant Context**
- Stub is at [`commitFrequency()`](src/metrics.js:33)
- Date access pattern: `commit.commit.committer.date` — see [`contributorTrends()`](src/metrics.js:68-74)
- Stale cutoff pattern: see [`staleBranches()`](src/metrics.js:143-144)
- Rounding convention: `Math.round(value * 10) / 10` — see [`prCycleTime()`](src/metrics.js:24)

**Status:** [x] done

---

### Sub-Task 2 — Wire `commitFrequency` into `cli.js`

**Intent**
Call `commitFrequency(commits)` in `runSingle()` and add the result to the object written to `public/data.json`. The `commits` array is already fetched at line 57 — this is additive only.

**Expected Outcomes**
- `commitFrequency` is imported from `src/metrics.js` in the `require` at the top of `cli.js`.
- `runSingle()` calls `commitFrequency(commits)` and captures the result.
- The result is added as a `commitFrequency` key in the `result` object written to `public/data.json`.
- Running `node cli.js --owner <owner> --repo <repo>` produces a `data.json` containing a numeric `commitFrequency` value (or `null` for repos with no commits in the last 30 days).
- No other behaviour in `cli.js` changes.

**Todo List**
1. In `cli.js` line 14, add `commitFrequency` to the destructured import from `./src/metrics`.
2. After line 60 (after `uniqueContributorCount` is called), call `commitFrequency(commits)` and store in a `const freqPerDay`.
3. Add `commitFrequency: freqPerDay` to the `result` object (lines 66-73).
4. Optionally log the value to the console in the same style as the existing log lines (line 79).

**Relevant Context**
- Import line: [`cli.js:14`](cli.js:14)
- Commits already fetched: [`cli.js:57`](cli.js:57)
- Result object: [`cli.js:66-73`](cli.js:66)

**Status:** [x] done

---

### Sub-Task 3 — Display `commitFrequency` in `public/app.js`

**Intent**
Read `data.commitFrequency` from the parsed JSON and populate the `#commit-frequency` DOM element, removing its `placeholder` class. The value should be formatted as `X.X/day` for readability (or `N/A` if null).

**Expected Outcomes**
- When `data.json` contains a numeric `commitFrequency`, the card shows a formatted value like `3.2/day` and the grey placeholder colour is removed.
- When `commitFrequency` is `null` or absent, the card shows `N/A` and the placeholder class is still removed (consistent with how `prCycleTime` handles null).
- The new block follows the same guard pattern as the existing metric blocks.

**Todo List**
1. In `public/app.js`, after the `contributorsEl` block (around line 31), add a new block for `#commit-frequency`.
2. Find the element by ID `commit-frequency`.
3. Set `textContent` to `${data.commitFrequency}/day` when the value is a non-null number, otherwise `N/A`.
4. Call `classList.remove('placeholder')` regardless of which display value is used.

**Relevant Context**
- Element in HTML: [`public/index.html:216`](public/index.html:216) — `id="commit-frequency"`, `class="card-value placeholder"`
- Pattern to follow: cycleTime block at [`public/app.js:15-19`](public/app.js:15)
- Null-check pattern: `data.prCycleTime !== null ? ... : 'N/A'`

**Status:** [x] done
