/**
 * Core filter engine.
 *
 * friendFilterMode:
 *   'none'      - ignore filterSet
 *   'intersect' - problem MUST be in filterSet
 *
 * User handle filtering:
 *   excludeUserSolved - Set of IDs to exclude (Codeforces: keyed by problem.id)
 *   showOnlyUserSolved - Set of IDs to include (Codeforces: keyed by problem.id)
 *   excludeUserSolvedSlugs - Set of titleSlugs to exclude (LeetCode: keyed by problem.titleSlug)
 *   showOnlyUserSolvedSlugs - Set of titleSlugs to include (LeetCode: keyed by problem.titleSlug)
 *
 * Evaluation order:
 *   1. Tags
 *   2. Difficulty / Rating
 *   3. LeetCode user-solved (titleSlug) — if both provided, show-only wins
 *   4. History
 *   5. Friend filter
 *   6. Codeforces exclude user solved (id)
 *   7. Codeforces show only user solved (id)
 */
const filterProblems = ({
  problems = [],
  tags = [],
  minRating,
  maxRating,
  difficulty,
  filterSet = new Set(),
  friendFilterMode = 'none',
  history = new Set(),
  excludeUserSolved = new Set(),
  showOnlyUserSolved = new Set(),
  excludeUserSolvedSlugs = new Set(),
  showOnlyUserSolvedSlugs = new Set(),
}) => {
  let filtered = [...problems];

  // 1. Tag OR filter
  if (tags.length > 0) {
    const tagSet = new Set(tags.map(t => t.toLowerCase()));
    filtered = filtered.filter(p =>
      p.tags && p.tags.some(t => tagSet.has(t.toLowerCase()))
    );
  }

  // 2. Difficulty
  if (minRating !== undefined && maxRating !== undefined) {
    // Allow min === max (exact rating)
    filtered = filtered.filter(p =>
      p.rating !== undefined && p.rating >= minRating && p.rating <= maxRating
    );
  } else if (difficulty) {
    filtered = filtered.filter(p =>
      p.difficulty && p.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
  }

  // 3. LeetCode user-solved filtering (keyed by titleSlug)
  // If both are provided, show-only wins
  if (showOnlyUserSolvedSlugs && showOnlyUserSolvedSlugs.size > 0) {
    filtered = filtered.filter(p => p.titleSlug && showOnlyUserSolvedSlugs.has(p.titleSlug));
  } else if (excludeUserSolvedSlugs && excludeUserSolvedSlugs.size > 0) {
    filtered = filtered.filter(p => !p.titleSlug || !excludeUserSolvedSlugs.has(p.titleSlug));
  }

  // 4. Exclude history
  if (history.size > 0) {
    filtered = filtered.filter(p => !history.has(p.id));
  }

  // 5. Friend filter
  if (friendFilterMode === 'intersect' && filterSet.size > 0) {
    filtered = filtered.filter(p => filterSet.has(p.id));
  }

  // 6. Codeforces: exclude user solved
  if (excludeUserSolved.size > 0) {
    filtered = filtered.filter(p => !excludeUserSolved.has(p.id));
  }

  // 7. Codeforces: show only user solved (review mode)
  if (showOnlyUserSolved.size > 0) {
    filtered = filtered.filter(p => showOnlyUserSolved.has(p.id));
  }

  return filtered;
};

module.exports = { filterProblems };
