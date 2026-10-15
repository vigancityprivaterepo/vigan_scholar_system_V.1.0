const test = require('node:test');
const assert = require('node:assert/strict');
const { authenticator } = require('otplib');

const {
  createSecret, verifyCode, generateBackupCodes, useBackupCode, normalizeCode, otpauthUrl,
} = require('../src/utils/twoFactor');

const NOW = Date.UTC(2026, 9, 15, 8, 0, 0);
const codeAt = (secret, epoch) => authenticator.clone({ epoch }).generate(secret);

test('accepts the current code and codes one step either side (phone clock slightly off)', () => {
  const secret = createSecret();
  for (const offset of [0, -30000, 30000]) {
    const result = verifyCode(secret, codeAt(secret, NOW + offset), null, NOW);
    assert.equal(result.ok, true, `offset ${offset}ms should be accepted`);
  }
});

test('rejects a code from 90 seconds ago', () => {
  const secret = createSecret();
  assert.equal(verifyCode(secret, codeAt(secret, NOW - 90000), null, NOW).ok, false);
});

test('rejects the same code a second time (replay)', () => {
  const secret = createSecret();
  const code = codeAt(secret, NOW);
  const first = verifyCode(secret, code, null, NOW);
  assert.equal(first.ok, true);
  assert.equal(verifyCode(secret, code, first.step, NOW).ok, false);
});

test('ignores spaces typed inside the code', () => {
  const secret = createSecret();
  const code = codeAt(secret, NOW);
  assert.equal(verifyCode(secret, `${code.slice(0, 3)} ${code.slice(3)}`, null, NOW).ok, true);
});

test('otpauth URL names the issuer and account', () => {
  const url = otpauthUrl('staff@vigancity.gov.ph', 'JBSWY3DPEHPK3PXP');
  assert.match(url, /^otpauth:\/\/totp\//);
  assert.match(url, /issuer=Vigan%20Scholarship/);
  assert.match(url, /staff%40vigancity\.gov\.ph/);
});

test('generates 8 backup codes in XXXXX-XXXXX form, stored only as hashes', () => {
  const { codes, stored } = generateBackupCodes('user-1');
  assert.equal(codes.length, 8);
  assert.equal(stored.length, 8);
  for (const code of codes) assert.match(code, /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  for (const entry of stored) {
    assert.equal(entry.usedAt, null);
    assert.ok(!codes.includes(entry.hash));
    assert.ok(!codes.map(normalizeCode).includes(entry.hash));
  }
});

test('a backup code works once, typed in lower case, then is spent', () => {
  const { codes, stored } = generateBackupCodes('user-1');
  const typed = codes[2].toLowerCase();
  const first = useBackupCode('user-1', stored, typed, new Date(NOW));
  assert.equal(first.ok, true);
  assert.equal(first.stored.filter((e) => e.usedAt).length, 1);
  assert.equal(useBackupCode('user-1', first.stored, typed, new Date(NOW)).ok, false);
});

test('a backup code from one user does not work for another', () => {
  const { codes, stored } = generateBackupCodes('user-1');
  assert.equal(useBackupCode('user-2', stored, codes[0]).ok, false);
});
