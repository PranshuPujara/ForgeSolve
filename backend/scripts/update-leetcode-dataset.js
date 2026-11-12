#!/usr/bin/env node
/**
 * Regenerate the bundled LeetCode problemset snapshot.
 *
 * Usage: node scripts/update-leetcode-dataset.js
 *
 * Fetches directly from LeetCode GraphQL (independent of alfa-leetcode-api) and
 * writes backend/data/leetcode-problems.json. Commit the result so the app always
 * has a complete fallback dataset even when every live source is down.
 */

const fs = require('fs');
const path = require('path');
const leetcodeGraphql = require('../services/leetcodeGraphql');
const { normalizeAll, BUNDLED_DATASET_PATH } = require('../services/leetcodeService');

const MIN_EXPECTED = 500;

(async () => {
  console.log('[LC] Fetching complete problemset from LeetCode GraphQL...');
  const raw = await leetcodeGraphql.fetchAllProblems({ concurrency: 4 });
  const problems = normalizeAll(raw);

  if (problems.length < MIN_EXPECTED) {
    throw new Error(`Refusing to write incomplete dataset (${problems.length} problems)`);
  }

  fs.mkdirSync(path.dirname(BUNDLED_DATASET_PATH), { recursive: true });
  fs.writeFileSync(BUNDLED_DATASET_PATH, JSON.stringify(problems));

  const sizeKb = (fs.statSync(BUNDLED_DATASET_PATH).size / 1024).toFixed(1);
  console.log(
    `[LC] Wrote ${problems.length} problems to ${path.relative(process.cwd(), BUNDLED_DATASET_PATH)} (${sizeKb} KB)`
  );
})().catch((err) => {
  console.error(`[LC] Dataset update failed: ${err.message}`);
  process.exitCode = 1;
});
