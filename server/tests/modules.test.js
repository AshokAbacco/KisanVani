const { prisma, resetDb, createUser, api, createCatalog, uuid } = require('./helpers');

let cat;
let admin;
let shop;
let farmer;
let mandi;
let driver;

beforeAll(async () => {
  await resetDb();
  cat = await createCatalog();
  admin = await createUser('ADMIN');
  shop = await createUser('SHOPKEEPER');
  farmer = await createUser('FARMER');
  mandi = await createUser('MANDI_OWNER');
  driver = await createUser('DRIVER');
});
afterAll(() => prisma.$disconnect());

describe('Catalogue (admin)', () => {
  test('categories and products CRUD with admin-only writes', async () => {
    const c = await api(admin.token).post('/api/v1/categories').send({ name: 'Spices', type: 'SPICE' });
    expect(c.status).toBe(201);
    expect(c.body.data.slug).toBe('spices');
    expect((await api(shop.token).post('/api/v1/categories').send({ name: 'X', type: 'OTHER' })).status).toBe(403);

    const p = await api(admin.token).post('/api/v1/products').send({ name: 'Turmeric', localName: 'Haldi', categoryId: c.body.data.id, emoji: '🫚' });
    expect(p.status).toBe(201);
    expect((await api(admin.token).post('/api/v1/products').send({ name: 'Turmeric', categoryId: c.body.data.id })).status).toBe(409);
    const upd = await api(admin.token).patch(`/api/v1/products/${p.body.data.id}`).send({ isActive: false });
    expect(upd.body.data.isActive).toBe(false);

    const list = await api(shop.token).get('/api/v1/products?search=tur');
    expect(list.body.data).toHaveLength(0); // inactive hidden from non-admins
    const adminList = await api(admin.token).get('/api/v1/products?search=tur&includeInactive=true');
    expect(adminList.body.data).toHaveLength(1);

    const del = await api(admin.token).delete(`/api/v1/categories/${c.body.data.id}`);
    expect(del.body.data.deactivated).toBe(true); // in use → soft delete
    const byType = await api(shop.token).get('/api/v1/products?categoryType=FRUIT');
    expect(byType.body.data.map((x) => x.name)).toEqual(['Mango']);
  });
});

describe('Shop masters', () => {
  test('stock master, customers, suppliers and supplier purchase receipt', async () => {
    const inv = await api(shop.token).post('/api/v1/inventory').send({ productId: cat.onion.id, sellingPricePerKg: '40', openingQuantityKg: '2', lowStockThresholdKg: '5' });
    expect(inv.status).toBe(201);
    expect((await api(shop.token).post('/api/v1/inventory').send({ productId: cat.onion.id, sellingPricePerKg: '41' })).status).toBe(409);
    const low = await api(shop.token).get('/api/v1/inventory?lowStock=true');
    expect(low.body.data.map((i) => i.id)).toContain(inv.body.data.id);
    const rate = await api(shop.token).patch(`/api/v1/inventory/${inv.body.data.id}`).send({ sellingPricePerKg: '44' });
    expect(rate.body.data.sellingPricePerKg).toBe('44');

    const cust = await api(shop.token).post('/api/v1/customers').send({ name: 'Ravi', mobile: '9812345678' });
    expect(cust.status).toBe(201);
    expect((await api(shop.token).post('/api/v1/customers').send({ name: 'Ravi 2', mobile: '9812345678' })).status).toBe(409);
    expect((await api(shop.token).get('/api/v1/customers?search=ravi')).body.data).toHaveLength(1);

    const sup = await api(shop.token).post('/api/v1/suppliers').send({ name: 'City Traders', type: 'WHOLESALER' });
    expect(sup.status).toBe(201);
    const po = await api(shop.token)
      .post('/api/v1/procurement/purchases')
      .send({ supplierId: sup.body.data.id, items: [{ productId: cat.onion.id, quantityKg: '50', unitCost: '30' }, { productId: cat.mango.id, quantityKg: '10', unitCost: '80' }] });
    expect(po.status).toBe(201);
    expect(po.body.data.total).toBe('2300');

    const recv = await api(shop.token)
      .post(`/api/v1/procurement/purchases/${po.body.data.id}/receive`)
      .send({ items: po.body.data.items.map((i) => ({ itemId: i.id, receivedQuantityKg: i.productId === cat.onion.id ? '48' : '10' })) });
    expect(recv.status).toBe(200);
    expect(recv.body.data.total).toBe('2240');
    const onion = await prisma.inventoryItem.findUnique({ where: { id: inv.body.data.id } });
    expect(String(onion.quantityKg)).toBe('50');
    const mango = await prisma.inventoryItem.findFirst({ where: { shopId: shop.user.id, productId: cat.mango.id } });
    expect(String(mango.quantityKg)).toBe('10'); // stock-master row created on receipt
    const again = await api(shop.token).post(`/api/v1/procurement/purchases/${po.body.data.id}/receive`).send({ items: po.body.data.items.map((i) => ({ itemId: i.id, receivedQuantityKg: '1' })) });
    expect(again.status).toBe(409);

    expect((await api(shop.token).post(`/api/v1/procurement/purchases/${po.body.data.id}/payments`).send({ amount: '3000', mode: 'CASH' })).status).toBe(422);
    expect((await api(shop.token).post(`/api/v1/procurement/purchases/${po.body.data.id}/payments`).send({ amount: '2240', mode: 'CASH' })).status).toBe(201);
  });
});

