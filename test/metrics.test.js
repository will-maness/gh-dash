'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  prCycleTime,
  prFrequency,
  contributorTrends,
  uniqueContributorCount,
  sparklinePoints,
  staleBranches,
} = require('../src/metrics');

// ---------------------------------------------------------------------------
// prCycleTime
// ---------------------------------------------------------------------------

test('prCycleTime returns null for empty array', () => {
  assert.equal(prCycleTime([]), null);
});

test('prCycleTime returns null when no PRs are merged', () => {
  const prs = [{ created_at: '2024-01-01T00:00:00Z', merged_at: null }];
  assert.equal(prCycleTime(prs), null);
});

test('prCycleTime calculates average hours for single merged PR', () => {
  const prs = [
    { created_at: '2024-01-01T00:00:00Z', merged_at: '2024-01-02T00:00:00Z' }, // 24 h
  ];
  assert.equal(prCycleTime(prs), 24);
});

test('prCycleTime averages across multiple merged PRs', () => {
  const prs = [
    { created_at: '2024-01-01T00:00:00Z', merged_at: '2024-01-02T00:00:00Z' }, // 24 h
    { created_at: '2024-01-01T00:00:00Z', merged_at: '2024-01-03T00:00:00Z' }, // 48 h
  ];
  assert.equal(prCycleTime(prs), 36);
});

test('prCycleTime ignores unmerged PRs in the average', () => {
  const prs = [
    { created_at: '2024-01-01T00:00:00Z', merged_at: '2024-01-03T00:00:00Z' }, // 48 h
    { created_at: '2024-01-01T00:00:00Z', merged_at: null },
  ];
  assert.equal(prCycleTime(prs), 48);
});

test('prCycleTime rounds to one decimal place', () => {
  // 1 h + 2 h = 3 h / 2 = 1.5 h — exact, but guard the rounding path
  const prs = [
    { created_at: '2024-01-01T00:00:00Z', merged_at: '2024-01-01T01:00:00Z' }, //  1 h
    { created_at: '2024-01-01T00:00:00Z', merged_at: '2024-01-01T02:00:00Z' }, //  2 h
  ];
  assert.equal(prCycleTime(prs), 1.5);
});

// ---------------------------------------------------------------------------
// prFrequency
// ---------------------------------------------------------------------------

test('prFrequency returns null for empty array', () => {
  assert.equal(prFrequency([]), null);
});

test('prFrequency returns null for single merged PR', () => {
  const prs = [{ merged_at: '2024-01-01T00:00:00Z' }];
  assert.equal(prFrequency(prs), null);
});

test('prFrequency returns null when merged PRs share the same timestamp (span = 0)', () => {
  const prs = [
    { merged_at: '2024-01-01T00:00:00Z' },
    { merged_at: '2024-01-01T00:00:00Z' },
  ];
  assert.equal(prFrequency(prs), null);
});

test('prFrequency returns null when no PRs are merged', () => {
  const prs = [
    { merged_at: null },
    { merged_at: null },
  ];
  assert.equal(prFrequency(prs), null);
});

test('prFrequency calculates merged PRs per day over the window', () => {
  // 2 merged PRs separated by exactly 1 day → 2/1 = 2 /day
  const prs = [
    { merged_at: '2024-01-01T00:00:00Z' },
    { merged_at: '2024-01-02T00:00:00Z' },
  ];
  assert.equal(prFrequency(prs), 2);
});

// ---------------------------------------------------------------------------
// uniqueContributorCount
// ---------------------------------------------------------------------------

test('uniqueContributorCount returns 0 for empty array', () => {
  assert.equal(uniqueContributorCount([]), 0);
});

test('uniqueContributorCount returns 0 for null/undefined input', () => {
  assert.equal(uniqueContributorCount(null), 0);
  assert.equal(uniqueContributorCount(undefined), 0);
});

test('uniqueContributorCount counts unique logins', () => {
  const commits = [
    { author: { login: 'alice' }, commit: { committer: { name: 'Alice' } } },
    { author: { login: 'bob' },   commit: { committer: { name: 'Bob' } } },
    { author: { login: 'alice' }, commit: { committer: { name: 'Alice' } } },
  ];
  assert.equal(uniqueContributorCount(commits), 2);
});

test('uniqueContributorCount falls back to committer name when author login absent', () => {
  const commits = [
    { commit: { committer: { name: 'charlie' } } },
    { commit: { committer: { name: 'charlie' } } },
    { commit: { committer: { name: 'dana' } } },
  ];
  assert.equal(uniqueContributorCount(commits), 2);
});

// ---------------------------------------------------------------------------
// contributorTrends
// ---------------------------------------------------------------------------

test('contributorTrends returns 12 zeros for empty input', () => {
  const result = contributorTrends([]);
  assert.deepEqual(result, Array(12).fill(0));
});

test('contributorTrends returns array of length 12', () => {
  const result = contributorTrends(null);
  assert.equal(result.length, 12);
});

test('contributorTrends counts a commit from this week in the last bucket', () => {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 1); // yesterday — always in current week
  const commits = [
    {
      author: { login: 'alice' },
      commit: { committer: { date: recentDate.toISOString() } },
    },
  ];
  const result = contributorTrends(commits);
  assert.equal(result.length, 12);
  // At least one bucket must be > 0
  assert.ok(result.some((v) => v > 0));
});

// ---------------------------------------------------------------------------
// sparklinePoints
// ---------------------------------------------------------------------------

test('sparklinePoints returns correct number of space-separated points', () => {
  const counts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const result = sparklinePoints(counts, 200, 40);
  const points = result.split(' ');
  assert.equal(points.length, 12);
});

test('sparklinePoints first x is 0, last x equals width', () => {
  const counts = Array(12).fill(5);
  const result = sparklinePoints(counts, 200, 40);
  const points = result.split(' ');
  const [firstX] = points[0].split(',').map(Number);
  const [lastX] = points[11].split(',').map(Number);
  assert.equal(firstX, 0);
  assert.equal(lastX, 200);
});

test('sparklinePoints all-zero counts produce flat bottom line', () => {
  // max is forced to 1 (avoids /0); all counts = 0 → y = height - 1
  const counts = Array(12).fill(0);
  const result = sparklinePoints(counts, 200, 40);
  result.split(' ').forEach((pt) => {
    const y = Number(pt.split(',')[1]);
    assert.equal(y, 39); // (1 - 0/1) * (40-2) + 1 = 39
  });
});

// ---------------------------------------------------------------------------
// staleBranches
// ---------------------------------------------------------------------------

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeBranch(name, daysOld) {
  return {
    name,
    commit: { commit: { committer: { date: daysAgo(daysOld) } } },
  };
}

test('staleBranches returns 0 for empty array', () => {
  assert.equal(staleBranches([], 'main'), 0);
});

test('staleBranches does not count the default branch', () => {
  const branches = [makeBranch('main', 100)];
  assert.equal(staleBranches(branches, 'main'), 0);
});

test('staleBranches counts branches older than 90 days', () => {
  const branches = [
    makeBranch('old-feature', 91),
    makeBranch('newer-feature', 89),
    makeBranch('main', 200),
  ];
  assert.equal(staleBranches(branches, 'main'), 1);
});

test('staleBranches skips branches with no commit date', () => {
  const branches = [
    { name: 'no-date', commit: null },
    makeBranch('old', 100),
  ];
  assert.equal(staleBranches(branches, 'main'), 1);
});
