require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const problemsRouter = require('./routes/problems');
const codeforcesRouter = require('./routes/codeforces');
const leetcodeRouter = require('./routes/leetcode');
const healthRouter = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5001;

// Render (and most cloud platforms) sit behind one reverse-proxy hop.
// Using the numeric hop count is safer than `true` (which trusts ALL hops).
// Without this, express-rate-limit sees Render's proxy IP for every client and
// puts all users in one bucket, causing instant 429s in production.
app.set('trust proxy', 1);

// CORS configuration allowing FRONTEND_URL + localhost:5173
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Middleware
app.use(express.json());

// Global API rate limiting — 120 req/min per real client IP.
// This is the only limiter for /api/*. LeetCode user requests are additionally
// deduplicated in-flight and cached inside leetcodeService, so a second limiter
// there would only cause double-counting.
const limiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute window
  max: 120,                    // 120 requests per minute per IP
  standardHeaders: 'draft-7', // RFC-compliant RateLimit headers
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', limiter);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/problems', problemsRouter);
app.use('/api/codeforces', codeforcesRouter);
app.use('/api/leetcode', leetcodeRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const server = app.listen(PORT, () => {
  const lcMode = process.env.LEETCODE_USE_STATIC === 'true' ? 'static' : 'live';
  console.log(`🚀 Problem Picker backend running on port ${PORT}`);
  console.log(`[LC] LeetCode mode: ${lcMode}`);

  // Warm LeetCode cache eagerly on startup
  if (process.env.LEETCODE_USE_STATIC !== 'true') {
    const { getAllProblems, getBaseUrl } = require('./services/leetcodeService');
    console.log(`[LC] Upstream: ${getBaseUrl()}`);
    getAllProblems()
      .then(problems => {
        console.log(`[LC] Startup cache pre-warmed: ${problems.length} problems ready`);
      })
      .catch(err => {
        console.warn(`[LC] Startup cache pre-warm warning: ${err.message}`);
      });
  }
});

// Graceful shutdown handling for nodemon restarts and termination
process.once('SIGUSR2', () => {
  server.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
