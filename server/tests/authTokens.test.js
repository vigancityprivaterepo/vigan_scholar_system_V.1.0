const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.PRIMARY_ADMIN_EMAIL = 'primary@vigancity.gov.ph';

const fake = require('./helpers/fakePrisma');
fake.install();
const { hashToken } = require('../src/utils/tokenHash');
const { authenticate } = require('../src/middleware/authMiddleware');
const { refresh } = require('../src/controllers/authController');

const runMiddleware = (token) => new Promise((resolve) => {
  authenticate({ headers: { authorization: `Bearer ${token}` } }, {}, (err) => resolve(err));
});

const callRefresh = (refreshToken) => new Promise((resolve) => {
  const res = {
    cookies: {},
    cookie(name, value) { this.cookies[name] = value; },
    json(body) { resolve({ body, cookies: this.cookies }); },
  };
  refresh({ headers: { cookie: `refreshToken=${refreshToken}` }, body: {} }, res, (err) => resolve({ err }));
});

const seedSession = (role, twoFactorVerified) => {
  fake.store.users.push({ id: 'u1', email: 'someone@example.com', role, fullName: 'Someone' });
  const token = jwt.sign({ userId: 'u1' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  fake.store.refreshTokens.push({ id: 'r1', userId: 'u1', token: hashToken(token), expiresAt: new Date(Date.now() + 86400000), twoFactorVerified });
  return token;
};

test('authenticate rejects a token that carries a purpose, without touching the database', async () => {
  fake.reset();
  fake.setFailOnAccess(true);
  const challenge = jwt.sign({ userId: 'u1', purpose: '2fa-challenge' }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const err = await runMiddleware(challenge);
  assert.equal(err?.statusCode, 401);
});

test('refresh refuses a staff session that never passed two-step sign-in', async () => {
  fake.reset();
  const token = seedSession('REVIEWER', false);
  const { err } = await callRefresh(token);
  assert.equal(err?.statusCode, 401);
  assert.equal(err?.message, 'Please sign in again.');
  assert.equal(fake.store.refreshTokens.length, 0, 'the unverified staff token is deleted');
});

test('refresh keeps a verified staff session and carries the flag to the new token', async () => {
  fake.reset();
  const token = seedSession('ADMIN', true);
  const { body, err } = await callRefresh(token);
  assert.equal(err, undefined);
  assert.ok(body.accessToken);
  assert.equal(fake.store.refreshTokens.length, 1);
  assert.equal(fake.store.refreshTokens[0].twoFactorVerified, true);
});

test('refresh still works for an applicant session with no two-step flag', async () => {
  fake.reset();
  const token = seedSession('APPLICANT', false);
  const { body, err } = await callRefresh(token);
  assert.equal(err, undefined);
  assert.ok(body.accessToken);
});
