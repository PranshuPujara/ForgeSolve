const express = require('express');
const router  = express.Router();

const { getAllProblems: getCFProblems }  = require('../services/codeforcesService');
const { getAllProblems: getLCProblems }  = require('../services/leetcodeService');
const { getAllProblems: getGFGProblems } = require('../services/gfgService');
const { getFriendsStatus }              = require('../services/friendsService');
const { filterProblems }                = require('../utils/filterEngine');
const { pickRandom }                    = require('../utils/random');
const FP                                = require('../utils/friendPick');

/* ── Helper: load problem pool by platform ─────── */
async function loadProblems(platform) {
  if (platform === 'codeforces') return getCFProblems();
  if (platform === 'leetcode')   return getLCProblems();
  if (platform === 'gfg')        return getGFGProblems();
  return null;
}

/* ── POST /pick — random problem matching filters (+ friend modes) ──
   filterMode: none | catchup | solved | stuck   (legacy 'unsolved' = stuck)   — see utils/friendPick.js
   userHandle (optional): the user's own CF handle; needed by `catchup` to hide what they already solved. */
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
      userHandle,
      // Codeforces user handle filtering (arrays of problem IDs)
      excludeUserSolved  = [],
      showOnlyUserSolved = [],
      // LeetCode user handle filtering (arrays of titleSlugs)
      excludeUserSolvedSlugs = [],
      showOnlyUserSolvedSlugs = [],
    } = req.body;

    const problems = await loadProblems(platform);
    if (!problems) return res.status(400).json({ error: `Unknown platform: ${platform}` });

    const mode = ignoreFilterMode ? 'none' : FP.normalizeMode(filterMode);
    const wantsFriends = platform === 'codeforces' && mode !== 'none' && friendHandles.length > 0;

    /* friend data: one entry per friend (solved / attempted), so "stuck" is judged per friend */
    let index = null, mine = null, failed = [], needsHandle = false;
    if (wantsFriends) {
      const fs = await getFriendsStatus(friendHandles);
      failed = fs.failed;
      if (!fs.friends.length) {
        return res.status(502).json({
          friendsUnavailable: true,
          failed,
          error: "Couldn't read your friends' Codeforces activity right now. Try again in a minute, or pick without the friend filter.",
        });
      }
      index = FP.buildIndex(fs.friends);
      if (mode === 'catchup') {
        mine = new Set(excludeUserSolved);                       // already sent by the client when "exclude solved" is on
        if (userHandle) {
          const me = await getFriendsStatus([userHandle]);
          if (me.friends[0]) me.friends[0].solved.forEach((id) => mine.add(id));
        }
        if (mine.size === 0) needsHandle = true;                // can't tell what I solved → behaves like "friends solved"
      }
    }

    /* smart mode bump */
    let effectiveMin = minRating, effectiveMax = maxRating;
    if (platform === 'codeforces') {
      if (smartMode && lastRating) {
        effectiveMin = lastRating + 100;
        effectiveMax = lastRating + 400;
      }
    } else {
      effectiveMin = undefined;
      effectiveMax = undefined;
    }

    const historySet = new Set(history);
    const excludeSet = new Set(excludeUserSolved);
    const showOnlySet = new Set(showOnlyUserSolved);
    const excludeSlugsSet  = new Set(excludeUserSolvedSlugs);
    const showOnlySlugsSet = new Set(showOnlyUserSolvedSlugs);
    const pad = (v, d) => (typeof v === 'number' ? v + d : v);

    /* one query = the user's filters, optionally loosened; friend rule applied afterwards (filterEngine stays untouched) */
    const run = (q) => {
      const base = filterProblems({
        problems,
        tags: q.dropTags ? [] : tags,
        minRating: pad(effectiveMin, -(q.ratingPad || 0)),
        maxRating: pad(effectiveMax, q.ratingPad || 0),
        difficulty,
        filterSet: new Set(),
        friendFilterMode: 'none',
        history: q.ignoreHistory ? new Set() : historySet,
        excludeUserSolved: excludeSet,
        showOnlyUserSolved: showOnlySet,
        excludeUserSolvedSlugs: excludeSlugsSet,
        showOnlyUserSolvedSlugs: showOnlySlugsSet,
      });
      return wantsFriends ? FP.applyMode(base, mode, index, mine) : base.map((problem) => ({ problem, count: 0 }));
    };

    let matches = run({}), applied = [];
    if (matches.length === 0) {
      const steps = FP.relaxSteps({
        hasHistory: historySet.size > 0,
        isCF: wantsFriends && platform === 'codeforces',
        hasTags: wantsFriends && tags.length > 0,
      });
      let q = {};
      for (let i = 0; i < steps.length && matches.length === 0; i++) {
        q = steps[i].apply(q);
        matches = run(q);
        if (matches.length) applied = steps.slice(0, i + 1);
      }
    }

    if (matches.length === 0) {
      if (wantsFriends) {
        return res.status(404).json({
          noFriendMatch: true,
          filterMode: mode,
          failed,
          error: `No problems match your filters AND the "${mode}" friend filter, even after loosening them.`,
        });
      }
      return res.status(404).json({
        error: 'No problems found matching your filters.',
        suggestions: ['Broaden the rating range', 'Remove some tag filters', 'Change the filter mode'],
      });
    }

    const chosen = wantsFriends ? FP.weightedPick(matches) : { problem: pickRandom(matches.map((m) => m.problem)) };
    const problem = chosen.problem;
    res.json({
      problem: {
        ...problem,
        friendsSolvedCount: index ? (index.solvedBy.get(problem.id) || 0) : 0,
        friendsStuckCount:  index ? (index.stuckBy.get(problem.id) || 0) : 0,
        friendsSolvedBy:    index ? (index.solvers.get(problem.id) || []).slice(0, 5) : [],
      },
      meta: {
        totalMatched: matches.length,
        platform,
        retriedWithoutHistory: applied.some((s) => s.key === 'history'),
        friend: wantsFriends ? {
          mode,
          relaxed: applied.map((s) => s.note),
          message: FP.describeRelax(applied),
          failed,
          needsHandle,
        } : undefined,
      },
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
