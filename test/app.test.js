'use strict';

/**
 * Tests for public/app.js browser-side logic.
 *
 * app.js is a browser script, not a CJS module.  We load it via node:vm
 * into a sandboxed context seeded with the minimal globals it actually
 * touches: document, fetch, setInterval, clearInterval.
 * Zero new dependencies — uses only Node built-ins (node:test, node:vm).
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const vm       = require('node:vm');
const fs       = require('node:fs');
const path     = require('node:path');

// Compile the script once; each test gets a fresh context.
const APP_SRC = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

/** Minimal element stub that tracks classList, style, textContent, attrs, children. */
function makeEl(id) {
  return {
    id,
    textContent: '',
    innerHTML: '',
    hidden: false,
    classList: {
      _set: new Set(),
      add(c)      { this._set.add(c); },
      remove(c)   { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
    },
    style: { width: '' },
    _attrs: {},
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k)    { return this._attrs[k]; },
    _children: [],
    appendChild(child) { this._children.push(child); },
    remove() {},
  };
}

/** Build a getElementById lookup from element stubs. */
function byId(...els) {
  const map = {};
  for (const el of els) map[el.id] = el;
  return (id) => map[id] || null;
}

/**
 * Load app.js into a fresh vm sandbox.
 * @param {object} overrides - globals to merge over the defaults
 * @returns {object} the populated sandbox (contains pollProgress, renderRepo, repoMap, …)
 */
function loadApp(overrides) {
  const sandbox = Object.assign(
    {
      // Minimal document: getElementById returns null; addEventListener is a no-op
      document: {
        getElementById: () => null,
        addEventListener: () => {},
        createElement: () => makeEl('_tmp'),
        createElementNS: () => makeEl('_ns'),
      },
      fetch: async () => ({ ok: false }),
      setInterval:  global.setInterval,
      clearInterval: global.clearInterval,
      setTimeout:   global.setTimeout,
      clearTimeout: global.clearTimeout,
      console,
      Math,
    },
    overrides,
  );
  vm.createContext(sandbox);
  vm.runInContext(APP_SRC, sandbox);
  return sandbox;
}

// ---------------------------------------------------------------------------
// pollProgress — timeout path: CLI never writes running:true
// ---------------------------------------------------------------------------

test('pollProgress resolves after MAX_TICKS when CLI never writes running:true', async () => {
  const bar  = makeEl('job-progress');
  const fill = makeEl('job-progress-fill');
  const lbl  = makeEl('job-progress-label');
  const pct  = makeEl('job-progress-pct');

  // Always responds with running: false (CLI never started)
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({ running: false, completed: 0, total: 0 }),
  });

  let intervalCb = null;
  let cleared    = false;

  const ctx = loadApp({
    fetch: fakeFetch,
    document: { getElementById: byId(bar, fill, lbl, pct), addEventListener: () => {} },
    setInterval:  (fn) => { intervalCb = fn; return 1; },
    clearInterval: () => { cleared = true; },
  });

  const done = ctx.pollProgress();

  // Drive 299 ticks — must NOT resolve yet
  for (let i = 0; i < 299; i++) await intervalCb();
  assert.equal(cleared, false, 'should not clear before tick 300');

  // 300th tick — must resolve now
  await intervalCb();
  await done; // would hang forever before the fix

  assert.equal(cleared, true, 'clearInterval called on timeout');
  assert.equal(bar.classList.contains('visible'), false, 'progress bar hidden on timeout');
});

// ---------------------------------------------------------------------------
// pollProgress — normal finish: running true → false
// ---------------------------------------------------------------------------

test('pollProgress resolves when running transitions from true to false', async () => {
  let call = 0;
  const sequence = [
    { running: true,  completed: 1, total: 2 },
    { running: true,  completed: 2, total: 2 },
    { running: false, completed: 2, total: 2 },
  ];
  const fakeFetch = async () => ({
    ok: true,
    json: async () => sequence[Math.min(call++, sequence.length - 1)],
  });

  const bar  = makeEl('job-progress');
  const fill = makeEl('job-progress-fill');
  const lbl  = makeEl('job-progress-label');
  const pct  = makeEl('job-progress-pct');

  let intervalCb = null;
  let cleared    = false;

  const ctx = loadApp({
    fetch: fakeFetch,
    document: { getElementById: byId(bar, fill, lbl, pct), addEventListener: () => {} },
    setInterval:  (fn) => { intervalCb = fn; return 1; },
    clearInterval: () => { cleared = true; },
  });

  const done = ctx.pollProgress();

  await intervalCb(); // tick 1: running=true  → sets started=true, updates bar
  await intervalCb(); // tick 2: running=true  → updates bar
  await intervalCb(); // tick 3: running=false → resolves

  await done;

  assert.equal(cleared, true,  'clearInterval called on finish');
  assert.equal(bar.classList.contains('visible'), false, 'progress bar hidden on finish');
  assert.equal(fill.style.width, '100%', 'progress fill at 100% on finish');
});

