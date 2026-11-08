const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  getAllTags,
  getUserSolvedSlugs,
  getUserStats,
} = require('../services/leetcodeService');

// Modest rate limit (30 requests/min per IP) on /user/* endpoints
const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many user requests. Please slow down.' },
});

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
router.get('/user/:username/solved', userRateLimiter, async (req, res, next) => {
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
router.get('/user/:username/stats', userRateLimiter, async (req, res, next) => {
  try {
    const { username } = req.params;
    const stats = await getUserStats(username);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
