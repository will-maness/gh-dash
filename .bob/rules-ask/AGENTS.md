# Ask Mode Rules

## Non-Obvious Documentation Context

- **`pr-cycle-time-plan.md`** is the authoritative spec for the current feature work — it contains algorithm details, edge cases, and sub-task status markers (`[ ] pending`). It is the primary reference for intended behaviour.
- **`public/index.html` has all CSS inline** (no external stylesheet) — the full UI is a single file.
- **`public/app.js` is browser-side JS** despite living alongside CLI code — it runs in the browser, not Node. It uses `fetch('data.json')` as a relative URL (works only when served from `public/`).
- **`public/data.json` is generated artefact, not source** — it is the output of running `cli.js` and will be overwritten on each run. It ships a sample snapshot (`facebook/react`, 159.3 hrs).
- **`LEARNING_LOG.md`** documents observations about how Bob (the AI assistant) scaffolded this project — it is a meta-log, not project documentation.
- **No test infrastructure exists** — `package.json` has no `test` script and no test-related dependencies.
