# Plan Mode Rules

## Non-Obvious Architectural Constraints

- **Two separate JS runtimes** — `src/` runs in Node (CJS, `process.env`, `fs`); `public/` runs in the browser (DOM APIs, relative `fetch`). They share zero code and must stay separate.
- **`public/data.json` is the only coupling point** between the two runtimes — adding more output files or a server-side API would require a deliberate architectural change.
- **No HTTP server is wired up** — `public/index.html` and `public/app.js` are not served by the CLI. Opening the dashboard requires a separate static file server (e.g. `npx serve public`) or direct file access.
- **All new metrics follow the same three-file pattern**: add a fetch function to `src/github.js`, add a calculation function to `src/metrics.js`, wire both into `cli.js`, add the result key to the `public/data.json` shape, and update `public/app.js` + `public/index.html` to display it.
- **`commitFrequency` and three other dashboard cards (`stale-branches`, `contributors`) exist in the HTML but have no backing data** — they are placeholders waiting for implementation.
- **GitHub API rate limit**: unauthenticated = 60 req/hr; authenticated = 5,000 req/hr. Large repos paginate heavily — always recommend `GITHUB_TOKEN` in plans that add new API calls.
