/**
 * Direct LeetCode GraphQL client.
 *
 * Used as a fallback (and dataset generator) when the self-hosted
 * alfa-leetcode-api upstream is unreachable. This talks straight to
 * LeetCode's public GraphQL endpoint, which is the same data source
 * alfa-leetcode-api proxies, so it removes the single point of failure.
 */

const axios = require('axios');

const DEFAULT_GRAPHQL_URL = 'https://leetcode.com/graphql';
const PAGE_SIZE = 100; // LeetCode caps problemsetQuestionList at 100 per request
const MAX_PAGES = 60; // safely covers up to 6,000 problems

const PROBLEMSET_QUERY = `
query problemsetQuestionList(
  $categorySlug: String
  $limit: Int
  $skip: Int
  $filters: QuestionListFilterInput
) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      acRate
      difficulty
      frontendQuestionId: questionFrontendId
      paidOnly: isPaidOnly
      title
      titleSlug
      topicTags {
        name
        id
        slug
      }
    }
  }
}`;

const getGraphqlUrl = () =>
  (process.env.LEETCODE_GRAPHQL_URL || DEFAULT_GRAPHQL_URL).replace(/\/+$/, '');

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Referer: 'https://leetcode.com/problemset/all/',
  Origin: 'https://leetcode.com',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
});

async function postQuery(query, variables, timeout, signal) {
  const res = await axios.post(
    getGraphqlUrl(),
    { query, variables },
    {
      headers: getHeaders(),
      timeout: timeout || parseInt(process.env.LEETCODE_GRAPHQL_TIMEOUT_MS, 10) || 20000,
      signal,
      validateStatus: () => true,
    }
  );

  if (res.status === 429) {
    const err = new Error('LeetCode GraphQL rate limited (429)');
    err.status = 429;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error('LeetCode GraphQL blocked the request (403)');
    err.status = 403;
    throw err;
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`LeetCode GraphQL HTTP ${res.status}`);
  }
  if (res.data?.errors?.length) {
    throw new Error(`LeetCode GraphQL error: ${res.data.errors[0]?.message || 'unknown'}`);
  }
  return res.data?.data || {};
}

async function fetchPage(skip, limit, retries = 2, signal) {
  const maxRetries = process.env.NODE_ENV === 'test' ? 0 : retries;
  const timeout = process.env.NODE_ENV === 'test' ? 2000 : undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await postQuery(
        PROBLEMSET_QUERY,
        { categorySlug: '', skip, limit, filters: {} },
        timeout,
        signal
      );
      const list = data.problemsetQuestionList || {};
      return {
        total: parseInt(list.total, 10) || 0,
        questions: list.questions || [],
      };
    } catch (err) {
      const aborted = err.name === 'CanceledError' || err.code === 'ERR_CANCELED';
      if (aborted || attempt >= maxRetries || err.status === 403 || err.status === 429) {
        throw new Error(
          `LeetCode GraphQL page failed (skip=${skip}, limit=${limit}): ${err.message}`
        );
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Fetch the complete LeetCode problemset directly from LeetCode GraphQL.
 * Returns raw question objects in the same shape as alfa-leetcode-api's
 * `problemsetQuestionList`.
 */
async function fetchAllProblems({ concurrency = 4, signal } = {}) {
  if (process.env.NODE_ENV === 'test' && process.env.LEETCODE_ALLOW_NETWORK_IN_TESTS !== 'true') {
    throw new Error('LeetCode GraphQL network disabled in test environment');
  }

  const first = await fetchPage(0, PAGE_SIZE, 2, signal);
  const total = first.total;
  const raw = [...first.questions];

  if (total > 0) {
    const totalPages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);
    const skips = [];
    for (let p = 1; p < totalPages; p++) skips.push(p * PAGE_SIZE);

    for (let i = 0; i < skips.length; i += concurrency) {
      const batch = skips.slice(i, i + concurrency);
      const results = await Promise.all(batch.map((skip) => fetchPage(skip, PAGE_SIZE, 2, signal)));
      for (const res of results) {
        if (res.questions.length > 0) raw.push(...res.questions);
      }
    }
  } else {
    let page = 1;
    while (page < MAX_PAGES) {
      const res = await fetchPage(page * PAGE_SIZE, PAGE_SIZE, 2, signal);
      if (!res.questions.length) break;
      raw.push(...res.questions);
      if (res.questions.length < PAGE_SIZE) break;
      page++;
    }
  }

  return raw;
}

module.exports = {
  fetchAllProblems,
  fetchProblemsPage: fetchPage,
  postQuery,
  PROBLEMSET_QUERY,
};
