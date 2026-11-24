// node test_friendpick.js   — zero-dependency tests for the friend-aware picker (pure logic, service, and the route with stubbed upstreams)
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const FP = require('./utils/friendPick');
const FS = require('./services/friendsService');
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ✓', name); };
const S = (...a) => new Set(a);

(async () => {
  const friends = [
    { handle: 'a', solved: S('1-A', '2-A'), attempted: S('1-A', '2-A', '3-A') },     // stuck on 3-A
    { handle: 'b', solved: S('1-A', '4-A'), attempted: S('1-A', '4-A', '2-A') },     // stuck on 2-A (a solved it!)
    { handle: 'c', solved: S(), attempted: S('5-A') },                               // stuck on 5-A
  ];
  const ix = FP.buildIndex(friends);
  const P = (...ids) => ids.map((id) => ({ id }));
  const ids = (xs) => xs.map((x) => x.problem.id).sort();

  await t('index: solvedBy / stuckBy are judged per friend, not as unions', () => {
    assert.equal(ix.solvedBy.get('1-A'), 2); assert.equal(ix.solvedBy.get('2-A'), 1);
    assert.equal(ix.stuckBy.get('2-A'), 1, 'b is stuck on 2-A even though a solved it');
    assert.equal(ix.stuckBy.get('3-A'), 1); assert.equal(ix.stuckBy.get('5-A'), 1); assert.equal(ix.stuckBy.get('1-A') || 0, 0);
    assert.deepEqual(ix.solvers.get('1-A').sort(), ['a', 'b']);
  });

  await t('mode catchup: friends solved AND I have not', () => {
    assert.deepEqual(ids(FP.applyMode(P('1-A', '2-A', '3-A', '4-A', '9-Z'), 'catchup', ix, S('2-A'))), ['1-A', '4-A']);
  });
  await t('mode catchup without knowing my solves behaves like "solved"', () => {
    assert.deepEqual(ids(FP.applyMode(P('1-A', '3-A', '4-A'), 'catchup', ix, null)), ['1-A', '4-A']);
  });
  await t('mode solved: any friend solved it, regardless of me', () => {
    assert.deepEqual(ids(FP.applyMode(P('1-A', '2-A', '3-A', '5-A'), 'solved', ix, S('1-A'))), ['1-A', '2-A']);
  });
  await t('mode stuck: at least one friend submitted but never got OK', () => {
    assert.deepEqual(ids(FP.applyMode(P('1-A', '2-A', '3-A', '4-A', '5-A'), 'stuck', ix, null)), ['2-A', '3-A', '5-A']);
  });
  await t('legacy "unsolved" maps to stuck; unknown modes fall back to none', () => {
    assert.equal(FP.normalizeMode('unsolved'), 'stuck'); assert.equal(FP.normalizeMode('wat'), 'none'); assert.equal(FP.normalizeMode(undefined), 'none');
    assert.equal(FP.applyMode(P('x'), 'none', ix, null).length, 1);
  });

  await t('weightedPick: probability follows the friend count (statistical, seeded)', () => {
    const items = [{ problem: 'one', count: 1 }, { problem: 'three', count: 3 }];
    let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const c = { one: 0, three: 0 }; for (let i = 0; i < 20000; i++) c[FP.weightedPick(items, rnd).problem]++;
    assert.ok(Math.abs(c.three / 20000 - 0.75) < 0.02, JSON.stringify(c));
    assert.equal(FP.weightedPick([], rnd), null);
    assert.equal(FP.weightedPick([{ problem: 'x', count: 0 }], () => 0.99).problem, 'x', 'zero counts are still pickable (weight ≥ 1)');
  });

  await t('relax ladder: history → ±200 → ±400 → tags; friend mode is never dropped; messages are cumulative', () => {
    const st = FP.relaxSteps({ hasHistory: true, isCF: true, hasTags: true });
    assert.deepEqual(st.map((s) => s.key), ['history', 'rating200', 'rating400', 'tags']);
    let q = {}; for (const s of st) q = s.apply(q);
    assert.deepEqual(q, { ignoreHistory: true, ratingPad: 400, dropTags: true });
    assert.equal(FP.relaxSteps({ hasHistory: false, isCF: false, hasTags: false }).length, 0);
    assert.match(FP.describeRelax(st.slice(0, 2)), /ignored your pick history and widened the rating range by ±200/);
    assert.equal(FP.describeRelax([]), null);
  });

  await t('service: summarize ignores compile errors/testing, counts OK as solved, keys are "contest-index"', () => {
    const r = FS.summarize([
      { problem: { contestId: 1, index: 'A' }, verdict: 'WRONG_ANSWER' }, { problem: { contestId: 1, index: 'A' }, verdict: 'OK' },
      { problem: { contestId: 2, index: 'B' }, verdict: 'WRONG_ANSWER' }, { problem: { contestId: 3, index: 'C' }, verdict: 'COMPILATION_ERROR' },
      { problem: { contestId: 4, index: 'D' }, verdict: 'TESTING' }, { problem: { index: 'E' }, verdict: 'OK' },
    ]);
    assert.deepEqual([...r.solved], ['1-A']); assert.deepEqual([...r.attempted].sort(), ['1-A', '2-B']);
  });
  await t('service: a failing handle is reported, the others still work; results are cached', async () => {
    process.env.CF_REQUEST_GAP_MS = '1';
    let calls = 0; const fetchSubs = async (h) => { calls++; if (h === 'bad') throw new Error('boom'); return [{ problem: { contestId: 7, index: 'A' }, verdict: 'OK' }]; };
    const r1 = await FS.getFriendsStatus(['good', 'bad', 'good'], { fetchSubs });
    assert.deepEqual(r1.failed, ['bad']); assert.equal(r1.friends.length, 1); assert.deepEqual([...r1.friends[0].solved], ['7-A']);
    const before = calls; await FS.getFriendsStatus(['good'], { fetchSubs }); assert.equal(calls, before, 'cache hit');
  });

  /* ── route, with every upstream stubbed ── */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-'));
  for (const d of ['routes', 'services', 'utils']) fs.mkdirSync(path.join(dir, d));
  fs.copyFileSync('routes/problems.js', path.join(dir, 'routes/problems.js'));
  fs.copyFileSync('utils/friendPick.js', path.join(dir, 'utils/friendPick.js'));
  fs.writeFileSync(path.join(dir, 'services/friendsService.js'), `
    const data = global.__FRIENDS;                                   // { handle: {solved:[], attempted:[]} | Error }
    exports.getFriendsStatus = async (hs) => { const friends = [], failed = []; for (const h of hs) { const d = data[h]; if (!d) failed.push(h); else friends.push({ handle: h, solved: new Set(d.solved), attempted: new Set(d.attempted) }); } return { friends, failed }; };`);
  const pool = []; for (let c = 1; c <= 40; c++) pool.push({ id: c + '-A', rating: 800 + c * 50, tags: c % 2 ? ['dp'] : ['math'], platform: 'codeforces' });
  fs.writeFileSync(path.join(dir, 'services/codeforcesService.js'), `exports.getAllProblems = async () => ${JSON.stringify(pool)}; exports.getAllTags = async () => []; `);
  for (const s of ['leetcode', 'gfg']) fs.writeFileSync(path.join(dir, `services/${s}Service.js`), 'exports.getAllProblems = async () => []; exports.getAllTags = async () => [];');
  fs.writeFileSync(path.join(dir, 'utils/random.js'), 'exports.pickRandom = (a) => a[0];');
  fs.writeFileSync(path.join(dir, 'utils/filterEngine.js'), `exports.filterProblems = ({ problems, tags, minRating, maxRating, history, excludeUserSolved, showOnlyUserSolved }) => problems.filter(p =>
    (!tags.length || tags.some(t => p.tags.includes(t))) && (minRating == null || p.rating >= minRating) && (maxRating == null || p.rating <= maxRating) &&
    !history.has('codeforces:' + p.id) && !history.has(p.id) && !excludeUserSolved.has(p.id) && (showOnlyUserSolved.size === 0 || showOnlyUserSolved.has(p.id)));`);
  fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(dir, 'node_modules'));
  const express = require(path.join(dir, 'node_modules/express'));
  global.__FRIENDS = {
    amy: { solved: ['3-A', '4-A'], attempted: ['3-A', '4-A', '5-A'] },
    bob: { solved: ['3-A'], attempted: ['3-A', '6-A'] },
  };
  const app = express(); app.use(express.json()); app.use('/', require(path.join(dir, 'routes/problems.js')));
  app.use((err, req, res, next) => res.status(500).json({ error: String(err) }));
  const server = http.createServer(app).listen(0); const port = server.address().port;
  const post = (body) => new Promise((resolve, reject) => { const r = http.request({ port, path: '/pick', method: 'POST', headers: { 'content-type': 'application/json' } }, (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) })); }); r.on('error', reject); r.end(JSON.stringify(body)); });
  const base = { platform: 'codeforces', friendHandles: ['amy', 'bob'], minRating: 800, maxRating: 3000 };

  await t('route catchup: only problems friends solved, minus mine; weighted pick returns counts + names', async () => {
    const r = await post({ ...base, filterMode: 'catchup', excludeUserSolved: ['3-A'] });
    assert.equal(r.status, 200); assert.equal(r.body.problem.id, '4-A'); assert.equal(r.body.problem.friendsSolvedCount, 1); assert.deepEqual(r.body.problem.friendsSolvedBy, ['amy']);
    assert.equal(r.body.meta.friend.mode, 'catchup'); assert.deepEqual(r.body.meta.friend.relaxed, []); assert.equal(r.body.meta.totalMatched, 1);
  });
  await t('route stuck: any friend stuck (amy on 5-A, bob on 6-A)', async () => {
    const r = await post({ ...base, filterMode: 'stuck' });
    assert.equal(r.status, 200); assert.ok(['5-A', '6-A'].includes(r.body.problem.id)); assert.equal(r.body.meta.totalMatched, 2); assert.equal(r.body.problem.friendsStuckCount, 1);
  });
  await t('route legacy "unsolved" still works (= stuck)', async () => {
    const r = await post({ ...base, filterMode: 'unsolved' }); assert.equal(r.status, 200); assert.equal(r.body.meta.friend.mode, 'stuck');
  });
  await t('route auto-relax: rating too narrow → widened, and the response says so', async () => {
    const r = await post({ ...base, filterMode: 'solved', minRating: 2900, maxRating: 3000 });       // 3-A=950, 4-A=1000 are far away
    assert.equal(r.status, 404, 'even ±400 cannot reach them → honest 404 with noFriendMatch'); assert.equal(r.body.noFriendMatch, true);
    const r2 = await post({ ...base, filterMode: 'solved', minRating: 1150, maxRating: 1200 });      // ±200 reaches 950–1000? 1150-200=950 ✔
    assert.equal(r2.status, 200); assert.deepEqual(r2.body.meta.friend.relaxed, ['widened the rating range by ±200']); assert.match(r2.body.meta.friend.message, /Nothing matched exactly/);
  });
  await t('route auto-relax: tags dropped last, history ignored first', async () => {
    const r = await post({ ...base, filterMode: 'solved', tags: ['math'], history: ['codeforces:3-A', 'codeforces:4-A'] });     // 3-A,4-A: 3 is dp (odd), 4 is math
    assert.equal(r.status, 200); assert.ok(r.body.meta.friend.relaxed.length >= 1);
  });
  await t('route: ignoreFilterMode (the "suggest anyway" button) bypasses friends entirely', async () => {
    const r = await post({ ...base, filterMode: 'stuck', ignoreFilterMode: true }); assert.equal(r.status, 200); assert.equal(r.body.meta.friend, undefined);
  });
  await t('route: all friend lookups failing → 502 with a clear message (never a fake empty result)', async () => {
    const r = await post({ ...base, friendHandles: ['ghost'], filterMode: 'solved' });
    assert.equal(r.status, 502); assert.equal(r.body.friendsUnavailable, true); assert.deepEqual(r.body.failed, ['ghost']);
  });
  await t('route: one friend failing is reported but the pick still works', async () => {
    const r = await post({ ...base, friendHandles: ['amy', 'ghost'], filterMode: 'solved' });
    assert.equal(r.status, 200); assert.deepEqual(r.body.meta.friend.failed, ['ghost']);
  });
  await t('route: mode none behaves like before (uniform pick, no friend meta)', async () => {
    const r = await post({ platform: 'codeforces', filterMode: 'none', minRating: 800, maxRating: 3000 }); assert.equal(r.status, 200); assert.equal(r.body.meta.friend, undefined); assert.equal(r.body.meta.totalMatched, 40);
  });

  server.close();
  console.log(`\nALL ${n} FRIEND-PICK TESTS PASSED`);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
