const express = require('express');
const router = express.Router();
const {
  getAllProblems,
  refreshProblems,
  getAllTags,
  getUserSolvedSlugs,
  getUserStats,
} = require('../services/leetcodeService');

// NOTE: No separate rate-limiter here — the global limiter in server.js (120 req/min)
// already covers all /api/* routes per real client IP.  Adding a second limiter was
// causing double-counting, and when trust-proxy wasn't resolving correctly every user
// on Render shared one IP bucket and hit the 30-req cap almost instantly.

// GET /api/leetcode/tags
router.get('/tags', async (req, res, next) => {
  try {
    const tags = await getAllTags();
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

// GET /api/leetcode/user/:username/solved
router.get('/user/:username/solved', async (req, res, next) => {
  try {
    const { username } = req.params;
    const solvedSet = await getUserSolvedSlugs(username);
    const solvedSlugs = Array.from(solvedSet);
    res.json({
      username,
      solvedCount: solvedSlugs.length,
      solvedSlugs,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/leetcode/user/:username/stats
router.get('/user/:username/stats', async (req, res, next) => {
  try {
    const { username } = req.params;
    const stats = await getUserStats(username);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/leetcode/status
router.get('/status', async (req, res, next) => {
  try {
    const problems = await getAllProblems();
    res.json({
      platform: 'leetcode',
      totalProblems: problems.length,
      mode: process.env.LEETCODE_USE_STATIC === 'true' ? 'static' : (problems.length < 500 ? 'fallback-static' : 'live'),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/leetcode/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const problems = await refreshProblems();
    res.json({
      success: true,
      totalProblems: problems.length,
      mode: process.env.LEETCODE_USE_STATIC === 'true' ? 'static' : (problems.length < 500 ? 'fallback-static' : 'live'),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
