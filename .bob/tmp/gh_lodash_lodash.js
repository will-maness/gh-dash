const BASE = 'https://api.github.com/repos/lodash/lodash/pulls';
const headers = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'gh-dash',
};
if (process.env.GITHUB_TOKEN) {
  headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

async function fetchAllPRs() {
  const prs = [];
  for (let page = 1; page <= 10; page++) {
    const url = `${BASE}?state=closed&per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    prs.push(...batch);
    if (batch.length < 100) break;
  }
  return prs;
}

(async () => {
  const prs = await fetchAllPRs();
  const merged = prs.filter(pr => pr.merged_at != null);
  let totalHours = 0;
  for (const pr of merged) {
    totalHours += (new Date(pr.merged_at) - new Date(pr.created_at)) / 3_600_000;
  }
  const avgCycleTimeHours =
    merged.length > 0
      ? Math.round((totalHours / merged.length) * 10) / 10
      : null;
  console.log(
    JSON.stringify({
      repo: 'lodash/lodash',
      avgCycleTimeHours,
      totalMergedPRs: merged.length,
    })
  );
})();
