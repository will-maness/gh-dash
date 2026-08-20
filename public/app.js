'use strict';

(async () => {
  // ── Single-repo metrics ─────────────────────────────────────────────────
  try {
    const response = await fetch('data.json');
    if (response.ok) {
      const data = await response.json();

      const repoLabel = document.getElementById('repo-label');
      if (repoLabel) {
        repoLabel.textContent = `${data.owner}/${data.repo}`;
      }

      const cycleTimeEl = document.getElementById('pr-cycle-time');
      if (cycleTimeEl) {
        cycleTimeEl.textContent = data.prCycleTime !== null ? `${data.prCycleTime} hrs` : 'N/A';
        cycleTimeEl.classList.remove('placeholder');
      }

      if (data.contributorSparkline) {
        const svg = document.getElementById('contributor-sparkline');
        if (svg) {
          const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
          polyline.setAttribute('points', data.contributorSparkline);
          polyline.setAttribute('fill', 'none');
          polyline.setAttribute('stroke', '#3b82d4');
          polyline.setAttribute('stroke-width', '1.5');
          svg.appendChild(polyline);
        }
      }
    }
  } catch {}

  // ── Comparison table ────────────────────────────────────────────────────
  try {
    const response = await fetch('compare.json');
    if (!response.ok) return;

    const rows = await response.json();
    const placeholder = document.getElementById('compare-placeholder');
    const table = document.getElementById('compare-table');
    const tbody = document.getElementById('compare-tbody');

    if (!tbody || !table) return;

    // Fastest (index 0) already has the smallest value; slowest is the max
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
})();
