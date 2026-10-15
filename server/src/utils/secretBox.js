const crypto = require('crypto');

// AES-256-GCM for staff authenticator secrets stored in the database.
// The key comes from TWO_FACTOR_ENCRYPTION_KEY (32 random bytes, base64) and is read on
// every call, so a missing key is detected at use time rather than cached at startup.

const ALGORITHM = 'aes-256-gcm';

const readKey = () => {
  const raw = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  return key.length === 32 ? key : null;
};

const isConfigured = () => readKey() !== null;

const requireKey = () => {
  const key = readKey();
  if (!key) throw new Error('TWO_FACTOR_ENCRYPTION_KEY is missing or not 32 bytes of base64');
  return key;
};

// Returns "iv.tag.ciphertext", each part base64.
const encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, requireKey(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64')).join('.');
};

const decrypt = (boxed) => {
  const [iv, tag, data] = String(boxed).split('.').map((part) => Buffer.from(part || '', 'base64'));
  const decipher = crypto.createDecipheriv(ALGORITHM, requireKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

module.exports = { isConfigured, encrypt, decrypt };
