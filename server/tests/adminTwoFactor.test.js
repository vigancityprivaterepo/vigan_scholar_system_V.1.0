const test = require('node:test');
const assert = require('node:assert/strict');

process.env.PRIMARY_ADMIN_EMAIL = 'primary@vigancity.gov.ph';
const fake = require('./helpers/fakePrisma');
fake.install();
const { resetUserTwoFactor, listUsers } = require('../src/controllers/adminController');

const run = (handler, req) => new Promise((resolve) => {
  const res = { body: undefined, status() { return res; }, json(body) { res.body = body; resolve({ res }); } };
  handler(req, res, (err) => resolve({ err }));
});

const primary = { id: 'p1', email: 'primary@vigancity.gov.ph', role: 'SUPER_ADMIN', fullName: 'Primary' };
const seed = () => {
  fake.reset();
  fake.store.users.push(
    { ...primary, totpEnabledAt: new Date(), totpSecret: 'x' },
    { id: 's1', email: 'reviewer@vigancity.gov.ph', role: 'REVIEWER', fullName: 'Rita Reviewer', totpEnabledAt: new Date(), totpSecret: 'x', totpBackupCodes: [], createdAt: new Date() },
    { id: 's2', email: 'other@vigancity.gov.ph', role: 'SUPER_ADMIN', fullName: 'Other Super', createdAt: new Date() },
    { id: 'a1', email: 'applicant@gmail.com', role: 'APPLICANT', fullName: 'An Applicant', createdAt: new Date() },
  );
  fake.store.refreshTokens.push({ userId: 's1', token: 't1' });
};

test('only the primary admin can reset someone\'s two-step sign-in', async () => {
  seed();
  const { err } = await run(resetUserTwoFactor, { user: { id: 's2', email: 'other@vigancity.gov.ph', role: 'SUPER_ADMIN' }, params: { id: 's1' } });
  assert.equal(err?.statusCode, 403);
  assert.ok(fake.store.users.find((u) => u.id === 's1').totpEnabledAt, 'nothing was reset');
});

test('the primary admin\'s own two-step sign-in cannot be reset from the website', async () => {
  seed();
  const { err } = await run(resetUserTwoFactor, { user: primary, params: { id: 'p1' } });
  assert.equal(err?.statusCode, 400);
  assert.equal(err?.message, "The primary admin's two-step sign-in can only be reset on the server.");
});

test('resetting a staff member clears it, signs them out, and records who did it', async () => {
  seed();
  const { res, err } = await run(resetUserTwoFactor, { user: primary, params: { id: 's1' } });
  assert.equal(err, undefined);
  assert.equal(res.body.success, true);
  const staff = fake.store.users.find((u) => u.id === 's1');
  assert.equal(staff.totpEnabledAt, null);
  assert.equal(staff.totpSecret, null);
  assert.equal(fake.store.refreshTokens.filter((t) => t.userId === 's1').length, 0);
  const log = fake.store.activityLogs.at(-1);
  assert.equal(log.performedById, 'p1');
  assert.match(log.action, /reviewer@vigancity\.gov\.ph/);
});

test('applicants have no two-step sign-in to reset', async () => {
  seed();
  const { err } = await run(resetUserTwoFactor, { user: primary, params: { id: 'a1' } });
  assert.equal(err?.statusCode, 400);
});

test('the staff list shows who has two-step sign-in turned on', async () => {
  seed();
  const { res } = await run(listUsers, { user: primary, query: {} });
  const byEmail = Object.fromEntries(res.body.users.map((u) => [u.email, u.twoFactorEnabled]));
  assert.equal(byEmail['reviewer@vigancity.gov.ph'], true);
  assert.equal(byEmail['other@vigancity.gov.ph'], false);
});
