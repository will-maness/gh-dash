# Multi-Repo Dashboard Plan

## Overview

Add a repo selector dropdown to the dashboard's four-card metrics section so the user can switch between five fixed repos (axios/axios, expressjs/express, lodash/lodash, facebook/react, vuejs/vue) without re-running the CLI manually. A "Refresh" button next to the cards triggers a live data update for the currently selected repo. A minimal Express HTTP server replaces the plain static file server, enabling the browser to POST a refresh request that blocks until the CLI run completes and then triggers an automatic re-render.

**Scope:**
- Five hardcoded repos; no dynamic repo discovery
- `public/data.json` is restructured into a keyed map (one entry per repo)
- `cli.js` is updated to merge a single repo's result into the map rather than overwriting it
- A new `server.js` serves `public/` and exposes a `/refresh` endpoint
- `index.html` gains a `<select>` dropdown and a Refresh button
- `app.js` switches its rendering source based on the selected repo and re-fetches after refresh

**Non-goals:**
- No authentication UI — `GITHUB_TOKEN` still comes from `.env` / environment
- No comparison section changes
- No polling or SSE — the POST blocks until the CLI run completes

---

## Sub-Task 1 — Restructure `public/data.json`

**Intent:** Change the data format from a single flat object to a keyed map so all five repos can coexist in one file without overwriting each other.

**Expected Outcomes:**
- `public/data.json` contains a top-level JSON object whose keys are `owner/repo` strings (e.g. `"axios/axios"`)
- Each key's value is exactly the existing per-repo shape: `{ owner, repo, prCycleTime, commitFrequency, contributorSparkline, staleBranches, contributorCount }`
- The file already contains the current axios/axios data under its key; remaining four keys are absent until fetched
- No other files are changed in this sub-task

**Todo List:**
1. Open `public/data.json`
2. Wrap the current flat object in a top-level object keyed by `"axios/axios"`
3. Save the file

**Relevant Context:**
- Current file: `public/data.json` — flat object with 7 keys
- `app.js` currently does `fetch('data.json').then(r => r.json())` and reads the object directly — this will break until Sub-Task 4 updates app.js

**Status:** [x] done

---

## Sub-Task 2 — Update `cli.js` to Merge Into the Map

**Intent:** Make the CLI write only its single repo's result into the keyed map, leaving all other repos' data untouched.

**Expected Outcomes:**
- `cli.js` reads the existing `public/data.json` (or starts with `{}` if absent/malformed)
- It writes `data[`${owner}/${repo}`] = result` and then serialises the whole map back to disk
- Running the CLI twice for different repos produces a file with two keys — the first run's data is not lost
- All existing CLI flags (`--owner`, `--repo`, `--compare`) continue to work

**Todo List:**
1. In `cli.js`, locate the line that writes `public/data.json` (currently `fs.writeFileSync('./public/data.json', JSON.stringify(result, null, 2))`)
2. Before that write, read the existing `public/data.json`; parse it as a map object (default to `{}` on any error)
3. Set `map[`${owner}/${repo}`] = result`
4. Write the updated map back to `public/data.json`

**Relevant Context:**
- `cli.js` line ~76: `fs.writeFileSync('./public/data.json', JSON.stringify(result, null, 2))`
- `fs` is already imported in `cli.js`

**Status:** [x] done

---

## Sub-Task 3 — Create `server.js`

**Intent:** Provide an HTTP server that serves the static `public/` directory and exposes a `POST /refresh?repo=owner/repo` endpoint that spawns the CLI, blocks until it completes, and returns success/failure.

**Expected Outcomes:**
- `node server.js` starts a server (default port 3000) that serves `public/index.html` and its assets at `/`
- `POST /refresh?repo=axios/axios` spawns `node cli.js --owner axios --repo axios` as a child process
- If the repo is not in the allowed list of five, the server returns HTTP 400
- The endpoint blocks (awaits child process exit) and returns `{ ok: true }` on success or `{ ok: false, error: "..." }` on failure (non-zero exit)
- The five allowed repos are declared as a constant array in `server.js`
- `package.json` `start` script is updated to `node --env-file=.env server.js` (or a new `serve` script is added)

