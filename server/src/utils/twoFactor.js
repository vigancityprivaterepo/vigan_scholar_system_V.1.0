const crypto = require('crypto');
const { authenticator } = require('otplib');

// Authenticator-app codes (TOTP, RFC 6238) and one-time backup codes for staff sign-in.

const STEP_SECONDS = 30;
const ISSUER = 'Vigan Scholarship';
const BACKUP_CODE_COUNT = 8;
// No 0/O or 1/I, so codes can be read back from paper without guessing.
const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const normalizeCode = (code) => String(code || '').replace(/[\s-]/g, '').toUpperCase();

const createSecret = () => authenticator.generateSecret();

const otpauthUrl = (email, secret) => authenticator.keyuri(email, ISSUER, secret);

// ok is false for a wrong code, a code outside ±1 step, or a step already used (replay).
const verifyCode = (secret, code, lastUsedStep, now = Date.now()) => {
  const token = normalizeCode(code);
  if (!/^\d{6}$/.test(token)) return { ok: false, step: null };
  const delta = authenticator.clone({ epoch: now, window: 1 }).checkDelta(token, secret);
  if (delta === null) return { ok: false, step: null };
  const step = Math.floor(now / (STEP_SECONDS * 1000)) + delta;
  if (lastUsedStep !== null && lastUsedStep !== undefined && step <= lastUsedStep) return { ok: false, step: null };
  return { ok: true, step };
};

const hashBackupCode = (userId, code) =>
  crypto.createHash('sha256').update(`${userId}:${normalizeCode(code)}`).digest('hex');

const randomBackupCode = () => {
  const chars = Array.from(crypto.randomBytes(10), (byte) => BACKUP_ALPHABET[byte % BACKUP_ALPHABET.length]).join('');
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
};

const generateBackupCodes = (userId) => {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, randomBackupCode);
  return { codes, stored: codes.map((code) => ({ hash: hashBackupCode(userId, code), usedAt: null })) };
};

const useBackupCode = (userId, stored, code, now = new Date()) => {
  const entries = Array.isArray(stored) ? stored : [];
  const hash = hashBackupCode(userId, code);
  const index = entries.findIndex((entry) => entry.hash === hash && !entry.usedAt);
  if (index === -1) return { ok: false, stored: entries };
  const next = entries.map((entry, i) => (i === index ? { ...entry, usedAt: now.toISOString() } : entry));
  return { ok: true, stored: next };
};

module.exports = {
  STEP_SECONDS,
  normalizeCode,
  createSecret,
  otpauthUrl,
  verifyCode,
  generateBackupCodes,
  useBackupCode,
};
