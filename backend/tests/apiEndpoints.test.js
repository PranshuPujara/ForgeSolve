const test = require('node:test');
const assert = require('node:assert');
const problemsRouter = require('../routes/problems');
const leetcodeRouter = require('../routes/leetcode');
const healthRouter = require('../routes/health');

// Helper to simulate express router calls in-memory
function invokeRoute(router, { method = 'GET', url = '/', body = {}, params = {}, query = {} }) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      baseUrl: '',
      originalUrl: url,
      body,
      params,
      query,
      headers: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      app: { get: () => false },
      get: () => undefined,
      header: () => undefined,
    };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, body: data });
        return this;
      },
      send(data) {
        resolve({ status: this.statusCode, body: data });
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
      },
    };
    const next = (err) => {
      if (err) {
        resolve({ status: err.status || 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: 'Not found' } });
      }
    };
    router.handle(req, res, next);
  });
}

test('Endpoint: GET /health returns ok', async () => {
  const result = await invokeRoute(healthRouter, { method: 'GET', url: '/' });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.status, 'ok');
});

test('Endpoint: GET /leetcode/tags returns tags', async () => {
  const result = await invokeRoute(leetcodeRouter, { method: 'GET', url: '/tags' });
  assert.strictEqual(result.status, 200);
  assert.ok(Array.isArray(result.body.tags));
  assert.ok(result.body.tags.length > 0);
});

test('Endpoint: POST /problems/pick with leetcode returns canonical problem', async () => {
  const result = await invokeRoute(problemsRouter, {
    method: 'POST',
    url: '/pick',
    body: {
      platform: 'leetcode',
      difficulty: 'medium',
      tags: ['dynamic programming'],
    },
  });
  assert.strictEqual(result.status, 200);
  assert.ok(result.body.problem);
  assert.strictEqual(result.body.problem.platform, 'leetcode');
  assert.ok(result.body.problem.titleSlug);
  assert.ok(result.body.problem.id.startsWith('lc-'));
  assert.strictEqual(result.body.meta.platform, 'leetcode');
});

test('Endpoint: POST /problems/reattempt resolves lc-1', async () => {
  const result = await invokeRoute(problemsRouter, {
    method: 'POST',
    url: '/reattempt',
    body: {
      platform: 'leetcode',
      problemId: 'lc-1',
    },
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.problem.id, 'lc-1');
  assert.strictEqual(result.body.problem.titleSlug, 'two-sum');
});

test('Endpoint: POST /problems/reattempt resolves 1 to lc-1', async () => {
  const result = await invokeRoute(problemsRouter, {
    method: 'POST',
    url: '/reattempt',
    body: {
      platform: 'leetcode',
      problemId: '1',
    },
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.problem.id, 'lc-1');
  assert.strictEqual(result.body.problem.titleSlug, 'two-sum');
});

test('Endpoint: GET /leetcode/user/:username/solved with invalid username returns 400', async () => {
  const result = await invokeRoute(leetcodeRouter, {
    method: 'GET',
    url: '/user/invalid!user/solved',
    params: { username: 'invalid!user' },
  });
  assert.strictEqual(result.status, 400);
  assert.ok(result.body.error);
});
