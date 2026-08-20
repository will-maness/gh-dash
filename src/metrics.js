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
 * Calculate commit frequency as commits per day over the observed period.
 *
 * @param {object[]} commits - Array of GitHub commit objects.
 * @returns {number|null} Commits per day, or null when not yet implemented.
 */
function commitFrequency(commits) {
  return null;
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

module.exports = { prCycleTime, commitFrequency, contributorTrends, sparklinePoints };
