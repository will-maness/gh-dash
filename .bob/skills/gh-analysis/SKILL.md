---
name: gh-analysis
description: Analyze GitHub repositories for health metrics including PR cycle time, commit frequency, stale branches, and contributor activity. Use when writing or extending analysis functions in gh-dash that call the GitHub REST API v3
---

# gh-analysis Skill

## Domain conventions in this project

All GitHub API calls go through `src/github.js`. Never call the API
directly from metrics.js or cli.js.

Metric functions live in `src/metrics.js` and accept raw API response
arrays as their only argument. They return a single number or null.

The dashboard renders metric values by ID: `#pr-cycle-time`,
`#commit-freq`, `#stale-branches`, `#contributors`.

## GitHub API patterns

PRs: GET /repos/{owner}/{repo}/pulls?state=closed&per_page=100
Commits: GET /repos/{owner}/{repo}/commits?per_page=100
Branches: GET /repos/{owner}/{repo}/branches?per_page=100
Contributors: GET /repos/{owner}/{repo}/contributors?per_page=100

All endpoints paginate. Check the Link header for rel="next".

## Key edge cases to always handle

- merged_at is null for closed-but-unmerged PRs — skip these for cycle time
- Branches with no commits in 90+ days are stale
- The default branch is never stale regardless of commit date
- contributor.login may be null for deleted GitHub accounts