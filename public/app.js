'use strict';

// Module-level cache of the full repo map from data.json
let repoMap = {};

// ── Progress bar ──────────────────────────────────────────────────────────────

/**
 * Poll GET /progress at 1-second intervals, updating the progress bar.
 * Resolves when the server reports running === false.
 * @returns {Promise<void>}
 */
function pollProgress() {
  const bar   = document.getElementById('job-progress');
  const fill  = document.getElementById('job-progress-fill');
  const label = document.getElementById('job-progress-label');
  const pct   = document.getElementById('job-progress-pct');

  function update(completed, total) {
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    fill.style.width = percent + '%';
    pct.textContent  = percent + '%';
    if (bar) bar.setAttribute('aria-valuenow', percent);
    if (label) label.textContent = total > 1
      ? `Fetching… (${completed}/${total} repos)`
      : 'Fetching…';
  }

  if (bar) bar.classList.add('visible');
  update(0, 0);

  return new Promise((resolve) => {
    let started = false;
    let ticks = 0;
    const MAX_TICKS = 300; // 5 minutes at 1-second intervals
    const id = setInterval(async () => {
      ticks++;
      if (!started && ticks >= MAX_TICKS) {
        clearInterval(id);
        if (bar) bar.classList.remove('visible');
        resolve();
        return;
      }
      try {
        const res = await fetch('/progress');
        if (!res.ok) return;
        const data = await res.json();
        if (data.running) {
          started = true;
          update(data.completed, data.total);
        } else if (started) {
          // Job was running and has now finished
          update(data.completed, data.total);
          clearInterval(id);
          if (bar) bar.classList.remove('visible');
          resolve();
        }
        // If !data.running && !started, the CLI hasn't written progress.json yet — keep waiting
      } catch {
        // network hiccup — keep polling
      }
    }, 1000);
  });
}

/**
 * Fetch data.json and update the in-memory repoMap.
 * @returns {Promise<void>}
 */
async function loadData() {
  try {
    const response = await fetch('data.json');
    if (response.ok) {
      repoMap = await response.json();
    }
  } catch {}
}

/**
 * Render the four metric cards for the given repo key.
 * Restores placeholder state when the repo has no data yet.
 * @param {string} repoKey - e.g. "axios/axios"
 */
function renderRepo(repoKey) {
  const data = repoMap[repoKey];

  const repoLabel = document.getElementById('repo-label');
  if (repoLabel) {
    repoLabel.textContent = repoKey;
  }

  const cycleTimeEl = document.getElementById('pr-cycle-time');
  if (cycleTimeEl) {
    if (data && data.avgCycleTimeHours !== undefined) {
      cycleTimeEl.textContent = data.avgCycleTimeHours !== null ? `${data.avgCycleTimeHours} hrs` : 'N/A';
      cycleTimeEl.classList.remove('placeholder');
    } else {
      cycleTimeEl.textContent = '—';
      cycleTimeEl.classList.add('placeholder');
    }
  }

  const staleBranchesEl = document.getElementById('stale-branches');
  if (staleBranchesEl) {
    if (data && data.staleBranches !== undefined) {
      staleBranchesEl.textContent = data.staleBranches;
      staleBranchesEl.classList.remove('placeholder');
    } else {
      staleBranchesEl.textContent = '—';
      staleBranchesEl.classList.add('placeholder');
    }
  }

  const contributorsEl = document.getElementById('contributors');
  if (contributorsEl) {
    if (data && data.contributorCount !== undefined) {
      contributorsEl.textContent = data.contributorCount;
      contributorsEl.classList.remove('placeholder');
    } else {
      contributorsEl.textContent = '—';
      contributorsEl.classList.add('placeholder');
    }
  }

  const prFreqEl = document.getElementById('commit-frequency');
  if (prFreqEl) {
    if (data && data.prFrequency !== undefined) {
      prFreqEl.textContent = data.prFrequency !== null
        ? `${data.prFrequency}/day`
        : 'N/A';
      prFreqEl.classList.remove('placeholder');
    } else {
      prFreqEl.textContent = '—';
      prFreqEl.classList.add('placeholder');
    }
  }

  // Sparkline — clear and redraw
  const svg = document.getElementById('contributor-sparkline');
  if (svg) {
    svg.innerHTML = '';
    if (data && data.contributorSparkline) {
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', data.contributorSparkline);
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', '#3b82d4');
      polyline.setAttribute('stroke-width', '1.5');
      svg.appendChild(polyline);
    }
  }
}

