# gh-dash

An IBM Bob Tutorial project. Please see docs/lessons for a six lesson hands on program that coaches you through key points of IBM Bob and builds toward a GitHub repository health dashboard that you will build using IBM Bob. This program builds real software with [IBM Bob](https://bob.ibm.com/), IBM's AI coding assistant, including the enterprise SDLC activities along the way.

---

## What this is

**gh-dash** is a small, zero-dependency Node.js tool that fetches live data from the GitHub API and produces a browser dashboard showing repository health metrics across multiple repos at once.

It was built incrementally, session by session, entirely through conversations with Bob. The code is the artifact. The process of building it is the tutorial.

---

## What it does

Point it at one or more GitHub repositories and it computes:

| Metric | Description |
|---|---|
| **Avg PR Cycle Time** | Hours from PR open to merge, averaged across the last 100 closed PRs |
| **PR Frequency** | Merged PRs per day over the 100-PR observation window |
| **Stale Branches** | Branches with no commit activity in the last 90 days |
| **Contributors** | Unique authors in the last 100 commits |
| **Contributor Sparkline** | 12-week trend of unique weekly contributors |

Results are written to `public/data.json` and `public/compare.json`. Serve the `public/` directory and open the dashboard in a browser to see everything in one place — including a ranked comparison table when you analyze multiple repos.

---

## Quickstart

**Prerequisites:** Node.js ≥ 18 and a GitHub personal access token.

```bash
git clone https://github.com/your-org/gh-dash.git
cd gh-dash
```

Create a `.env` file in the project root:

```
GITHUB_TOKEN=ghp_your_token_here
```

Analyze one or more repos:

```bash
node --env-file=.env cli.js --repos facebook/react vuejs/vue lodash/lodash
```

Start the dashboard server:

```bash
node --env-file=.env server.js
```

Open `http://localhost:3000` in your browser. Use the repo dropdown and the **Refresh** button to update data for any repo without touching the terminal.

---

## Architecture

```
cli.js                       ← entry point; parses --repos slugs
  src/github.js              ← GitHub REST API v3 client
  src/metrics.js             ← metric calculations
  src/compare.js             ← builds ranked compare.json from data.json
  → public/data.json         ← keyed map of all repo metrics
  → public/compare.json      ← sorted ranking array

server.js                    ← HTTP server; serves public/ + /refresh endpoint
public/index.html            ← static dashboard HTML
public/app.js                ← browser JS; reads data.json + compare.json, updates DOM
```

The data pipeline is intentionally simple: the CLI writes two JSON files; the browser reads them. There is no build step, no bundler, no TypeScript, and no runtime dependencies. Everything runs on Node.js built-ins plus `fetch` (native since Node 18).

---

## Server endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Dashboard (`public/index.html`) |
| `GET` | `/<file>` | Static file from `public/` |
| `POST` | `/refresh?repo=owner/repo` | Trigger a CLI run for one repo |
| `POST` | `/refresh-all` | Trigger a CLI run for all configured repos |
| `GET` | `/progress` | Poll for live CLI progress (`running`, `completed`, `total`) |

The refresh endpoint responds immediately with HTTP 202 and runs the CLI in the background. The browser polls `/progress` to show a live progress indicator.

---

## The Bob tutorial angle

This project was built across six sessions as a learning exercise in agentic development with Bob. Each session tackled a focused capability:

1. **Session 1 — Scaffold**: Bob created the project from nothing — file structure, `package.json`, skeleton modules, and the first metric stub — from a single prompt.
2. **Session 2 — Literate coding**: Wrote detailed implementation plans (the `*-plan.md` files in this repo) first, then had Bob execute them step by step. This is the foundation of reliable agentic development.
3. **Sessions 3–5 — Multi-repo & server**: Added the keyed `data.json` format, `server.js`, the repo selector dropdown, and the Refresh/progress flow. MCP server configuration and the GitHub review workflow were explored here.
4. **Session 6 — Unified CLI & metrics**: Replaced two separate CLI modes with a single `--repos` flag, renamed fields for consistency, and added PR frequency as a metric derived from the same PR dataset already in memory.

The `docs/LEARNING_LOG.md` file captures honest, unfiltered notes from each session — what worked, what was confusing, what surprised, and what the tutorial itself still gets wrong. Read it before you build your own Bob tutorial.

---

## Key lessons for Bob practitioners

**`AGENTS.md` is load-bearing.** The file at the root of this project tells Bob the architecture rules, naming conventions, and gotchas. Bob reads it at the start of every session. If you want consistent, non-surprising behavior across sessions — especially on a project with multiple contributors or a long lifecycle — invest in `AGENTS.md` early.

**Plans before code.** The `*-plan.md` files in this repo are not documentation written after the fact. They were written first, reviewed, and then handed to Bob as the source of truth for each implementation task. This pattern — sometimes called *literate coding* — dramatically reduces the surface area for Bob to make an unintended decision.

**`.env` for secrets, always.** Node 18+ loads `.env` natively via `--env-file=.env`. There is no reason to hardcode tokens anywhere in the code or the MCP config.

**Subagents need the right mode.** Bob can spawn subagents, but subagents inherit the mode of the parent only sometimes. If a subagent needs to execute code, make sure it is running in Agent mode — not Ask mode.

**The `.bobignore` limitation is real.** Bob's `.bobignore` file tells Bob not to touch certain paths, but tools like `insert_content` and `search_and_replace` can still touch them. Be aware of this trust gap and keep sensitive or stable files simple.

---

## What is not done yet

- **`commitFrequency`** in `src/metrics.js` is a stub that returns `null`. It was intentionally left that way — the metric was superseded by PR frequency, which uses the same data already fetched. If you want commit frequency back, it is a good first Bob exercise.
- **Tests.** No test framework is configured. Adding one — picking Jest or Node's built-in `node:test`, wiring up a `test` script in `package.json`, and writing the first few unit tests for `src/metrics.js` — is another good Bob exercise.
- **Authentication UI.** The `GITHUB_TOKEN` always comes from `.env`. There is no way to supply a token through the dashboard.
- **Repo configurability.** The five repos in `server.js` are hardcoded in `REPOS`. Making that list configurable via a config file or CLI flag is straightforward.

---

## License

MIT
