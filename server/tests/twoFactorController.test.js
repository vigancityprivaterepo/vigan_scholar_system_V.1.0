const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');

process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.PRIMARY_ADMIN_EMAIL = 'primary@vigancity.gov.ph';
const KEY = crypto.randomBytes(32).toString('base64');
process.env.TWO_FACTOR_ENCRYPTION_KEY = KEY;

const fake = require('./helpers/fakePrisma');
fake.install();
const { encrypt } = require('../src/utils/secretBox');
const { createSecret } = require('../src/utils/twoFactor');
const { createTrustedDevice } = require('../src/services/twoFactorService');
const {
  startSecondStepIfStaff, setup, enable, verify,
} = require('../src/controllers/twoFactorController');

const WRONG_CODE = "That code didn't work. Check the time on your phone and try again.";
const EXPIRED = 'Your sign-in took too long. Please sign in again.';

const mockRes = () => {
  const res = { statusCode: 200, cookies: {}, body: undefined, sent: false };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; res.sent = true; return res; };
  res.cookie = (name, value, options) => { res.cookies[name] = { value, options }; };
  return res;
};
const run = (handler, req) => new Promise((resolve) => {
  const res = mockRes();
  const done = () => resolve({ res, err: undefined });
  const originalJson = res.json;
  res.json = (body) => { originalJson(body); done(); return res; };
  handler(req, res, (err) => resolve({ res, err }));
});

const staff = (extra = {}) => {
  const user = { id: 'staff-1', email: 'staff@vigancity.gov.ph', role: 'REVIEWER', fullName: 'Staff One', isEmailVerified: true, applications: [], ...extra };
  fake.store.users.push(user);
  return user;
};
const challengeFor = (userId, expiresIn = '10m') => jwt.sign({ userId, purpose: '2fa-challenge' }, process.env.JWT_SECRET, { expiresIn });
const enrolled = () => {
  const secret = createSecret();
  const user = staff({ totpSecret: encrypt(secret), totpEnabledAt: new Date(), totpLastUsedStep: null, totpBackupCodes: [] });
  return { user, secret };
};

test('an applicant is not stopped: nothing is sent and normal sign-in continues', async () => {
  fake.reset();
  const res = mockRes();
  const handled = await startSecondStepIfStaff({ headers: {} }, res, { id: 'a1', role: 'APPLICANT', email: 'a@gmail.com' });
  assert.equal(handled, false);
  assert.equal(res.sent, false);
});

test('staff without two-step sign-in are sent to setup with a challenge token', async () => {
  fake.reset();
  const user = staff();
  const res = mockRes();
  assert.equal(await startSecondStepIfStaff({ headers: {} }, res, user), true);
  assert.equal(res.body.twoFactorSetupRequired, true);
  assert.equal(jwt.verify(res.body.challengeToken, process.env.JWT_SECRET).purpose, '2fa-challenge');
  assert.equal(res.body.accessToken, undefined, 'no session yet');
});

test('staff with two-step sign-in are asked for a code', async () => {
  fake.reset();
  const { user } = enrolled();
  const res = mockRes();
  await startSecondStepIfStaff({ headers: {} }, res, user);
  assert.equal(res.body.twoFactorRequired, true);
  assert.equal(res.body.accessToken, undefined);
});

test('staff on their own trusted computer go straight in with a verified session', async () => {
  fake.reset();
  const { user } = enrolled();
  const raw = await createTrustedDevice(new fake.FakePrismaClient(), user.id, 'ua');
  const res = mockRes();
  await startSecondStepIfStaff({ headers: { cookie: `staff_trusted_device=${raw}` } }, res, user);
  assert.ok(res.body.accessToken);
  assert.equal(fake.store.refreshTokens.at(-1).twoFactorVerified, true);
});