// ---------------------------------------------------------------------------
// renderRepo — placeholder state (no data in repoMap)
// ---------------------------------------------------------------------------

test('renderRepo sets placeholder text and class when repo has no data', () => {
  const cycleEl  = makeEl('pr-cycle-time');
  const staleEl  = makeEl('stale-branches');
  const contribEl= makeEl('contributors');
  const freqEl   = makeEl('commit-frequency');
  const labelEl  = makeEl('repo-label');
  const sparkEl  = makeEl('contributor-sparkline');

  const ctx = loadApp({
    document: {
      getElementById: byId(labelEl, cycleEl, staleEl, contribEl, freqEl, sparkEl),
      addEventListener: () => {},
      createElementNS: () => makeEl('polyline'),
    },
  });

  ctx.renderRepo('unknown/repo');

  assert.equal(labelEl.textContent,  'unknown/repo');
  assert.equal(cycleEl.textContent,  '—');
  assert.equal(cycleEl.classList.contains('placeholder'),   true);
  assert.equal(staleEl.textContent,  '—');
  assert.equal(staleEl.classList.contains('placeholder'),   true);
  assert.equal(contribEl.textContent, '—');
  assert.equal(contribEl.classList.contains('placeholder'), true);
  assert.equal(freqEl.textContent,   '—');
  assert.equal(freqEl.classList.contains('placeholder'),    true);
});

// ---------------------------------------------------------------------------
// renderRepo — populated state (data present in repoMap)
// ---------------------------------------------------------------------------

test('renderRepo renders metric values and removes placeholder class', async () => {
  const cycleEl  = makeEl('pr-cycle-time');
  const staleEl  = makeEl('stale-branches');
  const contribEl= makeEl('contributors');
  const freqEl   = makeEl('commit-frequency');
  const labelEl  = makeEl('repo-label');
  const sparkEl  = makeEl('contributor-sparkline');

  // Pre-seed placeholder class to verify removal
  cycleEl.classList.add('placeholder');
  freqEl.classList.add('placeholder');

  const data = {
    'owner/repo': {
      avgCycleTimeHours: 12.5,
      staleBranches: 3,
      contributorCount: 7,
      prFrequency: 1.2,
      contributorSparkline: '0,10 5,8 10,9',
    },
  };

  // loadData() is the only path that writes the module-level `let repoMap`.
  // Stub fetch so loadData() populates it with our test data.
  const fakeFetch = async (url) => {
    if (url === 'data.json') return { ok: true, json: async () => data };
    return { ok: false };
  };

  let polylineAttrs = {};
  const ctx = loadApp({
    fetch: fakeFetch,
    document: {
      getElementById: byId(labelEl, cycleEl, staleEl, contribEl, freqEl, sparkEl),
      addEventListener: () => {},
      createElementNS: (_ns, _tag) => {
        const el = makeEl('polyline');
        el.setAttribute = (k, v) => { polylineAttrs[k] = v; el._attrs[k] = v; };
        return el;
      },
    },
  });

  await ctx.loadData();
  ctx.renderRepo('owner/repo');

  assert.equal(labelEl.textContent,  'owner/repo');
  assert.equal(cycleEl.textContent,  '12.5 hrs');
  assert.equal(cycleEl.classList.contains('placeholder'),   false);
  assert.equal(staleEl.textContent,  3);
  assert.equal(contribEl.textContent, 7);
  assert.equal(freqEl.textContent,   '1.2/day');
  assert.equal(freqEl.classList.contains('placeholder'),    false);
  assert.equal(sparkEl._children.length, 1, 'polyline appended to sparkline svg');
  assert.equal(polylineAttrs.points, '0,10 5,8 10,9');
});

// ---------------------------------------------------------------------------
// renderRepo — null metric values show N/A (not crash)
// ---------------------------------------------------------------------------

test('renderRepo shows N/A for null avgCycleTimeHours and prFrequency', async () => {
  const cycleEl = makeEl('pr-cycle-time');
  const freqEl  = makeEl('commit-frequency');

  const data = {
    'owner/repo': {
      avgCycleTimeHours: null,
      staleBranches: 0,
      contributorCount: null,
      prFrequency: null,
    },
  };

  const ctx = loadApp({
    fetch: async (url) => url === 'data.json'
      ? { ok: true, json: async () => data }
      : { ok: false },
    document: {
      getElementById: byId(cycleEl, freqEl,
        makeEl('repo-label'), makeEl('stale-branches'),
        makeEl('contributors'), makeEl('contributor-sparkline')),
      addEventListener: () => {},
      createElementNS: () => makeEl('polyline'),
    },
  });

  await ctx.loadData();
  ctx.renderRepo('owner/repo');

  assert.equal(cycleEl.textContent, 'N/A');
  assert.equal(cycleEl.classList.contains('placeholder'), false);
  assert.equal(freqEl.textContent,  'N/A');
  assert.equal(freqEl.classList.contains('placeholder'),  false);
});