// ── Comparison table ─────────────────────────────────────────────────────────
async function loadCompareTable() {
  try {
    const response = await fetch('compare.json');
    if (!response.ok) return;

    const rows = await response.json();
    const placeholder = document.getElementById('compare-placeholder');
    const table = document.getElementById('compare-table');
    const tbody = document.getElementById('compare-tbody');

    if (!tbody || !table) return;

    const maxHours = Math.max(...rows.map((r) => r.avgCycleTimeHours ?? 0));

    rows.forEach((row, idx) => {
      const rank = idx + 1;
      const ct = row.avgCycleTimeHours !== null
        ? `${row.avgCycleTimeHours.toLocaleString()} hrs`
        : 'N/A';
      const days = row.avgCycleTimeHours !== null
        ? `(${(row.avgCycleTimeHours / 24).toFixed(1)} d)`
        : '';
      const pct = row.avgCycleTimeHours !== null && maxHours > 0
        ? Math.round((row.avgCycleTimeHours / maxHours) * 100)
        : 0;

      const badgeClass = rank <= 3 ? ` rank-${rank}` : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <span class="rank-badge${badgeClass}">${rank}</span>
          <a href="https://github.com/${row.repo}" target="_blank" rel="noopener">${row.repo}</a>
        </td>
        <td class="right">${ct} <span style="color:#8b949e;font-size:0.75rem">${days}</span></td>
        <td class="right">${row.totalMergedPRs.toLocaleString()}</td>
        <td class="bar-cell">
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%"></div>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });

    if (placeholder) placeholder.remove();
    table.hidden = false;
  } catch {}
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const dropdown = document.getElementById('repo-select');
  const refreshBtn = document.getElementById('refresh-btn');
  const refreshAllBtn = document.getElementById('refresh-all-btn');

  await loadData();
  renderRepo(dropdown.value);
  loadCompareTable();

  // Dropdown change → re-render from in-memory map (no network request)
  dropdown.addEventListener('change', () => {
    renderRepo(dropdown.value);
  });

  // Refresh button → POST to server for the selected repo, re-fetch data.json, re-render
  refreshBtn.addEventListener('click', async () => {
    const repoKey = dropdown.value;
    refreshBtn.disabled = true;
    refreshAllBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing…';

    // Start progress polling in parallel with the POST
    const progressDone = pollProgress();

    try {
      const res = await fetch(`/refresh?repo=${encodeURIComponent(repoKey)}`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('[refresh] Server error:', body.error || res.status);
      }
    } catch (err) {
      console.error('[refresh] Network error:', err.message);
    }

    await progressDone;
    await loadData();
    renderRepo(repoKey);
    refreshBtn.disabled = false;
    refreshAllBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  });

  // Refresh All button → POST /refresh-all, re-fetch data.json + compare.json, re-render
  refreshAllBtn.addEventListener('click', async () => {
    refreshAllBtn.disabled = true;
    refreshBtn.disabled = true;
    refreshAllBtn.textContent = 'Refreshing All…';

    // Start progress polling in parallel with the POST
    const progressDone = pollProgress();

    try {
      const res = await fetch('/refresh-all', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('[refresh-all] Server error:', body.error || res.status);
      }
    } catch (err) {
      console.error('[refresh-all] Network error:', err.message);
    }

    await progressDone;
    await loadData();
    renderRepo(dropdown.value);

    // Rebuild the comparison table with fresh data
    const tbody = document.getElementById('compare-tbody');
    if (tbody) tbody.innerHTML = '';
    const table = document.getElementById('compare-table');
    if (table) table.hidden = true;
    const placeholder = document.getElementById('compare-placeholder');
    if (placeholder) placeholder.textContent = 'Loading comparison data\u2026';

    loadCompareTable();

    refreshAllBtn.disabled = false;
    refreshBtn.disabled = false;
    refreshAllBtn.textContent = 'Refresh All';
  });
});
