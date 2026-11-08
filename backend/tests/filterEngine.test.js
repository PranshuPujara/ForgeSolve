const test = require('node:test');
const assert = require('node:assert');
const { filterProblems } = require('../utils/filterEngine');

const mockProblems = [
  { id: 'lc-1', titleSlug: 'two-sum', name: 'Two Sum', difficulty: 'easy', tags: ['array', 'hash table'], platform: 'leetcode' },
  { id: 'lc-2', titleSlug: 'add-two-numbers', name: 'Add Two Numbers', difficulty: 'medium', tags: ['linked list', 'math'], platform: 'leetcode' },
  { id: 'lc-3', titleSlug: 'longest-substring', name: 'Longest Substring', difficulty: 'medium', tags: ['hash table', 'sliding window'], platform: 'leetcode' },
  { id: '1000-A', id_cf: '1000-A', name: 'CF Problem A', difficulty: 'easy', rating: 1200, tags: ['greedy'], platform: 'codeforces' },
  { id: '1000-B', id_cf: '1000-B', name: 'CF Problem B', difficulty: 'medium', rating: 1500, tags: ['dp'], platform: 'codeforces' },
];

test('Case 1: LC excludeUserSolvedSlugs removes matching slugs', () => {
  const result = filterProblems({
    problems: mockProblems,
    excludeUserSolvedSlugs: new Set(['two-sum']),
  });
  const slugs = result.map(p => p.titleSlug).filter(Boolean);
  assert.strictEqual(slugs.includes('two-sum'), false);
  assert.strictEqual(slugs.includes('add-two-numbers'), true);
});

test('Case 2: LC showOnlyUserSolvedSlugs includes only matching slugs', () => {
  const result = filterProblems({
    problems: mockProblems,
    showOnlyUserSolvedSlugs: new Set(['two-sum', 'add-two-numbers']),
  });
  const slugs = result.map(p => p.titleSlug).filter(Boolean);
  assert.deepStrictEqual(slugs.sort(), ['add-two-numbers', 'two-sum']);
  // CF problems with no titleSlug are excluded in showOnly LC mode
  assert.strictEqual(result.some(p => p.platform === 'codeforces'), false);
});

test('Case 3: Both showOnly and exclude provided -> show-only wins', () => {
  const result = filterProblems({
    problems: mockProblems,
    showOnlyUserSolvedSlugs: new Set(['two-sum', 'add-two-numbers']),
    excludeUserSolvedSlugs: new Set(['two-sum']), // should be ignored because show-only wins
  });
  const slugs = result.map(p => p.titleSlug).filter(Boolean);
  assert.strictEqual(slugs.includes('two-sum'), true);
  assert.strictEqual(slugs.includes('add-two-numbers'), true);
});

test('Case 4: Empty sets return original list untouched', () => {
  const result = filterProblems({
    problems: mockProblems,
    excludeUserSolvedSlugs: new Set(),
    showOnlyUserSolvedSlugs: new Set(),
  });
  assert.strictEqual(result.length, mockProblems.length);
});

test('Case 5: Codeforces filtering is completely unaffected', () => {
  const result = filterProblems({
    problems: mockProblems,
    minRating: 1100,
    maxRating: 1300,
    excludeUserSolved: new Set(['1000-B']),
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, '1000-A');
});

test('Case 6: Tags + LC excludeUserSolvedSlugs combination', () => {
  const result = filterProblems({
    problems: mockProblems,
    tags: ['hash table'],
    excludeUserSolvedSlugs: new Set(['two-sum']),
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].titleSlug, 'longest-substring');
});

test('Case 7: History interplay with LC user-solved filtering', () => {
  const result = filterProblems({
    problems: mockProblems,
    history: new Set(['lc-2']),
    excludeUserSolvedSlugs: new Set(['two-sum']),
  });
  const ids = result.map(p => p.id);
  assert.strictEqual(ids.includes('lc-1'), false); // excluded by LC slug
  assert.strictEqual(ids.includes('lc-2'), false); // excluded by history
  assert.strictEqual(ids.includes('lc-3'), true);
});
