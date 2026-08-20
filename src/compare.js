'use strict';

/**
 * Multi-repo comparison helpers.
 * Fetches closed PRs for a list of repos in parallel and returns ranked results.
 */

const { fetchPRs } = require('./github');
const { prCycleTime } = require('./metrics');

/**
 * Analyse a single repository and return a summary object.
 *
 * @param {string} slug - Repository in "owner/repo" format.
 * @returns {Promise<{ repo: string, avgCycleTimeHours: number|null, totalMergedPRs: number }>}
 */
async function analyzeRepo(slug) {
  const [owner, repo] = slug.split('/');
  const prs = await fetchPRs(owner, repo);
  const merged = prs.filter((pr) => pr.merged_at != null);
  return {
    repo: slug,
    avgCycleTimeHours: prCycleTime(prs),
    totalMergedPRs: merged.length,
  };
}

/**
 * Analyse multiple repositories in parallel and return results ranked by
 * average PR cycle time (fastest first; repos with null cycle time last).
 *
 * @param {string[]} slugs - Array of "owner/repo" strings.
 * @returns {Promise<Array<{ repo: string, avgCycleTimeHours: number|null, totalMergedPRs: number }>>}
 */
async function compareRepos(slugs) {
  const results = await Promise.all(slugs.map(analyzeRepo));
  return results.sort((a, b) => {
    if (a.avgCycleTimeHours === null) return 1;
    if (b.avgCycleTimeHours === null) return -1;
    return a.avgCycleTimeHours - b.avgCycleTimeHours;
  });
}

module.exports = { analyzeRepo, compareRepos };
