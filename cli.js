#!/usr/bin/env node
/**
 * gh-dash CLI entry point.
 *
 * Usage:
 *   node cli.js --repos <owner/repo> [<owner/repo> ...]
 *
 * One or more repo slugs may be supplied.  Every slug gets the full set of
 * metrics computed and written into public/data.json.  A public/compare.json
 * ranking is always produced from the same computed data (no second fetch).
 */

'use strict';

const fs = require('fs');
const { fetchPRs, fetchCommits, fetchBranches, fetchRepo } = require('./src/github');
const { prCycleTime, prFrequency, contributorTrends, sparklinePoints, staleBranches, uniqueContributorCount } = require('./src/metrics');
const { buildCompareRows } = require('./src/compare');

/**
 * Parse CLI arguments into a repos array.
 * @param {string[]} argv
 * @returns {{ repos: string[] }}
 */
function parseArgs(argv) {
  const args = { repos: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repos') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        args.repos.push(argv[++i]);
      }
    }
  }
  return args;
}
module.exports = { parseArgs };

/**
 * Fetch all data and compute every metric for a single repo slug.
 *
 * @param {string} slug - Repository in "owner/repo" format.
 * @returns {Promise<object>} Result object keyed by slug for data.json.
 */
async function analyzeRepo(slug) {
  if (!slug.includes('/') || slug.split('/').length !== 2) {
    throw new Error(`Invalid repo slug "${slug}". Expected format: owner/repo`);
  }
  const [owner, repo] = slug.split('/');

  console.log(`[${slug}] Fetching repo metadata…`);
  const repoData = await fetchRepo(owner, repo);
  const defaultBranch = repoData.default_branch;

  console.log(`[${slug}] Fetching PRs…`);
  const prs = await fetchPRs(owner, repo);
  const avgCycleTimeHours = prCycleTime(prs);
  const freq = prFrequency(prs);
  const merged = prs.filter((pr) => pr.merged_at != null);

  console.log(`[${slug}] Fetching commits…`);
  const commits = await fetchCommits(owner, repo);
  const trends = contributorTrends(commits);
  const sparkline = sparklinePoints(trends, 200, 40);
  const contributorCount = uniqueContributorCount(commits);

  console.log(`[${slug}] Fetching branches…`);
  const branches = await fetchBranches(owner, repo);
  const staleBranchCount = staleBranches(branches, defaultBranch);

  const display = avgCycleTimeHours !== null ? `${avgCycleTimeHours} hrs` : 'N/A (no merged PRs)';
  console.log(`[${slug}] Avg Cycle Time: ${display}  PR Frequency: ${freq !== null ? freq + '/day' : 'N/A'}  Stale Branches: ${staleBranchCount}  Contributors: ${contributorCount}`);

  return {
    owner,
    repo,
    avgCycleTimeHours,
    prFrequency: freq,
    contributorSparkline: sparkline,
    staleBranches: staleBranchCount,
    contributorCount,
    totalMergedPRs: merged.length,
  };
}

const PROGRESS_PATH = './public/progress.json';

/**
 * Write the current progress state to public/progress.json.
 * @param {boolean} running
 * @param {number} completed
 * @param {number} total
 */
function writeProgress(running, completed, total) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ running, completed, total }, null, 2));
}

/**
 * Analyse all supplied slugs, write data.json and compare.json.
 * @param {string[]} slugs
 */
async function runRepos(slugs) {
  console.log(`Analysing ${slugs.length} repo(s): ${slugs.join(', ')}`);

  writeProgress(true, 0, slugs.length);

  let completed = 0;
  const results = [];
  for (const slug of slugs) {
    const result = await analyzeRepo(slug);
    completed += 1;
    writeProgress(true, completed, slugs.length);
    results.push(result);
  }

  // Merge into data.json (read-merge-write to preserve other repos)
  const dataPath = './public/data.json';
  let map = {};
  try {
    map = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (_) {
    // file absent or malformed — start fresh
  }
  for (const result of results) {
    map[`${result.owner}/${result.repo}`] = result;
  }
  fs.writeFileSync(dataPath, JSON.stringify(map, null, 2));
  console.log(`Written to ${dataPath}`);

  // Build compare.json from already-computed data (no re-fetch)
  const compareRows = buildCompareRows(map);
  fs.writeFileSync('./public/compare.json', JSON.stringify(compareRows, null, 2));
  console.log('Written to ./public/compare.json');

  writeProgress(false, slugs.length, slugs.length);

  console.log('\nRanked by PR cycle time (fastest → slowest):');
  compareRows.forEach((r, i) => {
    const ct = r.avgCycleTimeHours !== null ? `${r.avgCycleTimeHours} hrs` : 'N/A';
    console.log(`  ${i + 1}. ${r.repo.padEnd(30)} ${ct}  (${r.totalMergedPRs} merged PRs)`);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.repos.length === 0) {
    console.error('Usage:');
    console.error('  node cli.js --repos <owner/repo> [<owner/repo> ...]');
    process.exit(1);
  }

  for (const slug of args.repos) {
    if (!/^[^/]+\/[^/]+$/.test(slug)) {
      console.error(`Invalid repo slug "${slug}". Expected format: owner/repo`);
      process.exit(1);
    }
  }

  await runRepos(args.repos);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
