const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('@prisma/client');
const { generateTokens } = require('../utils/generateTokens');
const { hashToken } = require('../utils/tokenHash');
const { AppError } = require('../middleware/errorHandler');
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');
const { getEffectiveRole } = require('../utils/primaryAdmin');
const { getClientBaseUrl } = require('../utils/clientBaseUrl');

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
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

const buildEmailVerificationUrl = (user, req) => {
  const token = buildEmailVerificationToken(user);
  const baseUrl = getClientBaseUrl(req);
  // The token payload already contains userId; the backend no longer needs
  // the email as a query param. It is omitted here to avoid leaking it into
  // server/proxy logs and browser history.
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
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

const issueAuthSession = async (res, userId) => {
  const tokens = await generateTokens(userId);
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, getRefreshCookieOptions());
  const profile = await getUserProfile(userId);
  return { profile, accessToken: tokens.accessToken };
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
      if (existing.googleId && !existing.passwordHash) {
        throw new AppError('Email already registered using Google sign-in. Please continue with Google.', 409);
      }
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
      const verificationUrl = buildEmailVerificationUrl(user, req);
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

    if (user?.passwordHash) {
      // Signed with JWT_SECRET only.  The 30-minute expiry is the primary
      // invalidation mechanism; this keeps the secret simple and auditable.
      const token = jwt.sign(
        { userId: user.id, purpose: 'password-reset' },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );

      const baseUrl = getClientBaseUrl(req);
      const resetUrl = `${baseUrl}/forgot-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

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
    if (!user.passwordHash) {
      throw new AppError('This account uses Google sign-in. Please continue with Google.', 400);
    }

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

    const session = await issueAuthSession(res, user.id);
    logger.info('User logged in', { userId: user.id, email: user.email, role: user.role, ip: req.ip });
    res.json({ success: true, user: session.profile, accessToken: session.accessToken });
  } catch (err) {
    next(err);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const credential = String(req.body?.credential || '').trim();
    if (!credential) throw new AppError('Google credential is required', 400);

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new AppError('Google sign-in verification failed. Please try again.', 401);
    }

    const googleId = String(payload?.sub || '').trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    const fullName = String(payload?.name || '').trim();

    if (!googleId || !email) {
      throw new AppError('Google account is missing required profile information.', 400);
    }
    if (!payload?.email_verified) {
      throw new AppError('Your Google account email must be verified before you can continue.', 403);
    }

    const [existingByGoogleId, existingByEmail] = await Promise.all([
      prisma.user.findUnique({ where: { googleId } }),
      prisma.user.findUnique({ where: { email } }),
    ]);

    if (existingByGoogleId && existingByEmail && existingByGoogleId.id !== existingByEmail.id) {
      throw new AppError('Unable to link this Google account because the email is already in use by another user.', 409);
    }
    if (!existingByGoogleId && existingByEmail?.googleId && existingByEmail.googleId !== googleId) {
      throw new AppError('This email is already linked to a different Google account.', 409);
    }

    let userId;

    if (existingByGoogleId) {
      const updateData = { isEmailVerified: true };
      if (existingByGoogleId.email !== email && (!existingByEmail || existingByEmail.id === existingByGoogleId.id)) {
        updateData.email = email;
      }
      if (!existingByGoogleId.fullName && fullName) {
        updateData.fullName = fullName;
      }

      const updated = await prisma.user.update({
        where: { id: existingByGoogleId.id },
        data: updateData,
      });
      userId = updated.id;
    } else if (existingByEmail) {
      const updated = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId,
          fullName: existingByEmail.fullName || fullName || existingByEmail.email.split('@')[0],
          isEmailVerified: true,
        },
      });
      userId = updated.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          googleId,
          fullName: fullName || email.split('@')[0],
          role: 'APPLICANT',
          isEmailVerified: true,
        },
        select: { id: true },
      });
      userId = created.id;
    }

    const linkedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true },
    });

    const session = await issueAuthSession(res, userId);
    logger.info('User logged in with Google', {
      userId,
      email: linkedUser?.email || email,
      role: linkedUser?.role,
      ip: req.ip,
    });

    res.json({ success: true, user: session.profile, accessToken: session.accessToken });
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
    if (!user.passwordHash) throw new AppError('Password reset is not available for Google-only accounts.', 400);

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
    if (!user.passwordHash) {
      throw new AppError('Password changes are not available for Google-only accounts.', 400);
    }

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

module.exports = { register, login, googleAuth, verifyEmail, forgotPassword, resetPassword, refresh, logout, me, changePassword, updateProfile };
