// In-memory stand-in for PrismaClient, installed into the require cache before the code under
// test is loaded. Every module that does `new PrismaClient()` shares one store, so tests can
// seed data and assert on writes without touching a real database.

const store = { users: [], refreshTokens: [], trustedDevices: [], activityLogs: [] };
let failOnAccess = false;

const guard = () => { if (failOnAccess) throw new Error('database was touched'); };
const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => {
  if (value && typeof value === 'object' && 'in' in value) return value.in.includes(row[key]);
  return row[key] === value;
});
const pick = (row, select) => (row && select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : row);

const table = (name, { unique } = {}) => ({
  findUnique: async ({ where, select }) => { guard(); return pick(store[name].find((r) => matches(r, where)) || null, select); },
  findFirst: async ({ where, select } = {}) => { guard(); return pick(store[name].find((r) => matches(r, where)) || null, select); },
  findMany: async ({ where } = {}) => { guard(); return store[name].filter((r) => matches(r, where)); },
  create: async ({ data }) => {
    guard();
    if (unique && store[name].some((r) => r[unique] === data[unique])) throw Object.assign(new Error('unique'), { code: 'P2002' });
    const row = { id: `${name}-${store[name].length + 1}`, createdAt: new Date(), ...data };
    store[name].push(row);
    return row;
  },
  update: async ({ where, data }) => {
    guard();
    const row = store[name].find((r) => matches(r, where));
    if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
    Object.assign(row, data);
    return row;
  },
  delete: async ({ where }) => {
    guard();
    const index = store[name].findIndex((r) => matches(r, where));
    if (index === -1) throw Object.assign(new Error('not found'), { code: 'P2025' });
    return store[name].splice(index, 1)[0];
  },
  deleteMany: async ({ where } = {}) => {
    guard();
    const before = store[name].length;
    store[name] = store[name].filter((r) => !matches(r, where));
    return { count: before - store[name].length };
  },
});

class FakePrismaClient {
  constructor() {
    this.user = table('users', { unique: 'email' });
    this.refreshToken = table('refreshTokens', { unique: 'token' });
    this.trustedDevice = table('trustedDevices', { unique: 'tokenHash' });
    this.activityLog = table('activityLogs');
    this._runtimeDataModel = { models: { User: { fields: [{ name: 'profileImageUrl' }] } } };
  }
  async $transaction(steps) { return Promise.all(steps); }
}

const install = () => {
  const path = require.resolve('@prisma/client');
  require.cache[path] = { id: path, filename: path, loaded: true, exports: { PrismaClient: FakePrismaClient, Prisma: {} } };
};

const reset = () => {
  store.users = []; store.refreshTokens = []; store.trustedDevices = []; store.activityLogs = [];
  failOnAccess = false;
};

const setFailOnAccess = (value) => { failOnAccess = value; };

module.exports = { install, reset, store, setFailOnAccess, FakePrismaClient };
