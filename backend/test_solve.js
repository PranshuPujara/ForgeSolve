const assert = require('assert');
const axios = require('axios');
let reply;
axios.get = async (url, opts) => reply(url, opts);
const express = require('express');
const app = express(); app.use('/api/solve', require('./routes/solve'));
const srv = app.listen(0, async () => {
  const base = `http://127.0.0.1:${srv.address().port}/api/solve/check`;
  const get = async q => { const r = await fetch(`${base}?${new URLSearchParams(q)}`); return [r.status, await r.json()]; };
  const cf = (subs) => (u) => ({ data: { status: 'OK', result: subs } });
  const sub = (v, c, i, t) => ({ verdict: v, problem: { contestId: c, index: i }, creationTimeSeconds: t });
  try {
    reply = cf([sub('WRONG_ANSWER', 1900, 'A', 2000), sub('OK', 1900, 'A', 2100)]);
    assert.deepStrictEqual(await get({ platform: 'codeforces', handle: 'tourist', since: 1000, contestId: 1900, index: 'A' }), [200, { accepted: true, submittedAt: 2100, attempts: 1, lastVerdict: 'WRONG_ANSWER' }]);
    reply = cf([sub('WRONG_ANSWER', 1900, 'A', 2000)]);
    assert.deepStrictEqual((await get({ platform: 'codeforces', handle: 'tourist', since: 1000, contestId: 1900, index: 'A' }))[1], { accepted: false, attempts: 1, lastVerdict: 'WRONG_ANSWER' });
    reply = cf([sub('OK', 1900, 'A', 500)]);   // solved long ago, before the session
    assert.strictEqual((await get({ platform: 'codeforces', handle: 'tourist', since: 1000, contestId: 1900, index: 'A' }))[1].accepted, false);
    reply = cf([sub('OK', 1900, 'B', 2000)]);  // different problem
    assert.strictEqual((await get({ platform: 'codeforces', handle: 'tourist', since: 1000, problemId: '1900-A' }))[1].accepted, false);
    reply = cf([sub('OK', 1900, 'A', 2000)]);  // problemId fallback parsing
    assert.strictEqual((await get({ platform: 'codeforces', handle: 'tourist', since: 1000, problemId: '1900-A' }))[1].accepted, true);
    // attempts: only judged failures for THIS problem inside the session; CE / other problems / old runs don't count
    reply = cf([sub('TIME_LIMIT_EXCEEDED', 1900, 'A', 3000), sub('COMPILATION_ERROR', 1900, 'A', 2900), sub('WRONG_ANSWER', 1900, 'B', 2800),
                sub('RUNTIME_ERROR', 1900, 'A', 2000), sub('WRONG_ANSWER', 1900, 'A', 100)]);
    assert.deepStrictEqual((await get({ platform: 'codeforces', handle: 'tourist', since: 1000, contestId: 1900, index: 'A' }))[1], { accepted: false, attempts: 2, lastVerdict: 'TIME_LIMIT_EXCEEDED' });
    // failures AFTER the accepted run don't count
    reply = cf([sub('WRONG_ANSWER', 1900, 'A', 5000), sub('OK', 1900, 'A', 4000), sub('WRONG_ANSWER', 1900, 'A', 3000)]);
    assert.deepStrictEqual((await get({ platform: 'codeforces', handle: 'tourist', since: 1000, contestId: 1900, index: 'A' }))[1], { accepted: true, submittedAt: 4000, attempts: 1, lastVerdict: 'WRONG_ANSWER' });
    // codeforces upstream failure
    reply = () => ({ data: { status: 'FAILED', comment: 'handle: not found' } });
    assert.strictEqual((await get({ platform: 'codeforces', handle: 'tourist', since: 1000, contestId: 1900, index: 'A' }))[0], 502);
    reply = () => ({ data: { count: 2, submission: [{ titleSlug: 'two-sum', timestamp: '3000' }, { titleSlug: 'add-two-numbers', timestamp: '2900' }] } });
    assert.deepStrictEqual(await get({ platform: 'leetcode', handle: 'neal_wu', since: 2500, slug: 'two-sum' }), [200, { accepted: true, submittedAt: 3000 }]);
    assert.strictEqual((await get({ platform: 'leetcode', handle: 'neal_wu', since: 3500, slug: 'two-sum' }))[1].accepted, false);
    assert.strictEqual((await get({ platform: 'leetcode', handle: 'neal_wu', since: 1, slug: 'zigzag' }))[1].accepted, false);
    assert.strictEqual((await get({ platform: 'leetcode', handle: '../etc', since: 1, slug: 'x' }))[0], 400);
    assert.strictEqual((await get({ platform: 'gfg', handle: 'a', since: 1 }))[0], 400);
    reply = () => { const e = new Error('x'); e.response = { status: 404 }; throw e; };
    assert.strictEqual((await get({ platform: 'leetcode', handle: 'nobody_zz', since: 1, slug: 'two-sum' }))[0], 404);
    console.log('ALL CHECKS PASSED');
  } catch (e) { console.error('FAIL', e); process.exitCode = 1; } finally { srv.close(); }
});
