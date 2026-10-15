const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// City offices and school computer labs often share one public IP, so the strict limit
// counts attempts per IP *and* email (one person retrying), while the per-IP limit is
// loose enough for a whole office or class signing in together.
// Counters live in memory, which is correct for the single server instance in docker-compose.

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

const tooMany = (message) => (req, res) => {
  res.status(429).json({ success: false, message });
};

const emailKey = (req) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  return `${ipKeyGenerator(req.ip)}|${email}`;
};

const common = { standardHeaders: 'draft-8', legacyHeaders: false };

// Password guessing on one account
const loginLimiter = rateLimit({
  ...common,
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  keyGenerator: emailKey,
  handler: tooMany('Too many sign-in attempts for this account. Please wait 15 minutes and try again.'),
});

// Emails sent to one address (verification, password reset)
const emailSendLimiter = rateLimit({
  ...common,
  windowMs: ONE_HOUR,
  limit: 5,
  keyGenerator: emailKey,
  handler: tooMany('Too many requests for this email address. Please wait an hour and try again.'),
});

// Reset-link attempts on one account
const resetLimiter = rateLimit({
  ...common,
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  keyGenerator: emailKey,
  handler: tooMany('Too many password reset attempts. Please wait 15 minutes and try again.'),
});

// Overall cap per network, sized for a shared office or school connection
const authIpLimiter = rateLimit({
  ...common,
  windowMs: FIFTEEN_MINUTES,
  limit: 300,
  handler: tooMany('Too many requests from your network. Please wait a few minutes and try again.'),
});

module.exports = { loginLimiter, emailSendLimiter, resetLimiter, authIpLimiter };
