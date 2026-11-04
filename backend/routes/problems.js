const express = require('express');
const router  = express.Router();

const { getAllProblems: getCFProblems }  = require('../services/codeforcesService');
const { getAllProblems: getLCProblems }  = require('../services/leetcodeService');
const { getAllProblems: getGFGProblems } = require('../services/gfgService');
const { getFriendsData }                = require('../services/codeforcesService');
const { filterProblems }                = require('../utils/filterEngine');
const { pickRandom }                    = require('../utils/random');

/* ── Helper: load problem pool by platform ─────── */
async function loadProblems(platform) {
  if (platform === 'codeforces') return getCFProblems();
  if (platform === 'leetcode')   return getLCProblems();
  if (platform === 'gfg')        return getGFGProblems();
  return null;
}

/* ── POST /pick — random problem matching filters ── */
router.post('/pick', async (req, res, next) => {
  try {
    const {
      platform = 'codeforces',
      tags = [],
      minRating, maxRating, difficulty,
      filterMode = 'none',
      friendHandles = [],
      history = [],
      smartMode = false,
      lastRating,
      ignoreFilterMode = false,
      // Codeforces user handle filtering (arrays of problem IDs)
      excludeUserSolved  = [],
      showOnlyUserSolved = [],
      // LeetCode user handle filtering (arrays of titleSlugs)
      excludeUserSolvedSlugs = [],
      showOnlyUserSolvedSlugs = [],
    } = req.body;

    // Load problem pool
    const problems = await loadProblems(platform);
    if (!problems) return res.status(400).json({ error: `Unknown platform: ${platform}` });

    // Codeforces-only friend data
    let solvedSet = new Set(), attemptedSet = new Set(), perProblem = {};
    const activeMode = ignoreFilterMode ? 'none' : filterMode;
    if (platform === 'codeforces' && friendHandles.length > 0 && activeMode !== 'none') {
      const fd = await getFriendsData(friendHandles);
      solvedSet = fd.solvedUnion; attemptedSet = fd.attemptedUnion; perProblem = fd.perProblem;
    }

    // Codeforces-only smart mode bump
    let effectiveMin = minRating, effectiveMax = maxRating;
    if (platform === 'codeforces') {
      if (smartMode && lastRating) {
        effectiveMin = lastRating + 100;
        effectiveMax = lastRating + 400;
      }
    } else {
      // Non-CF platforms ignore rating and friend filters
      effectiveMin = undefined;
      effectiveMax = undefined;
    }

    const historySet = new Set(history);
    let filterSet = new Set(), friendFilterMode = 'none';
    if (platform === 'codeforces') {
      if (activeMode === 'unsolved') { filterSet = attemptedSet; friendFilterMode = 'intersect'; }
      else if (activeMode === 'solved') { filterSet = solvedSet; friendFilterMode = 'intersect'; }
    }

    // Build user-handle sets
    const excludeSet   = new Set(excludeUserSolved);
    const showOnlySet  = new Set(showOnlyUserSolved);
    const excludeSlugsSet  = new Set(excludeUserSolvedSlugs);
    const showOnlySlugsSet = new Set(showOnlyUserSolvedSlugs);

    let filtered = filterProblems({
      problems,
      tags,
      minRating: effectiveMin,
      maxRating: effectiveMax,
      difficulty,
      filterSet,
      friendFilterMode,
      history: historySet,
      excludeUserSolved: excludeSet,
      showOnlyUserSolved: showOnlySet,
      excludeUserSolvedSlugs: excludeSlugsSet,
      showOnlyUserSolvedSlugs: showOnlySlugsSet,
    });

    // Friend-filtered no match → special response (Codeforces only)
    const wasFriendFiltered = platform === 'codeforces' && (filterMode === 'unsolved' || filterMode === 'solved') && !ignoreFilterMode && friendHandles.length > 0;
    if (filtered.length === 0 && wasFriendFiltered) {
      return res.status(404).json({
        noFriendMatch: true,
        filterMode,
        error: `No problems match your rating/tags AND the "${filterMode}" friend filter.`,
      });
    }

    // Retry without history
    let retriedWithoutHistory = false;
    if (filtered.length === 0 && historySet.size > 0) {
      retriedWithoutHistory = true;
      filtered = filterProblems({
        problems,
        tags,
        minRating: effectiveMin,
        maxRating: effectiveMax,
        difficulty,
        filterSet,
        friendFilterMode,
        history: new Set(),
        excludeUserSolved: excludeSet,
        showOnlyUserSolved: showOnlySet,
        excludeUserSolvedSlugs: excludeSlugsSet,
        showOnlyUserSolvedSlugs: showOnlySlugsSet,
      });
    }

    if (filtered.length === 0) {
      return res.status(404).json({
        error: 'No problems found matching your filters.',
        suggestions: ['Broaden the rating/difficulty range', 'Remove some tag filters', 'Change or clear user filters'],
      });
    }

    const problem = pickRandom(filtered);
    res.json({
      problem: { ...problem, friendsSolvedCount: perProblem[problem.id] || 0 },
      meta: { totalMatched: filtered.length, retriedWithoutHistory, platform },
    });
  } catch (err) { next(err); }
});

