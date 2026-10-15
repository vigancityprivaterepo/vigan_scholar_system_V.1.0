const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

// Applicants must sign in exactly as before two-step sign-in existed, even on a server where the
// two-step encryption key was never set.
process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
delete process.env.TWO_FACTOR_ENCRYPTION_KEY;

const fake = require('./helpers/fakePrisma');
fake.install();
const { login } = require('../src/controllers/authController');

const run = (req) => new Promise((resolve) => {
  const res = { statusCode: 200, cookies: {}, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; resolve({ res }); return res; };
  res.cookie = (name, value, options) => { res.cookies[name] = { value, options }; };
  login(req, res, (err) => resolve({ res, err }));
});

test('an applicant password sign-in is unchanged: session, no two-step fields, only the refresh cookie', async () => {
  fake.reset();
  fake.store.users.push({
    id: 'app-1', email: 'applicant@gmail.com', role: 'APPLICANT', fullName: 'An Applicant',
    passwordHash: await bcrypt.hash('correct-horse', 4), isEmailVerified: true, applications: [],
  });

  const { res, err } = await run({ body: { email: 'applicant@gmail.com', password: 'correct-horse' }, headers: {}, ip: '127.0.0.1' });

  assert.equal(err, undefined);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(Object.keys(res.body).sort(), ['accessToken', 'success', 'user']);
  assert.equal(res.body.user.email, 'applicant@gmail.com');
  assert.deepEqual(Object.keys(res.cookies), ['refreshToken']);
  assert.equal(fake.store.refreshTokens.at(-1).twoFactorVerified ?? false, false);
});
