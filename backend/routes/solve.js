const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const router = express.Router();

/**
 * GET /api/solve/check
 *   platform=codeforces&handle=H&since=<unix s>&contestId=1900&index=A
 *   platform=leetcode&handle=H&since=<unix s>&slug=two-sum
 * → { accepted: boolean, submittedAt?: unix seconds, attempts?: number, lastVerdict?: string }
 *   attempts = failed judged submissions for this problem since `since` (Codeforces only; LeetCode's
 *   accepted-only endpoint cannot see failures). It drives the "wrong answer" flinch + time penalty.
 * Never cached: the frontend polls this while a problem is being "forged".
 */
const limiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many checks — slow down.' } });

const HANDLE_RE = /^[A-Za-z0-9_.-]{1,40}$/;
const LC_BASE = () => process.env.LEETCODE_API_BASE_URL || 'http://localhost:3001';

async function checkCodeforces({ handle, since, contestId, index }) {
  const { data } = await axios.get('https://codeforces.com/api/user.status', {
    params: { handle, from: 1, count: 30 }, timeout: 10000,
  });
  if (data.status !== 'OK') { const e = new Error(data.comment || 'Codeforces error'); e.status = 502; throw e; }
  const same = s => String(s.problem.contestId) === String(contestId) && String(s.problem.index) === String(index)
    && s.creationTimeSeconds >= since;
  const hit = data.result.find(s => s.verdict === 'OK' && same(s));
  // Failed = judged and not OK. Compile errors / still-testing / skipped don't count against the smith.
  const IGNORE = new Set(['OK', 'COMPILATION_ERROR', 'TESTING', 'SKIPPED', 'CHALLENGED', 'PARTIAL']);
  const fails = data.result.filter(s => same(s) && s.verdict && !IGNORE.has(s.verdict)
    && (!hit || s.creationTimeSeconds <= hit.creationTimeSeconds));
  const extra = fails.length ? { attempts: fails.length, lastVerdict: fails[0].verdict } : { attempts: 0 };
  return hit ? { accepted: true, submittedAt: hit.creationTimeSeconds, ...extra } : { accepted: false, ...extra };
}

async function checkLeetCode({ handle, since, slug }) {
  if (process.env.LEETCODE_USE_STATIC === 'true') { const e = new Error('Auto-detect needs the live LeetCode API'); e.status = 503; throw e; }
  const { data } = await axios.get(`${LC_BASE()}/${encodeURIComponent(handle)}/acSubmission`, { params: { limit: 20 }, timeout: 10000 });
  const list = Array.isArray(data?.submission) ? data.submission : Array.isArray(data) ? data : [];
  const hit = list.find(s => s.titleSlug === slug && Number(s.timestamp) >= since);
  return hit ? { accepted: true, submittedAt: Number(hit.timestamp) } : { accepted: false };
}

router.get('/check', limiter, async (req, res, next) => {
  try {
    const { platform, handle, since: sinceRaw, contestId, index, slug, problemId } = req.query;
    const since = parseInt(sinceRaw, 10);
    if (!handle || !HANDLE_RE.test(handle) || !Number.isFinite(since)) return res.status(400).json({ error: 'handle and since are required' });
    res.set('Cache-Control', 'no-store');

    if (platform === 'codeforces') {
      let cid = contestId, idx = index;
      if ((!cid || !idx) && problemId) { const i = String(problemId).lastIndexOf('-'); cid = problemId.slice(0, i); idx = problemId.slice(i + 1); }
      if (!cid || !idx) return res.status(400).json({ error: 'contestId and index are required' });
      return res.json(await checkCodeforces({ handle, since, contestId: cid, index: idx }));
    }
    if (platform === 'leetcode') {
      if (!slug) return res.status(400).json({ error: 'slug is required' });
      return res.json(await checkLeetCode({ handle, since, slug }));
    }
    return res.status(400).json({ error: 'Auto-detect is not available for this platform' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.response) return res.status(err.response.status === 404 ? 404 : 502).json({ error: err.response.status === 404 ? 'User not found' : 'Upstream error' });
    next(err);
  }
});

module.exports = router;
module.exports._internal = { checkCodeforces, checkLeetCode };