/* ── POST /reattempt — fetch a specific problem by ID ── */
router.post('/reattempt', async (req, res, next) => {
  try {
    const { platform = 'codeforces', problemId } = req.body;

    if (!problemId) {
      return res.status(400).json({ error: 'problemId is required.' });
    }

    const problems = await loadProblems(platform);
    if (!problems) {
      return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }

    // Find the exact problem by its ID in the full problem pool
    // For LeetCode, support resolving 'lc-1', '1', or 'two-sum'
    const found = problems.find(p => {
      if (p.id === problemId) return true;
      if (platform === 'leetcode') {
        if (p.id === `lc-${problemId}`) return true;
        if (p.questionId === String(problemId)) return true;
        if (p.titleSlug === problemId) return true;
      }
      return false;
    });

    if (!found) {
      return res.status(404).json({
        error: `Problem "${problemId}" not found on ${platform}.`,
        notFound: true,
      });
    }

    res.json({
      problem: { ...found, platform },
      meta: { isReattempt: true, platform },
    });
  } catch (err) { next(err); }
});

/* ── POST /daily — deterministic daily problem ── */
router.post('/daily', async (req, res, next) => {
  try {
    const { platform = 'codeforces', tags = [], minRating = 1000, maxRating = 1800, difficulty } = req.body;
    const problems = await loadProblems(platform);
    if (!problems) return res.status(400).json({ error: `Unknown platform: ${platform}` });

    const filtered = filterProblems({
      problems,
      tags,
      minRating: platform === 'codeforces' ? minRating : undefined,
      maxRating: platform === 'codeforces' ? maxRating : undefined,
      difficulty: platform !== 'codeforces' ? difficulty : undefined,
    });

    if (!filtered.length) return res.status(404).json({ error: 'No daily problem found.' });

    const today = new Date().toISOString().slice(0, 10);
    const seed  = today.split('-').reduce((a, n) => a + parseInt(n, 10), 0);
    res.json({ problem: filtered[seed % filtered.length], date: today, meta: { totalMatched: filtered.length } });
  } catch (err) { next(err); }
});

/* ── GET /tags ── */
router.get('/tags', async (req, res, next) => {
  try {
    const { platform = 'codeforces' } = req.query;
    const svc = {
      codeforces: require('../services/codeforcesService'),
      leetcode: require('../services/leetcodeService'),
      gfg: require('../services/gfgService'),
    }[platform];
    if (!svc) return res.status(400).json({ error: 'Unknown platform' });
    res.json({ platform, tags: await svc.getAllTags() });
  } catch (err) { next(err); }
});

module.exports = router;