**Todo List:**
1. Create `server.js` in the project root
2. Import `http` (or `express` — add `express` and `serve-static` to `package.json` dependencies), `child_process.spawn`, `path`, `fs`
3. Declare `const REPOS = ['axios/axios', 'expressjs/express', 'lodash/lodash', 'facebook/react', 'vuejs/vue']`
4. Serve `public/` as static files for all non-`/refresh` routes
5. Implement `POST /refresh`: validate `repo` query param against `REPOS`, split into owner/repo, `spawn('node', ['cli.js', '--owner', owner, '--repo', repo])`, pipe stderr to console, await process close event, respond with JSON
6. Listen on `process.env.PORT || 3000`
7. Update `package.json` — add `express` dependency (or use Node's built-in `http` + `fs` to avoid new dependencies), update `start` script

**Relevant Context:**
- Architecture rule: no external dependencies beyond node-fetch — **use Node's built-in `http` module + `fs.createReadStream` for static serving** to avoid adding express. This keeps the zero-new-dependencies rule.
- `child_process` is a Node built-in
- The existing `npm start` script runs `node --env-file=.env cli.js --owner ... --repo ...`; it will be replaced or supplemented

**Status:** [x] done

---

## Sub-Task 4 — Update `public/app.js` for Multi-Repo Rendering

**Intent:** Make the browser JS read the repo map structure, render the selected repo's cards, handle dropdown changes, and drive the Refresh button flow.

**Expected Outcomes:**
- On page load, the first repo in the list (`axios/axios`) is selected and its data rendered if present in the map; if absent, the cards stay in placeholder state
- When the user changes the dropdown, the four cards re-render immediately with the new repo's data (or placeholders if not yet fetched)
- When the user clicks Refresh, a `POST /refresh?repo=owner/repo` is sent; a loading indicator is shown on the button; on response the button re-enables, `data.json` is re-fetched, and the cards re-render
- The `repo-label` element updates to reflect the currently selected repo
- No changes are made to the compare table section logic

**Todo List:**
1. Add a `loadData()` function that fetches `data.json` and stores the full map in a module-level variable
2. Add a `renderRepo(repoKey)` function that reads `map[repoKey]` and populates the four card DOM elements (port the existing rendering logic here); handles the `null`/absent case by restoring `placeholder` class
3. On `DOMContentLoaded`, call `loadData()` then `renderRepo(dropdown.value)`
4. Wire the dropdown `change` event to call `renderRepo(dropdown.value)` (data already in memory — no re-fetch needed)
5. Wire the Refresh button `click` event to: disable button + show "Refreshing…" text, POST `/refresh?repo=${dropdown.value}`, on resolve call `loadData()` then `renderRepo(dropdown.value)`, re-enable button

**Relevant Context:**
- `public/app.js` — current rendering logic targets `repo-label`, `pr-cycle-time`, `stale-branches`, `contributors`, `commit-frequency`, `contributor-sparkline`
- The dropdown element ID will be `repo-select` (defined in Sub-Task 5)
- The Refresh button element ID will be `refresh-btn` (defined in Sub-Task 5)

**Status:** [x] done

---

## Sub-Task 5 — Update `public/index.html`

**Intent:** Add the repo selector dropdown and Refresh button to the UI, positioned above/beside the four metric cards.

**Expected Outcomes:**
- A `<select id="repo-select">` with five `<option>` elements (value = `owner/repo`, label = `owner/repo`) appears above the metric cards
- A `<button id="refresh-btn">Refresh</button>` sits inline with or immediately after the dropdown
- The existing four cards and their IDs are unchanged
- The UI renders correctly without a JavaScript error in the existing `placeholder` state on first load

**Todo List:**
1. Above the `.grid` of four cards (and after the `repo-label` line), add a control row `<div class="repo-controls">` containing:
   - `<label for="repo-select">Repository</label>`
   - `<select id="repo-select">` with five `<option>` elements
   - `<button id="refresh-btn">Refresh</button>`
2. Add minimal inline or `<style>` CSS for `.repo-controls` (flex row, gap, aligned items)
3. Verify the `repo-label` `<span>` is still present and will be updated by `app.js`

**Relevant Context:**
- `public/index.html` — the `.grid` div containing the four cards
- No new HTML files; no build step
- The five repo strings: `axios/axios`, `expressjs/express`, `lodash/lodash`, `facebook/react`, `vuejs/vue`

**Status:** [x] done

---

## Execution Order

Sub-tasks must be completed in this order because each builds on the previous:

1. **Sub-Task 1** — data format change (no code dependencies)
2. **Sub-Task 2** — CLI merge write (depends on new data.json shape)
3. **Sub-Task 3** — server.js (depends on CLI working correctly)
4. **Sub-Task 5** — HTML controls (can be done in parallel with Sub-Task 4, but HTML IDs must be established before app.js wires them)
5. **Sub-Task 4** — app.js wiring (depends on HTML IDs from Sub-Task 5 and server endpoint from Sub-Task 3)
