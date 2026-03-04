import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { router as apiRouter } from './routes/index.js';
import { connectDB } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
const isProd = process.env.NODE_ENV === 'production';

// ── CORS ───────────────────────────────────────────────────────────────────
// FRONTEND_URL may be a comma-separated list of allowed origins, e.g.:
//   https://relclean.onrender.com,https://relclean.vercel.app
const allowedOrigins = FRONTEND_URL
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (!isProd) {
  allowedOrigins.push('http://localhost:8080', 'http://localhost:8081');
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no Origin header) and any listed origin
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    env: process.env.NODE_ENV || 'development',
    database: {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
    },
  });
});

// ── Serve React frontend in production ─────────────────────────────────────
// The compiled frontend lives at ../../Frontend/dist relative to Backend/dist/
if (isProd) {
  const frontendDist = path.resolve(__dirname, '../../Frontend/dist');
  app.use(express.static(frontendDist));

  // React Router — serve index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// ── Start ──────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    const dbConnected = await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      if (isProd) {
        console.log(`🌐 Serving React frontend from built dist`);
      } else {
        console.log(`✅ CORS enabled for ${FRONTEND_URL}`);
      }
      if (!dbConnected) {
        console.log('ℹ️  Running without persistent MongoDB storage');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

