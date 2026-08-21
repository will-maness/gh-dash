'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildCompareRows } = require('../src/compare');

// ---------------------------------------------------------------------------
// buildCompareRows
// ---------------------------------------------------------------------------

test('buildCompareRows returns empty array for empty map', () => {
  assert.deepEqual(buildCompareRows({}), []);
});

test('buildCompareRows maps slug keys to repo field', () => {
  const map = {
    'owner/repo-a': { avgCycleTimeHours: 10, totalMergedPRs: 5 },
  };
  const rows = buildCompareRows(map);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].repo, 'owner/repo-a');
});

test('buildCompareRows preserves avgCycleTimeHours and totalMergedPRs', () => {
  const map = {
    'owner/repo-a': { avgCycleTimeHours: 24, totalMergedPRs: 12 },
  };
  const [row] = buildCompareRows(map);
  assert.equal(row.avgCycleTimeHours, 24);
  assert.equal(row.totalMergedPRs, 12);
});

test('buildCompareRows defaults missing fields to null / 0', () => {
  const map = { 'owner/repo-a': {} };
  const [row] = buildCompareRows(map);
  assert.equal(row.avgCycleTimeHours, null);
  assert.equal(row.totalMergedPRs, 0);
});

test('buildCompareRows sorts by avgCycleTimeHours ascending', () => {
  const map = {
    'owner/slow':   { avgCycleTimeHours: 48, totalMergedPRs: 3 },
    'owner/fast':   { avgCycleTimeHours: 12, totalMergedPRs: 7 },
    'owner/medium': { avgCycleTimeHours: 24, totalMergedPRs: 5 },
  };
  const rows = buildCompareRows(map);
  assert.equal(rows[0].repo, 'owner/fast');
  assert.equal(rows[1].repo, 'owner/medium');
  assert.equal(rows[2].repo, 'owner/slow');
});

test('buildCompareRows places null avgCycleTimeHours entries last', () => {
  const map = {
    'owner/no-data': { avgCycleTimeHours: null, totalMergedPRs: 0 },
    'owner/fast':    { avgCycleTimeHours: 8,    totalMergedPRs: 4 },
  };
  const rows = buildCompareRows(map);
  assert.equal(rows[0].repo, 'owner/fast');
  assert.equal(rows[1].repo, 'owner/no-data');
});

test('buildCompareRows handles multiple null entries without throwing', () => {
  const map = {
    'owner/a': { avgCycleTimeHours: null, totalMergedPRs: 0 },
    'owner/b': { avgCycleTimeHours: null, totalMergedPRs: 0 },
  };
  assert.doesNotThrow(() => buildCompareRows(map));
  const rows = buildCompareRows(map);
  assert.equal(rows.length, 2);
});
