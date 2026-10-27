const crypto = require('node:crypto');
const request = require('supertest');
const prisma = require('../src/config/prisma');
const app = require('../src/app');
const auth = require('../src/modules/auth/auth.service');
const settings = require('../src/services/settings.service');

const PASSWORD = 'Passw0rd!x';
let mobileSeq = 6000000000 + Math.floor(Math.random() * 1_000_000);

/** Wipes every table in the test database. */
const resetDb = async () => {
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  settings.invalidate();
};

const nextMobile = () => String(++mobileSeq);

const PROFILE_DEFAULTS = {
  ADMIN: {},
  SHOPKEEPER: { shopName: 'Test Shop', address: { city: 'Bengaluru', latitude: 12.97, longitude: 77.59 } },
  FARMER: { farmName: 'Test Farm', address: { village: 'Malur', district: 'Kolar', latitude: 13.0, longitude: 77.9 } },
  MANDI_OWNER: { mandiName: 'Test Mandi', marketYardName: 'Test Yard' },
  DRIVER: {},
};
const dynamicDefaults = (role) => (role === 'DRIVER' ? { licenseNumber: `DL${crypto.randomInt(1e8, 1e9)}` } : {});

/** Creates an ACTIVE user directly and returns { user, token } with a real access token from the login API. */
const createUser = async (role, overrides = {}) => {
  const input = { role, name: `${role} ${mobileSeq}`, mobile: nextMobile(), password: PASSWORD, ...PROFILE_DEFAULTS[role], ...dynamicDefaults(role), ...overrides };
  const user = await auth.createUserWithProfile(input, { status: 'ACTIVE', action: 'TEST' });
  const res = await request(app).post('/api/v1/auth/login').send({ identifier: input.mobile, password: PASSWORD, role });
  if (res.status !== 200) throw new Error(`Login failed for test user: ${JSON.stringify(res.body)}`);
  return { user: { ...user, mobile: input.mobile }, token: res.body.data.accessToken, cookie: res.headers['set-cookie'] };
};

/** supertest wrapper bound to a bearer token: api(token).get('/api/v1/...') */
const api = (token) => {
  const wrap = (method) => (url) => {
    const r = request(app)[method](url);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };
  return { get: wrap('get'), post: wrap('post'), patch: wrap('patch'), put: wrap('put'), delete: wrap('delete') };
};

/** Catalogue fixture: one category + products. */
const createCatalog = async () => {
  const veg = await prisma.productCategory.create({ data: { name: 'Vegetables', slug: 'vegetables', type: 'VEGETABLE' } });
  const fruit = await prisma.productCategory.create({ data: { name: 'Fruits', slug: 'fruits', type: 'FRUIT' } });
  const tomato = await prisma.product.create({ data: { name: 'Tomato', categoryId: veg.id, emoji: '🍅' } });
  const onion = await prisma.product.create({ data: { name: 'Onion', categoryId: veg.id, emoji: '🧅' } });
  const mango = await prisma.product.create({ data: { name: 'Mango', categoryId: fruit.id, emoji: '🥭' } });
  return { veg, fruit, tomato, onion, mango };
};

const uuid = () => crypto.randomUUID();

module.exports = { prisma, app, request, resetDb, createUser, api, createCatalog, uuid, PASSWORD };
