const crypto = require('crypto');
const { ADMIN_ROLES } = require('../middleware/roleGuard');
const { getEffectiveRole } = require('../utils/primaryAdmin');

// Staff two-step sign-in: who it applies to, trusted computers, and resets.
// `prisma` is passed in so the functions can be tested without a database.

const TRUSTED_COOKIE = 'staff_trusted_device';
const TRUSTED_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const isStaff = (user) => Boolean(user) && ADMIN_ROLES.includes(getEffectiveRole(user));

const trustedCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: TRUSTED_DAYS * DAY_MS,
});

const isTrustedDevice = async (prisma, userId, rawToken) => {
  if (!rawToken) return false;
  const device = await prisma.trustedDevice.findUnique({ where: { tokenHash: sha256(rawToken) } });
  if (!device || device.userId !== userId || new Date(device.expiresAt) <= new Date()) return false;
  await prisma.trustedDevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } });
  return true;
};

const createTrustedDevice = async (prisma, userId, userAgent) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.trustedDevice.create({
    data: {
      userId,
      tokenHash: sha256(rawToken),
      userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
      expiresAt: new Date(Date.now() + TRUSTED_DAYS * DAY_MS),
    },
  });
  return rawToken;
};

// Back to "not set up": the next sign-in goes to setup, and every device and session is signed out.
const resetTwoFactor = async (prisma, userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpSecret: null,
      totpPendingSecret: null,
      totpEnabledAt: null,
      totpLastUsedStep: null,
      totpBackupCodes: null,
    },
  });
  await prisma.trustedDevice.deleteMany({ where: { userId } });
  await prisma.refreshToken.deleteMany({ where: { userId } });
};

module.exports = {
  TRUSTED_COOKIE,
  TRUSTED_DAYS,
  isStaff,
  trustedCookieOptions,
  isTrustedDevice,
  createTrustedDevice,
  resetTwoFactor,
};
