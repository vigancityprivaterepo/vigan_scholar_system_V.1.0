const test = require('node:test');
const assert = require('node:assert/strict');

process.env.PRIMARY_ADMIN_EMAIL = 'primary@vigancity.gov.ph';
const fake = require('./helpers/fakePrisma');
const {
  isStaff, isTrustedDevice, createTrustedDevice, resetTwoFactor, trustedCookieOptions, TRUSTED_COOKIE,
} = require('../src/services/twoFactorService');

const prisma = new fake.FakePrismaClient();

test('a trusted computer counts for the staff member who trusted it, not for someone else on the same PC', async () => {
  fake.reset();
  const raw = await createTrustedDevice(prisma, 'staff-a', 'Mozilla/5.0');
  assert.equal(await isTrustedDevice(prisma, 'staff-a', raw), true);
  assert.equal(await isTrustedDevice(prisma, 'staff-b', raw), false);
  assert.notEqual(fake.store.trustedDevices[0].tokenHash, raw, 'only a hash is stored');
});

test('an expired or unknown trusted-computer token is not trusted', async () => {
  fake.reset();
  const raw = await createTrustedDevice(prisma, 'staff-a', 'Mozilla/5.0');
  fake.store.trustedDevices[0].expiresAt = new Date(Date.now() - 1000);
  assert.equal(await isTrustedDevice(prisma, 'staff-a', raw), false);
  assert.equal(await isTrustedDevice(prisma, 'staff-a', 'not-a-real-token'), false);
  assert.equal(await isTrustedDevice(prisma, 'staff-a', ''), false);
});

test('trusting a computer lasts 30 days', async () => {
  fake.reset();
  await createTrustedDevice(prisma, 'staff-a', null);
  const days = (fake.store.trustedDevices[0].expiresAt - Date.now()) / 86400000;
  assert.ok(days > 29.9 && days <= 30, `expected ~30 days, got ${days}`);
  assert.equal(trustedCookieOptions().maxAge, 30 * 86400000);
  assert.equal(trustedCookieOptions().httpOnly, true);
  assert.equal(trustedCookieOptions().path, '/api/auth');
  assert.equal(TRUSTED_COOKIE, 'staff_trusted_device');
});

test('reset clears the authenticator, backup codes, trusted computers and sessions', async () => {
  fake.reset();
  fake.store.users.push({
    id: 'staff-a', role: 'ADMIN', email: 'a@x', totpSecret: 's', totpPendingSecret: 'p',
    totpEnabledAt: new Date(), totpLastUsedStep: 5, totpBackupCodes: [{ hash: 'h', usedAt: null }],
  });
  fake.store.refreshTokens.push({ userId: 'staff-a', token: 't1' }, { userId: 'other', token: 't2' });
  await createTrustedDevice(prisma, 'staff-a', null);
  await createTrustedDevice(prisma, 'other', null);

  await resetTwoFactor(prisma, 'staff-a');

  const user = fake.store.users[0];
  for (const field of ['totpSecret', 'totpPendingSecret', 'totpEnabledAt', 'totpLastUsedStep', 'totpBackupCodes']) {
    assert.equal(user[field], null, `${field} cleared`);
  }
  assert.deepEqual(fake.store.trustedDevices.map((d) => d.userId), ['other']);
  assert.deepEqual(fake.store.refreshTokens.map((t) => t.userId), ['other']);
});

test('only the four staff roles count as staff', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER']) assert.equal(isStaff({ role, email: 'x@y' }), true, role);
  assert.equal(isStaff({ role: 'APPLICANT', email: 'x@y' }), false);
  assert.equal(isStaff({ role: 'APPLICANT', email: 'primary@vigancity.gov.ph' }), true, 'primary admin email is treated as SUPER_ADMIN');
});
