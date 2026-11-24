/**
 * Friend-aware problem selection — pure functions, no I/O (unit-tested in test_friendpick.js).
 *
 * Vocabulary (per Codeforces problem id "1234-A"):
 *   solvedBy  = how many of the friends have an accepted (OK) submission
 *   stuckBy   = how many of the friends have submitted it but never got OK   ("a friend is stuck on it")
 *
 * Modes (what the Filter Mode control sends as `filterMode`):
 *   none      no friend filtering
 *   catchup   at least one friend solved it AND I have not           ("friends solved, I haven't")
 *   solved    at least one friend solved it (whether or not I did)   ("friends solved")
 *   stuck     at least one friend is stuck on it                     ("any one friend stuck too")
 *   unsolved  legacy value saved by older builds → treated as `stuck`
 *
 * Friends combine with ANY semantics: one matching friend is enough.
 */

const MODES = ['none', 'catchup', 'solved', 'stuck'];
const normalizeMode = (m) => (m === 'unsolved' ? 'stuck' : MODES.includes(m) ? m : 'none');

/** friends: [{ handle, solved:Set<string>, attempted:Set<string> }]  (attempted ⊇ solved) */
function buildIndex(friends) {
  const solvedBy = new Map(), stuckBy = new Map(), solvers = new Map();
  for (const f of friends) {
    for (const id of f.solved) {
      solvedBy.set(id, (solvedBy.get(id) || 0) + 1);
      const list = solvers.get(id) || []; list.push(f.handle); solvers.set(id, list);
    }
    for (const id of f.attempted) {
      if (!f.solved.has(id)) stuckBy.set(id, (stuckBy.get(id) || 0) + 1);
    }
  }
  return { solvedBy, stuckBy, solvers };
}

/** How many friends "count" for this problem in this mode (0 = does not match). */
function friendCount(mode, id, index, mine) {
  if (mode === 'stuck') return index.stuckBy.get(id) || 0;
  const n = index.solvedBy.get(id) || 0;
  if (mode === 'catchup') return mine && mine.has(id) ? 0 : n;
  if (mode === 'solved') return n;
  return 0;
}

/** Keep only matching problems; returns [{ problem, count }]. */
function applyMode(problems, mode, index, mine) {
  if (mode === 'none') return problems.map((problem) => ({ problem, count: 0 }));
  const out = [];
  for (const problem of problems) {
    const count = friendCount(mode, problem.id, index, mine);
    if (count > 0) out.push({ problem, count });
  }
  return out;
}

/** Weighted random choice: weight = count ^ power (power 1 = linear in the number of friends). */
function weightedPick(items, rnd = Math.random, power = 1) {
  if (!items.length) return null;
  const w = items.map((it) => Math.pow(Math.max(1, it.count || 1), power));
  const total = w.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < items.length; i++) { r -= w[i]; if (r < 0) return items[i]; }
  return items[items.length - 1];
}

/**
 * Relaxation ladder used when the friend filter leaves nothing. Each step is a function of the original query → a looser query,
 * plus a human line the UI shows. The friend mode itself is never dropped here (the route's 404 + "suggest anyway" handles that).
 */
function relaxSteps({ hasHistory, isCF, hasTags }) {
  const steps = [];
  if (hasHistory) steps.push({ key: 'history', note: 'ignored your pick history', apply: (q) => ({ ...q, ignoreHistory: true }) });
  if (isCF) {
    steps.push({ key: 'rating200', note: 'widened the rating range by ±200', apply: (q) => ({ ...q, ratingPad: 200 }) });
    steps.push({ key: 'rating400', note: 'widened the rating range by ±400', apply: (q) => ({ ...q, ratingPad: 400 }) });
  }
  if (hasTags) steps.push({ key: 'tags', note: 'dropped the tag filter', apply: (q) => ({ ...q, dropTags: true }) });
  return steps;
}

/** Message the UI shows for the notes accumulated so far (cumulative: step N includes steps 1..N). */
const describeRelax = (steps) => (steps.length ? `Nothing matched exactly, so I ${steps.map((s) => s.note).join(' and ')}.` : null);

module.exports = { MODES, normalizeMode, buildIndex, friendCount, applyMode, weightedPick, relaxSteps, describeRelax };
