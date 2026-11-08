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

// Global API rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
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

app.listen(PORT, () => {
  const lcMode = process.env.LEETCODE_USE_STATIC === 'true' ? 'static' : 'live';
  console.log(`🚀 Problem Picker backend running on port ${PORT}`);
  console.log(`[LC] LeetCode mode: ${lcMode}`);
});
