const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const secretBox = require('../utils/secretBox');
const {
  createSecret, otpauthUrl, verifyCode, generateBackupCodes, useBackupCode,
} = require('../utils/twoFactor');
const {
  TRUSTED_COOKIE, isStaff, isTrustedDevice, createTrustedDevice, trustedCookieOptions,
} = require('../services/twoFactorService');

const prisma = new PrismaClient();

const CHALLENGE_PURPOSE = '2fa-challenge';
const NOT_CONFIGURED = 'Two-step sign-in is not configured on this server. Contact MIS.';
const WRONG_CODE = "That code didn't work. Check the time on your phone and try again.";
const WRONG_BACKUP_CODE = "That backup code didn't work, or it has already been used.";
const EXPIRED = 'Your sign-in took too long. Please sign in again.';

// authController loads this module, so it is required lazily to avoid a circular import.
const auth = () => require('./authController');

const signChallenge = (userId) =>
  jwt.sign({ userId, purpose: CHALLENGE_PURPOSE }, process.env.JWT_SECRET, { expiresIn: '10m' });

const loadChallengedUser = async (challengeToken) => {
  let decoded;
  try {
    decoded = jwt.verify(String(challengeToken || ''), process.env.JWT_SECRET);
  } catch {
    throw new AppError(EXPIRED, 401);
  }
  if (decoded.purpose !== CHALLENGE_PURPOSE) throw new AppError(EXPIRED, 401);
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || !isStaff(user)) throw new AppError(EXPIRED, 401);
  if (!secretBox.isConfigured()) throw new AppError(NOT_CONFIGURED, 503);
  return user;
};

const finishSignIn = async (req, res, user, { trustDevice, extra = {} } = {}) => {
  if (trustDevice) {
    const raw = await createTrustedDevice(prisma, user.id, req.headers?.['user-agent']);
    res.cookie(TRUSTED_COOKIE, raw, trustedCookieOptions());
  }
  const session = await auth().issueAuthSession(res, user.id, { twoFactorVerified: true });
  logger.info('Staff two-step sign-in passed', { userId: user.id, trustedNewDevice: Boolean(trustDevice), ip: req.ip });
  res.json({ success: true, user: session.profile, accessToken: session.accessToken, ...extra });
};

// Called by login and googleAuth right before a session would be issued.
// Returns false for applicants (the caller continues as before) and true once it has responded.
const startSecondStepIfStaff = async (req, res, user) => {
  if (!isStaff(user)) return false;

  if (!secretBox.isConfigured()) {
    logger.error('Staff sign-in refused: TWO_FACTOR_ENCRYPTION_KEY is missing or invalid', { userId: user.id });
    res.status(503).json({ success: false, message: NOT_CONFIGURED });
    return true;
  }

  const cookies = auth().parseCookies(req);
  const enabled = Boolean(user.totpEnabledAt && user.totpSecret);
  if (enabled && await isTrustedDevice(prisma, user.id, cookies[TRUSTED_COOKIE])) {
    await finishSignIn(req, res, user);
    return true;
  }

  res.json({
    success: true,
    [enabled ? 'twoFactorRequired' : 'twoFactorSetupRequired']: true,
    challengeToken: signChallenge(user.id),
  });
  return true;
};

const setup = async (req, res, next) => {
  try {
    const user = await loadChallengedUser(req.body?.challengeToken);
    if (user.totpEnabledAt) throw new AppError('Two-step sign-in is already set up.', 400);

    const secret = createSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpPendingSecret: secretBox.encrypt(secret) } });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl(user.email, secret));
    res.json({ success: true, qrDataUrl, manualKey: secret });
  } catch (err) {
    next(err);
  }
};

const enable = async (req, res, next) => {
  try {
    const user = await loadChallengedUser(req.body?.challengeToken);
    if (user.totpEnabledAt) throw new AppError('Two-step sign-in is already set up.', 400);
    if (!user.totpPendingSecret) throw new AppError(EXPIRED, 401);

    const result = verifyCode(secretBox.decrypt(user.totpPendingSecret), req.body?.code, null);
    if (!result.ok) throw new AppError(WRONG_CODE, 400);

    const { codes, stored } = generateBackupCodes(user.id);
    // Conditional on it still being off, so two confirms at once can't hand out two sets of codes.
    const turnedOn = await prisma.user.updateMany({
      where: { id: user.id, totpEnabledAt: null },
      data: {
        totpSecret: user.totpPendingSecret,
        totpPendingSecret: null,
        totpEnabledAt: new Date(),
        totpLastUsedStep: result.step,
        totpBackupCodes: stored,
      },
    });
    if (turnedOn.count === 0) throw new AppError('Two-step sign-in is already set up.', 400);
    await prisma.activityLog.create({ data: { performedById: user.id, action: 'Two-step sign-in set up' } });

    await finishSignIn(req, res, user, { trustDevice: Boolean(req.body?.trustDevice), extra: { backupCodes: codes } });
  } catch (err) {
    next(err);
  }
};

const verify = async (req, res, next) => {
  try {
    const user = await loadChallengedUser(req.body?.challengeToken);
    if (!user.totpEnabledAt || !user.totpSecret) throw new AppError(EXPIRED, 401);

    if (req.body?.backupCode) {
      const used = useBackupCode(user.id, user.totpBackupCodes, req.body.backupCode);
      if (!used.ok) throw new AppError(WRONG_BACKUP_CODE, 400);
      // Only if the row is unchanged since it was read, so one backup code can't sign in twice at once.
      const spent = await prisma.user.updateMany({
        where: { id: user.id, updatedAt: user.updatedAt },
        data: { totpBackupCodes: used.stored },
      });
      if (spent.count === 0) throw new AppError(WRONG_BACKUP_CODE, 400);
      logger.warn('Staff signed in with a backup code', { userId: user.id, ip: req.ip });
    } else {
      const result = verifyCode(secretBox.decrypt(user.totpSecret), req.body?.code, user.totpLastUsedStep);
      if (!result.ok) throw new AppError(WRONG_CODE, 400);
      // Only if no request has used this step (or a later one) meanwhile: the same code can't sign in twice.
      const recorded = await prisma.user.updateMany({
        where: { id: user.id, OR: [{ totpLastUsedStep: null }, { totpLastUsedStep: { lt: result.step } }] },
        data: { totpLastUsedStep: result.step },
      });
      if (recorded.count === 0) throw new AppError(WRONG_CODE, 400);
    }

    await finishSignIn(req, res, user, { trustDevice: Boolean(req.body?.trustDevice) });
  } catch (err) {
    next(err);
  }
};

module.exports = { startSecondStepIfStaff, setup, enable, verify };
