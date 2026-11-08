/**
 * LeetCode service.
 * Supports self-hosted alfa-leetcode-api upstream with fallback to a curated static dataset.
 *
 * Upstream note:
 * LeetCode upstream GraphQL recentAcSubmissionList caps limit at 100;
 * alfa-leetcode-api honors up to limit=100.
 */

const axios = require('axios');
const cache = require('../utils/cache');

const PROBLEMS_CACHE_KEY = 'leetcode_problemset';
const USER_CACHE_PREFIX = 'lc:user:';
const STATS_CACHE_PREFIX = 'lc:stats:';

const STATIC_FALLBACK_TTL = 30; // seconds - short TTL on error so subsequent requests can retry live
const MIN_COMPLETE_DATASET_SIZE = 500; // safety threshold to ensure complete problemset

let inFlightFetchPromise = null;

// Official 73 LeetCode tags, ordered descending by official question count
// (nonexistent tags, typo duplicates like 'heap (1)', and non-LeetCode categories are removed)
const OFFICIAL_LEETCODE_TAGS = [
  'array',
  'string',
  'hash table',
  'math',
  'dynamic programming',
  'sorting',
  'greedy',
  'binary search',
  'depth-first search',
  'database',
  'bit manipulation',
  'matrix',
  'prefix sum',
  'tree',
  'two pointers',
  'breadth-first search',
  'heap (priority queue)',
  'simulation',
  'counting',
  'graph theory',
  'stack',
  'binary tree',
  'sliding window',
  'enumeration',
  'design',
  'backtracking',
  'number theory',
  'union-find',
  'segment tree',
  'linked list',
  'ordered set',
  'monotonic stack',
  'divide and conquer',
  'combinatorics',
  'trie',
  'queue',
  'bitmask',
  'binary indexed tree',
  'recursion',
  'hash function',
  'geometry',
  'memoization',
  'shortest path',
  'binary search tree',
  'topological sort',
  'string matching',
  'rolling hash',
  'game theory',
  'monotonic queue',
  'interactive',
  'data stream',
  'brainteaser',
  'merge sort',
  'minimax',
  'doubly-linked list',
  'randomized',
  'counting sort',
  'iterator',
  'concurrency',
  'suffix array',
  'quickselect',
  'sweep line',
  'probability and statistics',
  'minimum spanning tree',
  'bucket sort',
  'shell',
  'meet in the middle',
  'reservoir sampling',
  'eulerian circuit',
  'radix sort',
  'strongly connected component',
  'rejection sampling',
  'biconnected component',
];

const TAG_ALIASES = {
  'depth-first search': 'dfs',
  'dfs': 'depth-first search',
  'breadth-first search': 'bfs',
  'bfs': 'breadth-first search',
  'union-find': 'union find',
  'union find': 'union-find',
  'heap (priority queue)': 'heap',
  'heap': 'heap (priority queue)',
  'doubly-linked list': 'doubly linked list',
  'doubly linked list': 'doubly-linked list',
};

const getBaseUrl = () => process.env.LEETCODE_API_BASE_URL || 'http://localhost:3001';
const getCacheTtl = () => parseInt(process.env.LEETCODE_CACHE_TTL_SECONDS, 10) || 3600;
const getUserCacheTtl = () => parseInt(process.env.LEETCODE_USER_CACHE_TTL_SECONDS, 10) || 600;

function createHttpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// ── Curated static dataset (normalized to canonical shape) ────────
const STATIC_PROBLEMS = [
  // Easy
  { id: 'lc-1', questionId: '1', titleSlug: 'two-sum', name: 'Two Sum', difficulty: 'easy', tags: ['array', 'hash table'], url: 'https://leetcode.com/problems/two-sum/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-3', questionId: '3', titleSlug: 'longest-substring-without-repeating-characters', name: 'Longest Substring Without Repeating Characters', difficulty: 'medium', tags: ['hash table', 'string', 'sliding window'], url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-4', questionId: '4', titleSlug: 'median-of-two-sorted-arrays', name: 'Median of Two Sorted Arrays', difficulty: 'hard', tags: ['array', 'binary search', 'divide and conquer'], url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-10', questionId: '10', titleSlug: 'regular-expression-matching', name: 'Regular Expression Matching', difficulty: 'hard', tags: ['string', 'dynamic programming', 'recursion'], url: 'https://leetcode.com/problems/regular-expression-matching/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-11', questionId: '11', titleSlug: 'container-with-most-water', name: 'Container With Most Water', difficulty: 'medium', tags: ['array', 'two pointers', 'greedy'], url: 'https://leetcode.com/problems/container-with-most-water/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-15', questionId: '15', titleSlug: '3sum', name: '3Sum', difficulty: 'medium', tags: ['array', 'two pointers', 'sorting'], url: 'https://leetcode.com/problems/3sum/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-20', questionId: '20', titleSlug: 'valid-parentheses', name: 'Valid Parentheses', difficulty: 'easy', tags: ['string', 'stack'], url: 'https://leetcode.com/problems/valid-parentheses/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-21', questionId: '21', titleSlug: 'merge-two-sorted-lists', name: 'Merge Two Sorted Lists', difficulty: 'easy', tags: ['linked list', 'recursion'], url: 'https://leetcode.com/problems/merge-two-sorted-lists/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-23', questionId: '23', titleSlug: 'merge-k-sorted-lists', name: 'Merge K Sorted Lists', difficulty: 'hard', tags: ['linked list', 'divide and conquer', 'heap'], url: 'https://leetcode.com/problems/merge-k-sorted-lists/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-25', questionId: '25', titleSlug: 'reverse-nodes-in-k-group', name: 'Reverse Nodes in k-Group', difficulty: 'hard', tags: ['linked list', 'recursion'], url: 'https://leetcode.com/problems/reverse-nodes-in-k-group/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-33', questionId: '33', titleSlug: 'search-in-rotated-sorted-array', name: 'Search in Rotated Sorted Array', difficulty: 'medium', tags: ['array', 'binary search'], url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-39', questionId: '39', titleSlug: 'combination-sum', name: 'Combination Sum', difficulty: 'medium', tags: ['array', 'backtracking'], url: 'https://leetcode.com/problems/combination-sum/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-42', questionId: '42', titleSlug: 'trapping-rain-water', name: 'Trapping Rain Water', difficulty: 'hard', tags: ['array', 'two pointers', 'dynamic programming', 'stack', 'monotonic stack'], url: 'https://leetcode.com/problems/trapping-rain-water/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-46', questionId: '46', titleSlug: 'permutations', name: 'Permutations', difficulty: 'medium', tags: ['array', 'backtracking'], url: 'https://leetcode.com/problems/permutations/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-49', questionId: '49', titleSlug: 'group-anagrams', name: 'Group Anagrams', difficulty: 'medium', tags: ['array', 'hash table', 'string', 'sorting'], url: 'https://leetcode.com/problems/group-anagrams/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-51', questionId: '51', titleSlug: 'n-queens', name: 'N-Queens', difficulty: 'hard', tags: ['array', 'backtracking'], url: 'https://leetcode.com/problems/n-queens/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-55', questionId: '55', titleSlug: 'jump-game', name: 'Jump Game', difficulty: 'medium', tags: ['array', 'dynamic programming', 'greedy'], url: 'https://leetcode.com/problems/jump-game/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-76', questionId: '76', titleSlug: 'minimum-window-substring', name: 'Minimum Window Substring', difficulty: 'hard', tags: ['hash table', 'string', 'sliding window'], url: 'https://leetcode.com/problems/minimum-window-substring/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-79', questionId: '79', titleSlug: 'word-search', name: 'Word Search', difficulty: 'medium', tags: ['array', 'backtracking', 'matrix', 'dfs'], url: 'https://leetcode.com/problems/word-search/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-84', questionId: '84', titleSlug: 'largest-rectangle-in-histogram', name: 'Largest Rectangle in Histogram', difficulty: 'hard', tags: ['array', 'stack', 'monotonic stack'], url: 'https://leetcode.com/problems/largest-rectangle-in-histogram/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-98', questionId: '98', titleSlug: 'validate-binary-search-tree', name: 'Validate Binary Search Tree', difficulty: 'medium', tags: ['tree', 'dfs', 'binary search tree'], url: 'https://leetcode.com/problems/validate-binary-search-tree/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-102', questionId: '102', titleSlug: 'binary-tree-level-order-traversal', name: 'Binary Tree Level Order Traversal', difficulty: 'medium', tags: ['tree', 'bfs', 'binary tree'], url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-104', questionId: '104', titleSlug: 'maximum-depth-of-binary-tree', name: 'Maximum Depth of Binary Tree', difficulty: 'easy', tags: ['tree', 'dfs', 'bfs', 'binary tree'], url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-121', questionId: '121', titleSlug: 'best-time-to-buy-and-sell-stock', name: 'Best Time to Buy and Sell Stock', difficulty: 'easy', tags: ['array', 'dynamic programming', 'greedy'], url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-124', questionId: '124', titleSlug: 'binary-tree-maximum-path-sum', name: 'Binary Tree Maximum Path Sum', difficulty: 'hard', tags: ['dynamic programming', 'tree', 'dfs', 'binary tree'], url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-125', questionId: '125', titleSlug: 'valid-palindrome', name: 'Valid Palindrome', difficulty: 'easy', tags: ['two pointers', 'string'], url: 'https://leetcode.com/problems/valid-palindrome/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-127', questionId: '127', titleSlug: 'word-ladder', name: 'Word Ladder', difficulty: 'hard', tags: ['hash table', 'string', 'bfs'], url: 'https://leetcode.com/problems/word-ladder/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-128', questionId: '128', titleSlug: 'longest-consecutive-sequence', name: 'Longest Consecutive Sequence', difficulty: 'medium', tags: ['array', 'hash table', 'union find'], url: 'https://leetcode.com/problems/longest-consecutive-sequence/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-132', questionId: '132', titleSlug: 'palindrome-partitioning-ii', name: 'Palindrome Partitioning II', difficulty: 'hard', tags: ['string', 'dynamic programming'], url: 'https://leetcode.com/problems/palindrome-partitioning-ii/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-133', questionId: '133', titleSlug: 'clone-graph', name: 'Clone Graph', difficulty: 'medium', tags: ['hash table', 'dfs', 'bfs', 'graphs'], url: 'https://leetcode.com/problems/clone-graph/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-153', questionId: '153', titleSlug: 'find-minimum-in-rotated-sorted-array', name: 'Find Minimum in Rotated Sorted Array', difficulty: 'medium', tags: ['array', 'binary search'], url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-167', questionId: '167', titleSlug: 'two-sum-ii-input-array-is-sorted', name: 'Two Sum II', difficulty: 'medium', tags: ['array', 'two pointers', 'binary search'], url: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-198', questionId: '198', titleSlug: 'house-robber', name: 'House Robber', difficulty: 'medium', tags: ['array', 'dynamic programming'], url: 'https://leetcode.com/problems/house-robber/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-200', questionId: '200', titleSlug: 'number-of-islands', name: 'Number of Islands', difficulty: 'medium', tags: ['array', 'dfs', 'bfs', 'union find', 'matrix', 'graphs'], url: 'https://leetcode.com/problems/number-of-islands/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-206', questionId: '206', titleSlug: 'reverse-linked-list', name: 'Reverse Linked List', difficulty: 'easy', tags: ['linked list', 'recursion'], url: 'https://leetcode.com/problems/reverse-linked-list/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-207', questionId: '207', titleSlug: 'course-schedule', name: 'Course Schedule', difficulty: 'medium', tags: ['dfs', 'bfs', 'graphs', 'topological sort'], url: 'https://leetcode.com/problems/course-schedule/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-208', questionId: '208', titleSlug: 'implement-trie-prefix-tree', name: 'Implement Trie', difficulty: 'medium', tags: ['hash table', 'string', 'design', 'trie'], url: 'https://leetcode.com/problems/implement-trie-prefix-tree/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-212', questionId: '212', titleSlug: 'word-search-ii', name: 'Word Search II', difficulty: 'hard', tags: ['array', 'backtracking', 'trie', 'matrix'], url: 'https://leetcode.com/problems/word-search-ii/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-213', questionId: '213', titleSlug: 'house-robber-ii', name: 'House Robber II', difficulty: 'medium', tags: ['array', 'dynamic programming'], url: 'https://leetcode.com/problems/house-robber-ii/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-217', questionId: '217', titleSlug: 'contains-duplicate', name: 'Contains Duplicate', difficulty: 'easy', tags: ['array', 'hash table', 'sorting'], url: 'https://leetcode.com/problems/contains-duplicate/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-226', questionId: '226', titleSlug: 'invert-binary-tree', name: 'Invert Binary Tree', difficulty: 'easy', tags: ['tree', 'dfs', 'bfs', 'binary tree'], url: 'https://leetcode.com/problems/invert-binary-tree/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-230', questionId: '230', titleSlug: 'kth-smallest-element-in-a-bst', name: 'Kth Smallest Element in a BST', difficulty: 'medium', tags: ['tree', 'dfs', 'binary search tree'], url: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-235', questionId: '235', titleSlug: 'lowest-common-ancestor-of-a-binary-search-tree', name: 'Lowest Common Ancestor of a BST', difficulty: 'medium', tags: ['tree', 'dfs', 'binary search tree'], url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-242', questionId: '242', titleSlug: 'valid-anagram', name: 'Valid Anagram', difficulty: 'easy', tags: ['hash table', 'string', 'sorting'], url: 'https://leetcode.com/problems/valid-anagram/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-295', questionId: '295', titleSlug: 'find-median-from-data-stream', name: 'Find Median from Data Stream', difficulty: 'hard', tags: ['two pointers', 'design', 'sorting', 'heap', 'data stream'], url: 'https://leetcode.com/problems/find-median-from-data-stream/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-297', questionId: '297', titleSlug: 'serialize-and-deserialize-binary-tree', name: 'Serialize and Deserialize Binary Tree', difficulty: 'hard', tags: ['string', 'tree', 'dfs', 'bfs', 'design', 'binary tree'], url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-300', questionId: '300', titleSlug: 'longest-increasing-subsequence', name: 'Longest Increasing Subsequence', difficulty: 'medium', tags: ['array', 'binary search', 'dynamic programming'], url: 'https://leetcode.com/problems/longest-increasing-subsequence/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-322', questionId: '322', titleSlug: 'coin-change', name: 'Coin Change', difficulty: 'medium', tags: ['array', 'dynamic programming', 'breadth-first search'], url: 'https://leetcode.com/problems/coin-change/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-417', questionId: '417', titleSlug: 'pacific-atlantic-water-flow', name: 'Pacific Atlantic Water Flow', difficulty: 'medium', tags: ['array', 'dfs', 'bfs', 'matrix', 'graphs'], url: 'https://leetcode.com/problems/pacific-atlantic-water-flow/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-424', questionId: '424', titleSlug: 'longest-repeating-character-replacement', name: 'Longest Repeating Character Replacement', difficulty: 'medium', tags: ['hash table', 'string', 'sliding window'], url: 'https://leetcode.com/problems/longest-repeating-character-replacement/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-572', questionId: '572', titleSlug: 'subtree-of-another-tree', name: 'Subtree of Another Tree', difficulty: 'easy', tags: ['tree', 'dfs', 'binary tree'], url: 'https://leetcode.com/problems/subtree-of-another-tree/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-647', questionId: '647', titleSlug: 'palindromic-substrings', name: 'Palindromic Substrings', difficulty: 'medium', tags: ['string', 'dynamic programming'], url: 'https://leetcode.com/problems/palindromic-substrings/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
  { id: 'lc-704', questionId: '704', titleSlug: 'binary-search', name: 'Binary Search', difficulty: 'easy', tags: ['array', 'binary search'], url: 'https://leetcode.com/problems/binary-search/', platform: 'leetcode', rating: null, solvedCount: 0, isPaidOnly: false },
];

/**
 * Retry helper for page requests.
 */
async function fetchPageWithRetry(baseUrl, skip, limit, retries = 2) {
  const maxRetries = process.env.NODE_ENV === 'test' ? 0 : retries;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.get(`${baseUrl}/problems`, {
        params: { limit, skip },
        timeout: process.env.NODE_ENV === 'test' ? 2000 : 25000,
      });
      return res.data || {};
    } catch (err) {
      if (attempt >= maxRetries) {
        throw new Error(`Failed to fetch page (skip=${skip}, limit=${limit}): ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Normalize an upstream LeetCode question object into ForgeSolve's canonical format.
 */
function normalizeQuestion(q) {
  if (!q || q.paidOnly || q.isPaidOnly) return null;
  const qId = String(q.questionFrontendId || q.frontendQuestionId || q.questionId || '').trim();
  if (!qId || !q.titleSlug) return null;

  const tagSet = new Set();
  (q.topicTags || []).forEach(t => {
    const raw = (typeof t === 'string' ? t : (t.name || t.slug || '')).trim().toLowerCase();
    if (!raw) return;
    tagSet.add(raw);
    if (TAG_ALIASES[raw]) {
      tagSet.add(TAG_ALIASES[raw]);
    }
  });

  return {
    id: `lc-${qId}`,
    questionId: qId,
    titleSlug: q.titleSlug,
    name: q.title || q.name || q.titleSlug,
    difficulty: (q.difficulty || 'medium').toLowerCase(),
    tags: Array.from(tagSet),
    url: `https://leetcode.com/problems/${q.titleSlug}/`,
    platform: 'leetcode',
    rating: null,
    solvedCount: 0,
    isPaidOnly: false,
  };
}

/**
 * Fetch all problems from upstream alfa-leetcode-api, paginating up to 60 pages (page size 100).
 * Handles pagination using `limit` and `skip`, concurrent batches of 4, and per-page retries.
 */
async function fetchFromLiveApi() {
  const baseUrl = getBaseUrl();
  const limit = 100;
  const maxPages = 60; // Safely covers up to 6,000 problems

  const t0 = Date.now();
  console.log(`[LC] Starting problemset fetch from ${baseUrl}/problems (limit=${limit})`);

  // Step 1: Fetch initial page to discover total available questions
  const page0Data = await fetchPageWithRetry(baseUrl, 0, limit);
  const totalQuestions = parseInt(page0Data.totalQuestions, 10) || 0;
  const initialQuestions = page0Data.problemsetQuestionList || [];

  if (!initialQuestions.length && totalQuestions === 0) {
    throw new Error('Upstream LeetCode API returned empty problem list');
  }

  const allRawQuestions = [...initialQuestions];
  let batchesCount = 1;

  // Step 2: Determine remaining pages and fetch with concurrency
  if (totalQuestions > 0) {
    const totalPages = Math.min(Math.ceil(totalQuestions / limit), maxPages);
    const skips = [];
    for (let p = 1; p < totalPages; p++) {
      skips.push(p * limit);
    }

    const concurrency = 4;
    for (let i = 0; i < skips.length; i += concurrency) {
      const batch = skips.slice(i, i + concurrency);
      batchesCount += batch.length;
      const results = await Promise.all(
        batch.map(skip => fetchPageWithRetry(baseUrl, skip, limit))
      );
      for (const res of results) {
        const qList = res.problemsetQuestionList || [];
        if (qList.length > 0) {
          allRawQuestions.push(...qList);
        }
      }
    }
  } else {
    // Fallback if totalQuestions is not provided
    let page = 1;
    while (page < maxPages) {
      batchesCount++;
      const res = await fetchPageWithRetry(baseUrl, page * limit, limit);
      const qList = res.problemsetQuestionList || [];
      if (!qList.length) break;
      allRawQuestions.push(...qList);
      if (qList.length < limit) break;
      page++;
    }
  }

  // Step 3: Normalize and deduplicate by canonical id
  const seenIds = new Set();
  const problems = [];
  for (const q of allRawQuestions) {
    const normalized = normalizeQuestion(q);
    if (!normalized) continue;
    if (seenIds.has(normalized.id)) continue;
    seenIds.add(normalized.id);
    problems.push(normalized);
  }

  // Step 4: Deterministic sort by questionId
  problems.sort((a, b) => {
    const numA = parseInt(a.questionId, 10);
    const numB = parseInt(b.questionId, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.questionId.localeCompare(b.questionId);
  });

  const durationMs = Date.now() - t0;
  console.log(
    `[LC] Live fetch complete: ${allRawQuestions.length} raw questions in ${batchesCount} batches, ` +
    `${problems.length} unique free problems in ${durationMs}ms`
  );

  return problems;
}

/**
 * Get all LeetCode problems with SingleFlight request deduplication,
 * safe fallback, and cache protection.
 */
const getAllProblems = async () => {
  const cached = cache.get(PROBLEMS_CACHE_KEY);
  if (cached && Array.isArray(cached) && cached.length >= MIN_COMPLETE_DATASET_SIZE) {
    return cached;
  }

  if (process.env.LEETCODE_USE_STATIC === 'true') {
    console.log(`[LC] LEETCODE_USE_STATIC is set to true; using static dataset (${STATIC_PROBLEMS.length} problems)`);
    cache.set(PROBLEMS_CACHE_KEY, STATIC_PROBLEMS, getCacheTtl());
    return STATIC_PROBLEMS;
  }

  // SingleFlight: deduplicate concurrent in-flight fetches
  if (inFlightFetchPromise) {
    return inFlightFetchPromise;
  }

  inFlightFetchPromise = (async () => {
    try {
      const problems = await fetchFromLiveApi();
      if (!problems || problems.length < MIN_COMPLETE_DATASET_SIZE) {
        throw new Error(
          `Incomplete dataset from upstream: fetched ${problems ? problems.length : 0} problems (expected >= ${MIN_COMPLETE_DATASET_SIZE})`
        );
      }

      cache.set(PROBLEMS_CACHE_KEY, problems, getCacheTtl());
      console.log(`[LC] Cached ${problems.length} free problems for ${getCacheTtl()}s`);
      return problems;
    } catch (err) {
      console.warn(`[LC] Live API fetch failed: ${err.message}`);

      // If we already have a previous valid complete dataset, NEVER overwrite it with static
      const existing = cache.get(PROBLEMS_CACHE_KEY);
      if (existing && Array.isArray(existing) && existing.length >= MIN_COMPLETE_DATASET_SIZE) {
        console.log(`[LC] Preserving existing cached dataset (${existing.length} problems)`);
        return existing;
      }

      // No previous valid cache exists: use static fallback with short TTL so retries happen soon
      console.log(`[LC] Falling back to static dataset (${STATIC_PROBLEMS.length} problems, TTL=${STATIC_FALLBACK_TTL}s)`);
      cache.set(PROBLEMS_CACHE_KEY, STATIC_PROBLEMS, STATIC_FALLBACK_TTL);
      return STATIC_PROBLEMS;
    } finally {
      inFlightFetchPromise = null;
    }
  })();

  return inFlightFetchPromise;
};

/**
 * Force refresh the problems cache.
 */
const refreshProblems = async () => {
  cache.del(PROBLEMS_CACHE_KEY);
  return getAllProblems();
};

/**
 * Get all valid LeetCode tags, sorted descending by the number of matching questions in the pool.
 * Only includes official LeetCode tags with >= 1 problem, removing nonexistent or non-LeetCode tags.
 */
const getAllTags = async () => {
  const problems = await getAllProblems();
  const allowedTagSet = new Set(OFFICIAL_LEETCODE_TAGS);

  // Count occurrences of each valid tag across the problem pool
  const tagCounts = new Map();
  OFFICIAL_LEETCODE_TAGS.forEach(t => tagCounts.set(t, 0));

  problems.forEach(p => {
    (p.tags || []).forEach(t => {
      const lower = t.toLowerCase();
      if (allowedTagSet.has(lower)) {
        tagCounts.set(lower, (tagCounts.get(lower) || 0) + 1);
      }
    });
  });

  // Keep only official tags that actually have matching problems, sorted descending by question count
  const sorted = OFFICIAL_LEETCODE_TAGS
    .filter(tag => (tagCounts.get(tag) || 0) > 0)
    .sort((a, b) => {
      const diff = (tagCounts.get(b) || 0) - (tagCounts.get(a) || 0);
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    });

  // If in static fallback mode with a smaller dataset, append the remaining official tags in popularity order
  if (sorted.length < OFFICIAL_LEETCODE_TAGS.length && problems.length < 500) {
    const included = new Set(sorted);
    const remaining = OFFICIAL_LEETCODE_TAGS.filter(t => !included.has(t));
    return [...sorted, ...remaining];
  }

  return sorted;
};

/**
 * Get the set of accepted titleSlugs for a given LeetCode username.
 */
const getUserSolvedSlugs = async (username) => {
  if (!username || !/^[A-Za-z0-9_-]{1,40}$/.test(username)) {
    throw createHttpError('Invalid LeetCode username', 400);
  }

  if (process.env.LEETCODE_USE_STATIC === 'true') {
    throw createHttpError('LeetCode user features unavailable in static mode', 503);
  }

  const cacheKey = `${USER_CACHE_PREFIX}${username}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Upstream alfa-leetcode-api endpoint for recent ACs (limit up to 100)
    const res = await axios.get(`${getBaseUrl()}/${encodeURIComponent(username)}/acSubmission`, {
      params: { limit: 100 },
      timeout: 10000,
    });

    if (res.data?.errors || res.data?.error) {
      throw createHttpError(`LeetCode user "${username}" not found`, 404);
    }

    const submissions = res.data?.submission || [];
    const solvedSet = new Set(submissions.map(s => s.titleSlug).filter(Boolean));

    cache.set(cacheKey, solvedSet, getUserCacheTtl());
    return solvedSet;
  } catch (err) {
    if (err.status) throw err;
    if (err.response?.status === 404 || err.response?.data?.errors) {
      throw createHttpError(`LeetCode user "${username}" not found`, 404);
    }
    throw createHttpError(`LeetCode upstream service unavailable: ${err.message}`, 503);
  }
};

/**
 * Get rich profile stats conforming to the Codeforces profile format.
 */
const getUserStats = async (username) => {
  if (!username || !/^[A-Za-z0-9_-]{1,40}$/.test(username)) {
    throw createHttpError('Invalid LeetCode username', 400);
  }

  if (process.env.LEETCODE_USE_STATIC === 'true') {
    throw createHttpError('LeetCode user features unavailable in static mode', 503);
  }

  const cacheKey = `${STATS_CACHE_PREFIX}${username}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = getBaseUrl();
  const [profileRes, solvedRes, calRes, acRes, problems] = await Promise.all([
    axios.get(`${url}/${encodeURIComponent(username)}`, { timeout: 10000 }).catch(e => e),
    axios.get(`${url}/${encodeURIComponent(username)}/solved`, { timeout: 10000 }).catch(e => e),
    axios.get(`${url}/${encodeURIComponent(username)}/calendar`, { timeout: 10000 }).catch(e => e),
    axios.get(`${url}/${encodeURIComponent(username)}/acSubmission?limit=100`, { timeout: 10000 }).catch(e => e),
    getAllProblems(),
  ]);

  if (profileRes instanceof Error) {
    if (profileRes.response?.status === 404 || profileRes.response?.data?.errors) {
      throw createHttpError(`LeetCode user "${username}" not found`, 404);
    }
    throw createHttpError(`LeetCode upstream service unavailable: ${profileRes.message}`, 503);
  }

  const profileData = profileRes.data || {};
  if (profileData.errors || profileData.error) {
    throw createHttpError(`LeetCode user "${username}" not found`, 404);
  }

  const solvedData = !(solvedRes instanceof Error) ? (solvedRes.data || {}) : {};
  const calData = !(calRes instanceof Error) ? (calRes.data || {}) : {};
  const acData = !(acRes instanceof Error) ? (acRes.data || {}) : {};

  // Build problem map to compute topTags from recent ACs
  const problemMap = new Map();
  problems.forEach(p => { if (p.titleSlug) problemMap.set(p.titleSlug, p); });

  const tagCount = {};
  const recentSubmissions = acData.submission || [];
  recentSubmissions.forEach(s => {
    if (s.titleSlug && problemMap.has(s.titleSlug)) {
      const p = problemMap.get(s.titleSlug);
      (p.tags || []).forEach(t => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    }
  });

  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  // Parse calendar for monthly activity and streaks
  const monthlyCounts = {};
  if (calData.submissionCalendar) {
    try {
      const parsed = typeof calData.submissionCalendar === 'string'
        ? JSON.parse(calData.submissionCalendar)
        : calData.submissionCalendar;
      Object.entries(parsed).forEach(([epochSec, count]) => {
        const d = new Date(parseInt(epochSec, 10) * 1000);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyCounts[ym] = (monthlyCounts[ym] || 0) + (count || 0);
      });
    } catch {
      // ignore parse errors
    }
  }

  const now = new Date();
  const monthlyActivity = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyActivity.push({ month: k, count: monthlyCounts[k] || 0 });
  }

  const ranking = profileData.ranking ? parseInt(profileData.ranking, 10) : null;
  const solvedCount = solvedData.solvedProblem || profileData.solvedProblem || 0;
  const easySolved = solvedData.easySolved || 0;
  const mediumSolved = solvedData.mediumSolved || 0;
  const hardSolved = solvedData.hardSolved || 0;
  const totalSubmissions = profileData.totalSubmissions || (solvedCount > 0 ? solvedCount : 0);
  const acRate = profileData.acRate !== undefined
    ? Math.round(profileData.acRate)
    : (totalSubmissions > 0 ? Math.round((solvedCount / totalSubmissions) * 100) : 0);

  const currentStreak = calData.streak || 0;
  const maxStreak = calData.totalActiveDays || currentStreak || 0;

  const stats = {
    platform: 'leetcode',
    handle: username,
    rating: ranking || null,
    rank: ranking ? `Rank #${ranking}` : 'Unranked',
    avatar: profileData.avatar || null,
    country: profileData.country || null,
    solvedCount,
    easySolved,
    mediumSolved,
    hardSolved,
    attemptedCount: 0,
    totalSubmissions,
    acRate,
    currentStreak,
    maxStreak,
    topTags,
    monthlyActivity,
    ratingDist: [],
  };

  cache.set(cacheKey, stats, getUserCacheTtl());
  return stats;
};

module.exports = {
  getAllProblems,
  refreshProblems,
  getAllTags,
  getUserSolvedSlugs,
  getUserStats,
  STATIC_PROBLEMS,
  OFFICIAL_LEETCODE_TAGS,
};
