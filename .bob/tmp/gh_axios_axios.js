const headers = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'gh-dash',
};

if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
}

const repo = 'axios/axios';
const perPage = 100;
const maxPages = 10;

async function main() {
  const pulls = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await fetch(`https://api.github.com/repos/${repo}/pulls?state=closed&per_page=${perPage}&page=${page}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed with status ${response.status}`);
    }

    const batch = await response.json();
    pulls.push(...batch);

    if (batch.length < perPage) {
      break;
    }
  }

  const mergedPulls = pulls.filter((pr) => pr.merged_at !== null);
  const totalHours = mergedPulls.reduce((sum, pr) => sum + ((new Date(pr.merged_at) - new Date(pr.created_at)) / 3_600_000), 0);
  const avgCycleTimeHours = mergedPulls.length === 0 ? null : Math.round((totalHours / mergedPulls.length) * 10) / 10;

  process.stdout.write(JSON.stringify({
    repo,
    avgCycleTimeHours,
    totalMergedPRs: mergedPulls.length,
  }));
}

main().catch((error) => {
  process.stderr.write(error.message);
  process.exit(1);
});