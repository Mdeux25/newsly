require('dotenv').config();
const express = require('express');
const cors = require('cors');
const newsRouter = require('./routes/news');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production (for Docker)
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, 'public')));
}

// Routes
app.use('/api', newsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`\n✅ Backend server running on http://localhost:${PORT}`);
  console.log(`✅ API endpoints available at http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ System status: http://localhost:${PORT}/api/status\n`);

  // Start background worker scheduler
  const { startScheduler } = require('./workers/scheduler');
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  SIGTERM received, shutting down gracefully...');
  const { stopScheduler } = require('./workers/scheduler');
  stopScheduler();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  SIGINT received, shutting down gracefully...');
  const { stopScheduler } = require('./workers/scheduler');
  stopScheduler();
  process.exit(0);
});
