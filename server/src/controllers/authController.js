const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { generateTokens } = require('../utils/generateTokens');
const { hashToken } = require('../utils/tokenHash');
const { AppError } = require('../middleware/errorHandler');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');
const { getEffectiveRole } = require('../utils/primaryAdmin');

const prisma = new PrismaClient();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFRESH_COOKIE_NAME = 'refreshToken';

const parseCookies = (req) => {
  const raw = String(req.headers.cookie || '');
  if (!raw) return {};
  return raw.split(';').reduce((acc, chunk) => {
    const [name, ...rest] = chunk.split('=');
    const key = String(name || '').trim();
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
};

const getRefreshTokenFromRequest = (req) => {
  const cookies = parseCookies(req);
  return cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken || null;
};

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// clearCookie must NOT receive maxAge — Express 5 deprecates it and will
// ignore it entirely.  Use a separate options object without that field.
const getClearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
});

// Builds a short-lived JWT for email-address verification.
// Signed with JWT_SECRET only — no user data embedded in the secret.
const buildEmailVerificationToken = (user) =>
  jwt.sign(
    { userId: user.id, purpose: 'email-verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

const buildEmailVerificationUrl = (user) => {
  const token = buildEmailVerificationToken(user);
  // The token payload already contains userId; the backend no longer needs
  // the email as a query param. It is omitted here to avoid leaking it into
  // server/proxy logs and browser history.
  return `${process.env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
};

const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      applications: {
        select: { contact: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: getEffectiveRole(user),
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    contact: user.applications[0]?.contact || '',
  };
};

const register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      throw new AppError('All fields are required', 400);
    }
    if (!emailPattern.test(email.trim())) {
      throw new AppError('Enter a valid email address', 400);
    }
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      if (existing.role !== 'APPLICANT' || existing.isEmailVerified) {
        throw new AppError('Email already registered', 409);
      }

      // Unverified applicant re-registering — clean up the stale account.
      await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // passwordHash is not included in the select — it is not needed after creation.
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, fullName: fullName.trim(), role: 'APPLICANT' },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    try {
      const verificationUrl = buildEmailVerificationUrl(user);
      await sendEmail({
        to: user.email,
        subject: 'Confirm Your Scholarship Portal Email',
        template: 'emailVerification',
        data: { name: user.fullName, verificationUrl },
        throwOnError: true,
      });
    } catch (mailErr) {
      await prisma.user.delete({ where: { id: user.id } });
      throw new AppError('We could not send the confirmation email. Please check the email address and try again.', 400);
    }

    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email for the confirmation link before signing in.',
    });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);

    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) throw new AppError('Enter a valid email address', 400);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      // Signed with JWT_SECRET only.  The 30-minute expiry is the primary
      // invalidation mechanism; this keeps the secret simple and auditable.
      const token = jwt.sign(
        { userId: user.id, purpose: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );

      const resetUrl = `${process.env.CLIENT_URL}/forgot-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

      await sendEmail({
        to: user.email,
        subject: 'Reset Your Scholarship Portal Password',
        template: 'passwordReset',
        data: { name: user.fullName, resetUrl },
      });

      logger.info('Password reset email sent', { userId: user.id, email: user.email, ip: req.ip });
    }

    res.json({
      success: true,
      message: 'If the email is registered, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password are required', 400);

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) throw new AppError('Invalid email or password', 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn('Failed login attempt', { email: normalizedEmail, ip: req.ip });
      throw new AppError('Invalid email or password', 401);
    }

    // Email verification is required for ALL roles — including admin accounts.
    // Staff accounts are seeded/invited with isEmailVerified = true already.
    if (!user.isEmailVerified) {
      logger.warn('Login blocked — email not verified', { email: normalizedEmail, ip: req.ip });
      throw new AppError('Please confirm your email address before signing in.', 403);
    }

    const tokens = await generateTokens(user.id);
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());

    logger.info('User logged in', { userId: user.id, email: user.email, role: user.role, ip: req.ip });

    const profile = await getUserProfile(user.id);
    res.json({ success: true, user: profile, accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const token = req.query.token || req.body.token;
    if (!token) throw new AppError('Verification token is required', 400);

    // Decode the token first to extract userId — no separate email param needed.
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new AppError('Invalid or expired confirmation link', 400);
    }

    if (decoded.purpose !== 'email-verification' || !decoded.userId) {
      throw new AppError('Invalid or expired confirmation link', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw new AppError('Invalid or expired confirmation link', 400);

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    logger.info('Email verified', { userId: user.id, email: user.email });

    res.json({ success: true, message: 'Email confirmed successfully. You may now sign in.' });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) {
      throw new AppError('Token, email, and new password are required', 400);
    }
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) throw new AppError('Invalid or expired reset link', 400);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.userId !== user.id || decoded.purpose !== 'password-reset') {
        throw new Error('invalid');
      }
    } catch {
      throw new AppError('Invalid or expired reset link', 400);
    }

    const isSamePassword = await bcrypt.compare(password, user.passwordHash);
    if (isSamePassword) {
      throw new AppError('New password must be different from your current password', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    logger.info('Password reset completed', { userId: user.id, email: user.email, ip: req.ip });

    res.json({ success: true, message: 'Password reset successfully. You may now sign in.' });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { token: tokenHash } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    await prisma.refreshToken.delete({ where: { token: tokenHash } });

    const tokens = await generateTokens(decoded.userId);
    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());
    res.json({ success: true, accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: hashToken(refreshToken) } });
    }
    res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await getUserProfile(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new password are required', 400);
    }
    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) throw new AppError('New password must be different from your current password', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { fullName, contact } = req.body;
    if (!fullName || !fullName.trim()) {
      throw new AppError('Full name is required', 400);
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { fullName: fullName.trim() },
    });

    if (contact !== undefined) {
      const normalizedContact = String(contact).trim();
      if (normalizedContact && !/^(09|\+639)\d{9}$/.test(normalizedContact.replace(/\s/g, ''))) {
        throw new AppError('Enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).', 400);
      }

      await prisma.application.updateMany({
        where: { applicantId: req.user.id },
        data: { contact: normalizedContact || null },
      });
    }

    const profile = await getUserProfile(req.user.id);
    res.json({ success: true, message: 'Profile updated successfully.', user: profile });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, verifyEmail, forgotPassword, resetPassword, refresh, logout, me, changePassword, updateProfile };
