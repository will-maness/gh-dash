/**
 * Repository health metric calculations.
 * All functions are stubs — implementations come later.
 */

/**
 * Calculate the average PR cycle time (open → merge) in hours.
 *
 * @param {object[]} prs - Array of GitHub pull-request objects.
 * @returns {number|null} Average cycle time in hours, or null when not yet implemented.
 */
function prCycleTime(prs) {
  const merged = prs.filter((pr) => pr.merged_at != null);

  if (merged.length === 0) {
    return null;
  }

  const totalHours = merged.reduce((sum, pr) => {
    const durationHours = (new Date(pr.merged_at) - new Date(pr.created_at)) / 3_600_000;
    return sum + durationHours;
  }, 0);

  return Math.round((totalHours / merged.length) * 10) / 10;
}

/**
 * Calculate PR frequency as merged pull requests per day over the observed window.
 *
 * Uses the span between the oldest and newest merged PR in the provided array
 * (typically the 100-PR fetch window) to derive a daily merge rate.
 *
 * @param {object[]} prs - Array of GitHub pull-request objects.
 * @returns {number|null} Merged PRs per day (one decimal place),
 *   or null when fewer than 2 merged PRs exist or the span is zero.
 */
function prFrequency(prs) {
  const merged = prs
    .filter((pr) => pr.merged_at != null)
    .map((pr) => new Date(pr.merged_at).getTime())
    .sort((a, b) => a - b);

  if (merged.length < 2) return null;

  const spanDays = (merged[merged.length - 1] - merged[0]) / 86_400_000;
  if (spanDays === 0) return null;

  return Math.round((merged.length / spanDays) * 10) / 10;
}

/**
 * Calculate contributor trends from an array of commit objects.
 *
 * @param {object[]} commits - Array of GitHub commit objects.
 * @returns {number[]} Array of 12 integers representing unique contributor counts per week.
 */
function contributorTrends(commits) {
  if (!commits || commits.length === 0) {
    return Array(12).fill(0);
  }

  const now = new Date();
  const weekRanges = [];
  
  // Create 12 week ranges, starting from the most recent week
  for (let i = 0; i < 12; i++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    
    weekRanges.unshift({ start: weekStart, end: weekEnd });
  }

  // Group commits by week and count unique contributors
  const weeklyContributors = weekRanges.map((range) => {
    const contributorsInWeek = new Set();
    
    commits.forEach((commit) => {
      if (!commit.commit || !commit.commit.committer || !commit.commit.committer.date) {
        return;
      }
      
      const commitDate = new Date(commit.commit.committer.date);
      
      if (commitDate >= range.start && commitDate <= range.end) {
        // Use author login if available, fallback to committer name
        const contributor = commit.author?.login || commit.commit.committer.name;
        if (contributor) {
          contributorsInWeek.add(contributor);
        }
      }
    });
    
    return contributorsInWeek.size;
  });

  return weeklyContributors;
}

/**
 * Count the total unique contributors across an array of commit objects.
 * Uses author.login when available, falling back to committer name.
 *
 * @param {object[]} commits - Array of GitHub commit objects.
 * @returns {number} Count of unique contributors.
 */
function uniqueContributorCount(commits) {
  if (!commits || commits.length === 0) return 0;

  const contributors = new Set();
  for (const commit of commits) {
    const id = commit.author?.login || commit.commit?.committer?.name;
    if (id) contributors.add(id);
  }
  return contributors.size;
}

/**
 * Convert an array of 12 weekly counts into an SVG polyline points string
 * scaled to fit a canvas of the given width × height.
 *
 * @param {number[]} counts - Array of 12 non-negative integers.
 * @param {number}   width  - SVG canvas width in pixels.
 * @param {number}   height - SVG canvas height in pixels.
 * @returns {string} Space-separated "x,y" pairs suitable for <polyline points="…">.
 */
function sparklinePoints(counts, width, height) {
  const n = counts.length;
  const max = Math.max(...counts, 1); // avoid division by zero when all counts are 0
  return counts
    .map((v, i) => {
      const x = Math.round((i / (n - 1)) * width * 10) / 10;
      // Invert Y: 0 count → bottom, max count → top; leave 1px margin each side
      const y = Math.round(((1 - v / max) * (height - 2) + 1) * 10) / 10;
      return `${x},${y}`;
    })
    .join(' ');
}

/**
 * Count branches whose most recent commit is older than 90 days.
 * The default branch is never considered stale.
 *
 * Branches are expected to have been enriched by fetchBranches so that
 * `branch.commit.commit.committer.date` is present.  A branch with no
 * resolvable commit date is skipped rather than counted.
 *
 * @param {object[]} branches      - Array of GitHub branch objects.
 * @param {string}   defaultBranch - The repository's default_branch name.
 * @returns {number} Count of stale branches.
 */
function staleBranches(branches, defaultBranch) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  let count = 0;
  for (const branch of branches) {
    if (branch.name === defaultBranch) continue;

    const date = branch.commit && branch.commit.commit && branch.commit.commit.committer
      ? branch.commit.commit.committer.date
      : null;

    if (!date) continue;

    if (new Date(date) < cutoff) {
      count++;
    }
  }
  return count;
}

module.exports = { prCycleTime, prFrequency, contributorTrends, sparklinePoints, staleBranches, uniqueContributorCount };