test('staff sign-in is refused with a clear message when the encryption key is missing', async () => {
  fake.reset();
  const user = staff();
  delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
  try {
    const res = mockRes();
    await startSecondStepIfStaff({ headers: {} }, res, user);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.message, 'Two-step sign-in is not configured on this server. Contact MIS.');
  } finally {
    process.env.TWO_FACTOR_ENCRYPTION_KEY = KEY;
  }
});

test('an expired challenge gives the "took too long" message', async () => {
  fake.reset();
  const { user, secret } = enrolled();
  const expired = jwt.sign({ userId: user.id, purpose: '2fa-challenge', exp: Math.floor(Date.now() / 1000) - 5 }, process.env.JWT_SECRET);
  const { err } = await run(verify, { body: { challengeToken: expired, code: authenticator.generate(secret) }, headers: {} });
  assert.equal(err?.statusCode, 401);
  assert.equal(err?.message, EXPIRED);
});

test('a wrong code gives the check-your-phone message', async () => {
  fake.reset();
  const { user } = enrolled();
  const { err } = await run(verify, { body: { challengeToken: challengeFor(user.id), code: '000000' }, headers: {} });
  assert.equal(err?.statusCode, 400);
  assert.equal(err?.message, WRONG_CODE);
});

test('a correct code signs in, records the step, and can trust the computer', async () => {
  fake.reset();
  const { user, secret } = enrolled();
  const { res, err } = await run(verify, {
    body: { challengeToken: challengeFor(user.id), code: authenticator.generate(secret), trustDevice: true },
    headers: { 'user-agent': 'test-browser' },
  });
  assert.equal(err, undefined);
  assert.ok(res.body.accessToken);
  assert.ok(Number.isInteger(fake.store.users[0].totpLastUsedStep));
  assert.ok(res.cookies.staff_trusted_device?.value);
  assert.equal(res.cookies.staff_trusted_device.options.httpOnly, true);
  assert.equal(fake.store.refreshTokens.at(-1).twoFactorVerified, true);
});

test('setup refuses when two-step sign-in is already on', async () => {
  fake.reset();
  const { user } = enrolled();
  const { err } = await run(setup, { body: { challengeToken: challengeFor(user.id) }, headers: {} });
  assert.equal(err?.statusCode, 400);
});

test('setup then enable turns it on and returns 8 backup codes once', async () => {
  fake.reset();
  const user = staff();
  const token = challengeFor(user.id);
  const { res: setupRes } = await run(setup, { body: { challengeToken: token }, headers: {} });
  assert.match(setupRes.body.qrDataUrl, /^data:image\/png;base64,/);
  const { res, err } = await run(enable, {
    body: { challengeToken: token, code: authenticator.generate(setupRes.body.manualKey), trustDevice: false },
    headers: {},
  });
  assert.equal(err, undefined);
  assert.equal(res.body.backupCodes.length, 8);
  assert.ok(res.body.accessToken);
  assert.ok(fake.store.users[0].totpEnabledAt);
  assert.equal(fake.store.users[0].totpPendingSecret, null);
  assert.equal(res.cookies.staff_trusted_device, undefined, 'not trusted unless asked');
});

test('a backup code signs in once and is then spent', async () => {
  fake.reset();
  const user = staff();
  const token = challengeFor(user.id);
  const { res: setupRes } = await run(setup, { body: { challengeToken: token }, headers: {} });
  const { res: enabled } = await run(enable, { body: { challengeToken: token, code: authenticator.generate(setupRes.body.manualKey) }, headers: {} });
  const backup = enabled.body.backupCodes[0];
  fake.store.refreshTokens = []; // signed out after setup; two sessions in the same second would share a token
  const first = await run(verify, { body: { challengeToken: challengeFor(user.id), backupCode: backup }, headers: {} });
  assert.ok(first.res.body?.accessToken);
  const second = await run(verify, { body: { challengeToken: challengeFor(user.id), backupCode: backup }, headers: {} });
  assert.equal(second.err?.statusCode, 400);
});
