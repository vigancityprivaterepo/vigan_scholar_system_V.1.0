require('dotenv').config();
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
const { errorHandler } = require('./middleware/errorHandler');
const { processDueEmailJobs } = require('./controllers/adminController');
const { runAutomatedReminders } = require('./services/reminderService');
const { purgeExpiredRefreshTokens } = require('./services/cleanupService');

const app = express();
app.set('trust proxy', 1);

const parseAllowedOrigins = () => {
  const configured = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.length > 0) return configured;
  return ['http://localhost:5173', 'http://localhost:3000'];
};
const allowedOrigins = parseAllowedOrigins();

// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many attempts. Please try again later.' } });
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
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve public uploads only (carousel assets).
app.use('/public-uploads', express.static(path.join(__dirname, '..', 'public_uploads')));

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', forgotPasswordLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/scholars', scholarRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

setInterval(() => {
  processDueEmailJobs().catch((err) => console.error('Email job worker error:', err.message));
}, 30 * 1000);

setInterval(() => {
  runAutomatedReminders().catch((err) => console.error('Automated reminder worker error:', err.message));
}, 15 * 60 * 1000);

// Run once at startup, then every 24 h to purge expired refresh tokens
purgeExpiredRefreshTokens().catch((err) => console.error('Refresh token cleanup error:', err.message));
setInterval(() => {
  purgeExpiredRefreshTokens().catch((err) => console.error('Refresh token cleanup error:', err.message));
}, 24 * 60 * 60 * 1000);

module.exports = app;