describe('Mandi lots', () => {
  test('lot CRUD, status rules and reserved-weight protection', async () => {
    const lot = (
      await api(mandi.token)
        .post('/api/v1/mandi/lots')
        .send({ productId: cat.mango.id, lotType: 'CRATED', unitSizeKg: '20', totalWeightKg: '400', pricePerKg: '90', minOrderKg: '40', marketYardName: 'Fruit Yard', publish: true })
    ).body.data;
    const crateless = await api(mandi.token).post('/api/v1/mandi/lots').send({ productId: cat.mango.id, lotType: 'CRATED', totalWeightKg: '400', pricePerKg: '90', minOrderKg: '40', marketYardName: 'Yard' });
    expect(crateless.status).toBe(422);

    await api(shop.token).post('/api/v1/orders').send({ idempotencyKey: uuid(), source: 'MANDI_LOT', items: [{ sourceId: lot.id, quantityKg: '300' }] });
    const shrink = await api(mandi.token).patch(`/api/v1/mandi/lots/${lot.id}`).send({ totalWeightKg: '250' });
    expect(shrink.status).toBe(422);
    expect((await api(mandi.token).post(`/api/v1/mandi/lots/${lot.id}/status`).send({ status: 'CLOSED' })).status).toBe(409); // open order
    expect((await api(mandi.token).post(`/api/v1/mandi/lots/${lot.id}/status`).send({ status: 'PAUSED' })).status).toBe(200);
    const products = await api(mandi.token).get('/api/v1/mandi/products');
    expect(products.body.data[0].commodityName).toBe('Mango');
    const partners = await api(mandi.token).get('/api/v1/mandi/partners');
    expect(partners.body.data[0].id).toBe(shop.user.id);
  });
});

