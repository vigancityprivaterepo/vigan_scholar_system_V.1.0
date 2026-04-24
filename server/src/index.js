require('dotenv').config();

// Validate required environment variables before anything else starts.
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'PRIMARY_ADMIN_EMAIL', 'CLIENT_URL', 'DATABASE_URL'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length > 0) {
  // Logger not yet initialised — use console here intentionally.
  console.error(`[startup] FATAL: Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('[startup] Set these in your .env file and restart the server.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');
const fileRoutes = require('./routes/files');
const carouselRoutes = require('./routes/carousel');
const settingsRoutes = require('./routes/settings');
const scholarRoutes = require('./routes/scholars');
const renewalRoutes = require('./routes/renewals');
const { errorHandler } = require('./middleware/errorHandler');
const { processDueEmailJobs } = require('./controllers/adminController');
const { runAutomatedReminders } = require('./services/reminderService');
const { purgeExpiredRefreshTokens } = require('./services/cleanupService');
const logger = require('./utils/logger');

const app = express();
app.set('trust proxy', 1);

const parseAllowedOrigins = () => {
  const configured = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (configured.length > 0) return configured;

  // In production, failing to set CORS_ORIGINS blocks all cross-origin requests
  // rather than falling back to dev origins.
  if (process.env.NODE_ENV === 'production') {
    logger.warn('CORS_ORIGINS is not set in production — all cross-origin requests will be blocked');
    return [];
  }

  return ['http://localhost:5173', 'http://localhost:3000'];
};
const allowedOrigins = parseAllowedOrigins();

// Rate limiters
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Please try again later.' } });
const forgotPasswordLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many password reset requests. Please try again in an hour.' } });

// Security & parsing middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream: logger.stream }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve public uploads only (carousel assets).
app.use('/public-uploads', express.static(path.join(__dirname, '..', 'public_uploads')));

// Routes
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', forgotPasswordLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/scholars', scholarRoutes);
app.use('/api/renewals', renewalRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

setInterval(() => {
  processDueEmailJobs().catch((err) => logger.error('Email job worker error', { message: err.message }));
}, 30 * 1000);

setInterval(() => {
  runAutomatedReminders().catch((err) => logger.error('Automated reminder worker error', { message: err.message }));
}, 15 * 60 * 1000);

// Run once at startup, then every 24 h to purge expired refresh tokens
purgeExpiredRefreshTokens().catch((err) => logger.error('Refresh token cleanup error', { message: err.message }));
setInterval(() => {
  purgeExpiredRefreshTokens().catch((err) => logger.error('Refresh token cleanup error', { message: err.message }));
}, 24 * 60 * 60 * 1000);

module.exports = app;
