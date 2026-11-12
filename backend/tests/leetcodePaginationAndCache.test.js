const test = require('node:test');
const assert = require('node:assert');
const cache = require('../utils/cache');
const { filterProblems } = require('../utils/filterEngine');
const {
  getAllProblems,
  refreshProblems,
  STATIC_PROBLEMS,
} = require('../services/leetcodeService');

// Helper to create mock problemset
function generateMockProblems(count = 1000) {
  const diffs = ['easy', 'medium', 'hard'];
  const tagList = ['array', 'dynamic programming', 'string', 'tree', 'hash table', 'math'];
  const list = [];
  for (let i = 1; i <= count; i++) {
    const diff = diffs[i % 3];
    const tags = [tagList[i % tagList.length]];
    if (i % 2 === 0) tags.push('array');
    list.push({
      id: `lc-${i}`,
      questionId: String(i),
      titleSlug: `problem-${i}`,
      name: `Problem ${i}`,
      difficulty: diff,
      tags,
      url: `https://leetcode.com/problems/problem-${i}/`,
      platform: 'leetcode',
      rating: null,
      solvedCount: 0,
      isPaidOnly: false,
    });
  }
  return list;
}

test('Scenario 1: LeetCode + Array + Medium filtering', () => {
  const problems = generateMockProblems(1200);
  const filtered = filterProblems({
    problems,
    difficulty: 'medium',
    tags: ['array'],
  });

  assert.ok(filtered.length > 0, 'Should match multiple problems');
  filtered.forEach(p => {
    assert.strictEqual(p.difficulty, 'medium');
    assert.ok(p.tags.includes('array'), `Problem ${p.id} must have array tag`);
  });
});

test('Scenario 2: LeetCode + Array + Easy filtering', () => {
  const problems = generateMockProblems(1200);
  const filtered = filterProblems({
    problems,
    difficulty: 'easy',
    tags: ['array'],
  });

  assert.ok(filtered.length > 0, 'Should match easy array problems');
  filtered.forEach(p => {
    assert.strictEqual(p.difficulty, 'easy');
    assert.ok(p.tags.includes('array'), `Problem ${p.id} must have array tag`);
  });
});

test('Scenario 3: LeetCode + Array + Hard filtering', () => {
  const problems = generateMockProblems(1200);
  const filtered = filterProblems({
    problems,
    difficulty: 'hard',
    tags: ['array'],
  });

  assert.ok(filtered.length > 0, 'Should match hard array problems');
  filtered.forEach(p => {
    assert.strictEqual(p.difficulty, 'hard');
    assert.ok(p.tags.includes('array'), `Problem ${p.id} must have array tag`);
  });
});

test('Scenario 4: LeetCode + multiple tags (OR logic)', () => {
  const problems = generateMockProblems(1200);
  const filtered = filterProblems({
    problems,
    difficulty: 'medium',
    tags: ['dynamic programming', 'tree'],
  });

  assert.ok(filtered.length > 0);
  filtered.forEach(p => {
    assert.strictEqual(p.difficulty, 'medium');
    const hasTag = p.tags.includes('dynamic programming') || p.tags.includes('tree');
    assert.ok(hasTag, `Problem ${p.id} must match at least one selected tag`);
  });
});

test('Scenario 5: LeetCode without any tag filters', () => {
  const problems = generateMockProblems(1200);
  const filtered = filterProblems({
    problems,
    difficulty: 'medium',
    tags: [],
  });

  const expectedMediums = problems.filter(p => p.difficulty === 'medium').length;
  assert.strictEqual(filtered.length, expectedMediums);
});

test('Scenario 6: Repeated requests verify in-memory caching', async () => {
  const mockDataset = generateMockProblems(600);
  cache.set('leetcode_problemset', mockDataset, 3600);

  const res1 = await getAllProblems();
  const res2 = await getAllProblems();

  assert.strictEqual(res1, mockDataset, 'First call should return cached dataset');
  assert.strictEqual(res2, mockDataset, 'Second call should return identical cached dataset reference');
  cache.del('leetcode_problemset');
});

test('Scenario 7: Cache preserves valid complete dataset on failed live fetch', async () => {
  const validDataset = generateMockProblems(800);
  cache.set('leetcode_problemset', validDataset, 3600);

  // In test environment, live fetch fails immediately
  // getAllProblems should return the existing valid dataset without overwriting
  const result = await getAllProblems();
  assert.strictEqual(result.length, 800, 'Should preserve the 800 cached problems');
  cache.del('leetcode_problemset');
});

test('Scenario 8: Empty cache falls back gracefully to a complete snapshot with short TTL', async () => {
  cache.del('leetcode_problemset');

  // In test environment without network, live fetch fails and the bundled snapshot is used.
  const result = await getAllProblems();
  assert.ok(result.length >= STATIC_PROBLEMS.length, 'Fallback must never be smaller than the curated list');
  assert.ok(result.length >= 500, 'Fallback should be the complete bundled snapshot when available');
  assert.strictEqual(result[0].id, 'lc-1');
  cache.del('leetcode_problemset');
});

test('Scenario 9: getAllTags returns official tags sorted by question count and excludes nonexistent tags', async () => {
  const problems = generateMockProblems(600);
  cache.set('leetcode_problemset', problems, 3600);

  const { getAllTags } = require('../services/leetcodeService');
  const tags = await getAllTags();

  assert.ok(tags.length > 0, 'Tags must not be empty');
  // 'array' was assigned to half the problems, so it must be first
  assert.strictEqual(tags[0], 'array', 'Most frequent tag must be first');
  // 'heap' (duplicate) should not be present
  assert.strictEqual(tags.includes('heap'), false, "Redundant 'heap' must be excluded in favor of 'heap (priority queue)'");
  cache.del('leetcode_problemset');
});

