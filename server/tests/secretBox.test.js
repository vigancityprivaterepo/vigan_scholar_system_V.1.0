const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const KEY = crypto.randomBytes(32).toString('base64');
const withKey = (key, fn) => {
  const previous = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (key === undefined) delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
  else process.env.TWO_FACTOR_ENCRYPTION_KEY = key;
  try { return fn(); } finally {
    if (previous === undefined) delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
    else process.env.TWO_FACTOR_ENCRYPTION_KEY = previous;
  }
};

const { encrypt, decrypt, isConfigured } = require('../src/utils/secretBox');

test('encrypt then decrypt returns the original secret', () => {
  withKey(KEY, () => {
    const boxed = encrypt('JBSWY3DPEHPK3PXP');
    assert.notEqual(boxed, 'JBSWY3DPEHPK3PXP');
    assert.equal(decrypt(boxed), 'JBSWY3DPEHPK3PXP');
  });
});

test('decrypt rejects a tampered value', () => {
  withKey(KEY, () => {
    const boxed = encrypt('JBSWY3DPEHPK3PXP');
    const [iv, tag, data] = boxed.split('.');
    const flipped = (data[0] === 'A' ? 'B' : 'A') + data.slice(1);
    assert.throws(() => decrypt([iv, tag, flipped].join('.')));
  });
});

test('isConfigured is false without a key or with a 16-byte key', () => {
  withKey(undefined, () => assert.equal(isConfigured(), false));
  withKey(crypto.randomBytes(16).toString('base64'), () => assert.equal(isConfigured(), false));
  withKey(KEY, () => assert.equal(isConfigured(), true));
});
