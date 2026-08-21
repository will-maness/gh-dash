'use strict';

/**
 * Multi-repo comparison helpers.
 * Builds the compare.json ranking from data already computed in data.json —
 * no additional GitHub API calls are made here.
 */

/**
 * Build a sorted ranking array from the data.json repo map.
 *
 * @param {object} repoMap - Keyed map of repo results as stored in data.json.
 * @returns {Array<{ repo: string, avgCycleTimeHours: number|null, totalMergedPRs: number }>}
 *   Sorted by avgCycleTimeHours ascending; entries with null last.
 */
function buildCompareRows(repoMap) {
  const rows = Object.entries(repoMap).map(([slug, data]) => ({
    repo: slug,
    avgCycleTimeHours: data.avgCycleTimeHours !== undefined ? data.avgCycleTimeHours : null,
    totalMergedPRs: data.totalMergedPRs !== undefined ? data.totalMergedPRs : 0,
  }));

  return rows.sort((a, b) => {
    if (a.avgCycleTimeHours === null) return 1;
    if (b.avgCycleTimeHours === null) return -1;
    return a.avgCycleTimeHours - b.avgCycleTimeHours;
  });
}

module.exports = { buildCompareRows };
