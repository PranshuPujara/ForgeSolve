const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { getAllProblems, getAllTags, STATIC_PROBLEMS } = require('../services/leetcodeService');
const { filterProblems } = require('../utils/filterEngine');

test('Check 1: Static problems have canonical shape and deduplicated IDs', () => {
  const ids = new Set();
  STATIC_PROBLEMS.forEach(p => {
    assert.ok(p.id.startsWith('lc-'), `ID must start with lc-: ${p.id}`);
    assert.ok(p.questionId, `questionId missing in ${p.id}`);
    assert.ok(p.titleSlug, `titleSlug missing in ${p.id}`);
    assert.ok(p.name, `name missing in ${p.id}`);
    assert.ok(['easy', 'medium', 'hard'].includes(p.difficulty), `Invalid difficulty: ${p.difficulty}`);
    assert.strictEqual(p.platform, 'leetcode');
    assert.strictEqual(p.rating, null);
    assert.strictEqual(p.isPaidOnly, false);
    assert.strictEqual(ids.has(p.id), false, `Duplicate ID found: ${p.id}`);
    ids.add(p.id);
  });
});

test('Check 2: Clone Graph has corrected id lc-133', () => {
  const cloneGraph = STATIC_PROBLEMS.find(p => p.name === 'Clone Graph');
  assert.ok(cloneGraph);
  assert.strictEqual(cloneGraph.id, 'lc-133');
  assert.strictEqual(cloneGraph.questionId, '133');
  assert.strictEqual(cloneGraph.titleSlug, 'clone-graph');
});

test('Check 3: LC excludeUserSolvedSlugs over 50 iterations never returns excluded slug', async () => {
  const problems = await getAllProblems();
  for (let i = 0; i < 50; i++) {
    const filtered = filterProblems({
      problems,
      difficulty: 'easy',
      excludeUserSolvedSlugs: new Set(['two-sum']),
    });
    const found = filtered.find(p => p.titleSlug === 'two-sum');
    assert.strictEqual(found, undefined, 'two-sum must never be returned when excluded');
  }
});

test('Check 4: Codeforces pick payload works unchanged', () => {
  const cfProblems = [
    { id: '1000-A', rating: 1200, tags: ['greedy'], difficulty: 'easy', platform: 'codeforces' },
    { id: '1000-B', rating: 1600, tags: ['dp'], difficulty: 'medium', platform: 'codeforces' },
  ];
  const filtered = filterProblems({
    problems: cfProblems,
    minRating: 1100,
    maxRating: 1400,
    tags: ['greedy'],
  });
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, '1000-A');
});
