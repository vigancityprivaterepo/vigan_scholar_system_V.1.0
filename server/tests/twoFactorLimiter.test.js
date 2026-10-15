const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-access-secret';
const { twoFactorLimiter } = require('../src/middleware/rateLimits');

test('code attempts are limited to 10 per 15 minutes per staff member, not per network', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.post('/verify', twoFactorLimiter, (req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/verify`;
  const tokenFor = (userId) => jwt.sign({ userId, purpose: '2fa-challenge' }, process.env.JWT_SECRET);
  const send = (userId) => fetch(base, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ challengeToken: tokenFor(userId) }),
  });
  try {
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await send('staff-a')).status);
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200));
    const blocked = await send('staff-a');
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).message, /Too many/);
    assert.equal((await send('staff-b')).status, 200, 'another staff member on the same network is not blocked');
  } finally {
    server.close();
  }
});

test('forged challenge tokens cannot use up a staff member attempts', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.post('/verify', twoFactorLimiter, (req, res) => res.json({ ok: true }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/verify`;
  const send = (challengeToken, ip) => fetch(base, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify({ challengeToken }),
  });
  try {
    const forged = jwt.sign({ userId: 'victim', purpose: '2fa-challenge' }, 'not-the-server-secret');
    for (let i = 0; i < 11; i++) await send(forged, '203.0.113.9');
    const real = jwt.sign({ userId: 'victim', purpose: '2fa-challenge' }, process.env.JWT_SECRET);
    assert.equal((await send(real, '198.51.100.7')).status, 200, 'the real staff member is not locked out');
  } finally {
    server.close();
  }
});
