#!/usr/bin/env node
/**
 * gh-dash CLI entry point.
 *
 * Usage:
 *   node cli.js --owner <owner> --repo <repo>
 *   node cli.js --compare <owner/repo> [<owner/repo> ...]
 */

'use strict';

const fs = require('fs');
const { fetchPRs, fetchCommits } = require('./src/github');
const { prCycleTime, contributorTrends, sparklinePoints } = require('./src/metrics');
const { compareRepos } = require('./src/compare');

function parseArgs(argv) {
  const args = { compare: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--owner' && argv[i + 1]) {
      args.owner = argv[++i];
    } else if (argv[i] === '--repo' && argv[i + 1]) {
      args.repo = argv[++i];
    } else if (argv[i] === '--compare') {
      // Collect all following non-flag tokens as repo slugs
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        args.compare.push(argv[++i]);
      }
    }
  }
  return args;
}

async function runCompare(slugs) {
  console.log(`Comparing ${slugs.length} repos: ${slugs.join(', ')}`);
  const results = await compareRepos(slugs);

  fs.writeFileSync('./public/compare.json', JSON.stringify(results, null, 2));
  console.log('\nRanked by PR cycle time (fastest → slowest):');
  results.forEach((r, i) => {
    const ct = r.avgCycleTimeHours !== null ? `${r.avgCycleTimeHours} hrs` : 'N/A';
    console.log(`  ${i + 1}. ${r.repo.padEnd(30)} ${ct}  (${r.totalMergedPRs} merged PRs)`);
  });
  console.log('\nWritten to ./public/compare.json');
}

async function runSingle(owner, repo) {
  console.log(`Fetching PRs for ${owner}/${repo}...`);
  const prs = await fetchPRs(owner, repo);
  const cycleTime = prCycleTime(prs);

  console.log(`Fetching commits for ${owner}/${repo}...`);
  const commits = await fetchCommits(owner, repo);
  const trends = contributorTrends(commits);
  const sparkline = sparklinePoints(trends, 200, 40);

  const result = { owner, repo, prCycleTime: cycleTime, contributorSparkline: sparkline };
  fs.writeFileSync('./public/data.json', JSON.stringify(result, null, 2));

  const display = cycleTime !== null ? `${cycleTime} hrs` : 'N/A (no merged PRs)';
  console.log(`PR Cycle Time: ${display}`);
  console.log(`Written to ./public/data.json`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.compare.length > 0) {
    await runCompare(args.compare);
    return;
  }

  if (!args.owner || !args.repo) {
    console.error('Usage:');
    console.error('  node cli.js --owner <owner> --repo <repo>');
    console.error('  node cli.js --compare <owner/repo> [<owner/repo> ...]');
    process.exit(1);
  }

  await runSingle(args.owner, args.repo);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
