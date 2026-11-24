/**
 * Per-friend Codeforces status (solved / attempted sets), cached.
 * Uses the public `user.status` endpoint. Codeforces asks for ≤ 1 request / 2 s, so requests go through one queue.
 * A failing handle never breaks a pick: it is reported in `failed` and skipped.
 */
const axios = require('axios');

const CF = process.env.CODEFORCES_API_BASE || 'https://codeforces.com/api';
const TTL_MS = (parseInt(process.env.FRIENDS_CACHE_TTL_SECONDS, 10) || 600) * 1000;
const GAP_MS = parseInt(process.env.CF_REQUEST_GAP_MS, 10) || 2100;
const IGNORED = new Set(['COMPILATION_ERROR', 'SKIPPED', 'TESTING', 'CHALLENGED']);   // not a real attempt on the problem

const cache = new Map();            // handle(lowercase) → { at, value }
let chain = Promise.resolve();      // serialises outbound calls
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const keyOf = (p) => `${p.contestId}-${p.index}`;           // same shape as the problem ids in the pool ("1234-A")

async function defaultFetch(handle) {
  const { data } = await axios.get(`${CF}/user.status`, { params: { handle, from: 1, count: 100000 }, timeout: 15000 });
  if (data.status !== 'OK') throw new Error(data.comment || 'Codeforces error');
  return data.result;
}

/** submissions → { solved:Set, attempted:Set } */
function summarize(subs) {
  const solved = new Set(), attempted = new Set();
  for (const s of subs) {
    if (!s.problem || s.problem.contestId === undefined) continue;
    if (IGNORED.has(s.verdict)) continue;
    const id = keyOf(s.problem);
    attempted.add(id);
    if (s.verdict === 'OK') solved.add(id);
  }
  return { solved, attempted };
}

function load(handle, fetchSubs) {
  const k = handle.toLowerCase(), hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  const run = chain.then(async () => {
    try {
      const value = { handle, ...summarize(await fetchSubs(handle)) };
      cache.set(k, { at: Date.now(), value });
      await sleep(GAP_MS);
      return value;
    } catch (err) {
      await sleep(GAP_MS);
      if (hit) return hit.value;                // stale beats nothing
      throw err;
    }
  });
  chain = run.catch(() => {});
  return run;
}

/** @returns {{ friends: Array<{handle, solved:Set, attempted:Set}>, failed: string[] }} */
async function getFriendsStatus(handles, { fetchSubs = defaultFetch } = {}) {
  const uniq = [...new Set(handles.map((h) => String(h).trim()).filter(Boolean))].slice(0, 25);
  const results = await Promise.allSettled(uniq.map((h) => load(h, fetchSubs)));
  const friends = [], failed = [];
  results.forEach((r, i) => (r.status === 'fulfilled' ? friends.push(r.value) : failed.push(uniq[i])));
  return { friends, failed };
}

module.exports = { getFriendsStatus, summarize, _cache: cache };
