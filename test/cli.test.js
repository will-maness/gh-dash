'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../cli');

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

test('parseArgs returns empty repos array when no args supplied', () => {
  assert.deepEqual(parseArgs([]), { repos: [] });
});

test('parseArgs parses a single --repos slug', () => {
  const result = parseArgs(['--repos', 'owner/repo']);
  assert.deepEqual(result.repos, ['owner/repo']);
});

test('parseArgs parses multiple slugs after --repos', () => {
  const result = parseArgs(['--repos', 'owner/a', 'owner/b', 'owner/c']);
  assert.deepEqual(result.repos, ['owner/a', 'owner/b', 'owner/c']);
});

test('parseArgs stops collecting repos at the next -- flag', () => {
  const result = parseArgs(['--repos', 'owner/a', '--other-flag', 'owner/b']);
  assert.deepEqual(result.repos, ['owner/a']);
});

test('parseArgs ignores unrecognised flags', () => {
  const result = parseArgs(['--verbose']);
  assert.deepEqual(result.repos, []);
});