describe('Admin', () => {
  test('user management with search, filters and safeguards', async () => {
    const list = await api(admin.token).get('/api/v1/admin/users?role=FARMER&limit=5');
    expect(list.status).toBe(200);
    expect(list.body.data.every((u) => u.role === 'FARMER')).toBe(true);
    expect(list.body.data[0]).not.toHaveProperty('passwordHash');

    const detail = await api(admin.token).get(`/api/v1/admin/users/${shop.user.id}`);
    expect(detail.body.data.activity).toHaveProperty('totalSales');

    expect((await api(admin.token).post(`/api/v1/admin/users/${admin.user.id}/status`).send({ status: 'SUSPENDED', reason: 'self' })).status).toBe(400);
    expect((await api(admin.token).post(`/api/v1/admin/users/${farmer.user.id}/status`).send({ status: 'SUSPENDED' })).status).toBe(422);

    const created = await api(admin.token).post('/api/v1/admin/users').send({ role: 'ADMIN', name: 'Second Admin', mobile: '9811122233', email: 'second@test.local', password: 'Admin12345' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('ACTIVE');

    const dash = await api(admin.token).get('/api/v1/admin/dashboard');
    expect(dash.body.data.cards).toMatchObject({ farmers: 1, shopkeepers: 1, mandiOwners: 1, drivers: 1 });
    expect(dash.body.data.charts).toHaveProperty('registrations');
  });

  test('settings are validated per key', async () => {
    expect((await api(admin.token).put('/api/v1/settings/billing.maxDiscountPercent').send({ value: 150 })).status).toBe(422);
    expect((await api(admin.token).put('/api/v1/settings/no.such.key').send({ value: 1 })).status).toBe(404);
    const ok = await api(admin.token).put('/api/v1/settings/billing.maxDiscountPercent').send({ value: 15 });
    expect(ok.status).toBe(200);
    const pub = await api().get('/api/v1/settings/public');
    expect(pub.body.data['billing.maxDiscountPercent']).toBe(15);
    expect(pub.body.data).not.toHaveProperty('auth.approvalRequiredRoles');
    expect((await api(shop.token).get('/api/v1/settings')).status).toBe(403);
  });

  test('broadcast notifications reach users, who can read them', async () => {
    const b = await api(admin.token).post('/api/v1/notifications/broadcast').send({ role: 'FARMER', title: 'Monsoon advisory', message: 'Heavy rain expected' });
    expect(b.body.data.sent).toBe(1);
    const n = await api(farmer.token).get('/api/v1/notifications');
    const item = n.body.data.find((x) => x.title === 'Monsoon advisory');
    expect(item).toBeDefined();
    const read = await api(farmer.token).post(`/api/v1/notifications/${item.id}/read`);
    expect(read.status).toBe(200);
    expect((await api(shop.token).post(`/api/v1/notifications/${item.id}/read`)).status).toBe(404);
  });
});

describe('Reports', () => {
  test('each role gets its own summary and scoped CSV exports', async () => {
    for (const who of [admin, shop, farmer, mandi, driver]) {
      const s = await api(who.token).get('/api/v1/reports/summary');
      expect(s.status).toBe(200);
    }
    const csv = await api(shop.token).get('/api/v1/reports/export?dataset=stock');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('Onion');
    expect((await api(shop.token).get('/api/v1/reports/export?dataset=users')).status).toBe(400);
    const users = await api(admin.token).get('/api/v1/reports/export?dataset=users');
    expect(users.text.split('\r\n').length).toBeGreaterThan(5);
    expect((await api(admin.token).get('/api/v1/reports/summary?from=2026-05-01&to=2026-01-01')).status).toBe(400);
  });

  test('role dashboards respond', async () => {
    expect((await api(shop.token).get('/api/v1/shop/dashboard')).status).toBe(200);
    expect((await api(farmer.token).get('/api/v1/farmers/dashboard')).status).toBe(200);
    expect((await api(farmer.token).get('/api/v1/farmers/crops')).status).toBe(200);
    expect((await api(mandi.token).get('/api/v1/mandi/dashboard')).status).toBe(200);
    expect((await api(driver.token).get('/api/v1/drivers/dashboard')).status).toBe(200);
  });
});

describe('API conventions', () => {
  test('unknown routes return a JSON 404; malformed JSON returns 400', async () => {
    const r = await api(shop.token).get('/api/v1/nope');
    expect(r.status).toBe(404);
    expect(r.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
    const bad = await api(shop.token).post('/api/v1/customers').set('Content-Type', 'application/json').send('{"name":');
    expect(bad.status).toBe(400);
  });

  test('invalid ids are rejected before reaching the database', async () => {
    expect((await api(shop.token).get('/api/v1/orders/not-a-uuid')).status).toBe(422);
  });
});

describe('Validation edge cases', () => {
  test('null or empty optional dates stay empty (never 1970)', async () => {
    const { optionalDate } = require('../src/validators/common');
    expect(optionalDate.parse(null)).toBeNull();
    expect(optionalDate.parse('')).toBeNull();
    expect(optionalDate.parse(undefined)).toBeUndefined();
    expect(optionalDate.parse('2027-01-31').toISOString()).toBe('2027-01-31T00:00:00.000Z');
    expect(() => optionalDate.parse('not-a-date')).toThrow();

    const v = await api(driver.token).post('/api/v1/vehicles').send({ registrationNumber: 'KA01Z9999', type: 'TEMPO', capacityKg: '500', ownerName: 'Owner', insuranceExpiry: null, fitnessExpiry: '' });
    expect(v.status).toBe(201);
    expect(v.body.data.insuranceExpiry).toBeNull();
    expect(v.body.data.fitnessExpiry).toBeNull();
  });
});
