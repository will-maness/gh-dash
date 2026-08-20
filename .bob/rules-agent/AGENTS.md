# Agent Coding Rules

## Non-Obvious Patterns

- **No package manager installs needed** — zero runtime dependencies. Do not add `node_modules` or `require` third-party packages.
- **`--env-file=.env`** is the env loader (Node 18+ built-in). Never introduce `dotenv` or `require('dotenv')`.
- **CJS only** — all files use `require`/`module.exports`. No `import`/`export` syntax.
- **`'use strict'` at top of every JS file** — existing pattern in all files; match it.
- **JSDoc on every exported function** — `@param` and `@returns` with types; see `src/github.js` for the expected style.
- **Error handling is throw-only in modules** — `src/github.js` throws `new Error(...)` on non-OK responses; `cli.js` owns the single top-level `catch` that prints and exits. Don't add try/catch inside modules.
- **`public/data.json` is overwritten, not appended** — `fs.writeFileSync` with `JSON.stringify(result, null, 2)`. No append or merge logic.
- **Pagination stop condition** is `batch.length < perPage` (not `=== 0`) — this correctly handles the last page regardless of the configured `perPage` value.
- **`commitFrequency` in `src/metrics.js` is intentionally a stub** (`return null`) — do not implement it unless explicitly asked.
- **No test runner is configured** — if adding tests, choose a framework and wire up a `test` script in `package.json` first.
