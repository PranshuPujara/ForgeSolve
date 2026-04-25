require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const problemsRouter = require('./routes/problems');
const codeforcesRouter = require('./routes/codeforces');
const healthRouter = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: "*"
}));

// Rate limiting - protect CF API from abuse
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

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Problem Picker backend running on port ${PORT}`);
});
