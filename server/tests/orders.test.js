const { prisma, resetDb, createUser, api, createCatalog, uuid } = require('./helpers');
const { D } = require('../src/utils/money');

let cat;
let farmer;
let shop;
let shop2;
let mandi;
let admin;

const listing = async (overrides = {}) =>
  (
    await api(farmer.token)
      .post('/api/v1/farmers/listings')
      .send({ productId: cat.tomato.id, harvestAt: new Date().toISOString(), totalQuantityKg: '100', pricePerKg: '20', minOrderKg: '10', publish: true, ...overrides })
  ).body.data;

const order = (who, items, source = 'HARVEST') => api(who.token).post('/api/v1/orders').send({ idempotencyKey: uuid(), source, items });
const move = (who, id, status, extra = {}) => api(who.token).post(`/api/v1/orders/${id}/transition`).send({ status, ...extra });
const available = async (id) => D((await prisma.harvestListing.findUnique({ where: { id } })).availableQuantityKg).toString();

beforeAll(async () => {
  await resetDb();
  cat = await createCatalog();
  farmer = await createUser('FARMER');
  shop = await createUser('SHOPKEEPER');
  shop2 = await createUser('SHOPKEEPER');
  mandi = await createUser('MANDI_OWNER');
  admin = await createUser('ADMIN');
  await prisma.mandiProfile.update({ where: { userId: mandi.user.id }, data: { commissionPercent: '5' } });
});
afterAll(() => prisma.$disconnect());

describe('Harvest listings', () => {
  test('farmer creates, edits and changes status; buyers only see ACTIVE listings', async () => {
    const draft = await listing({ publish: false, totalQuantityKg: '50' });
    expect(draft.status).toBe('DRAFT');
    expect(draft.cropName).toBe('Tomato');
    expect(draft.village).toBe('Malur'); // defaults from the farmer profile

    let market = await api(shop.token).get('/api/v1/procurement/harvest-listings');
    expect(market.body.data.find((l) => l.id === draft.id)).toBeUndefined();

    const pub = await api(farmer.token).post(`/api/v1/farmers/listings/${draft.id}/status`).send({ status: 'ACTIVE' });
    expect(pub.body.data.status).toBe('ACTIVE');
    market = await api(shop.token).get('/api/v1/procurement/harvest-listings');
    const seen = market.body.data.find((l) => l.id === draft.id);
    expect(seen).toBeDefined();
    expect(typeof seen.distanceKm).toBe('number');

    const edit = await api(farmer.token).patch(`/api/v1/farmers/listings/${draft.id}`).send({ pricePerKg: '22.5', totalQuantityKg: '60' });
    expect(edit.body.data.pricePerKg).toBe('22.5');
    expect(edit.body.data.availableQuantityKg).toBe('60');

    const invalid = await api(farmer.token).post(`/api/v1/farmers/listings/${draft.id}/status`).send({ status: 'ACTIVE' });
    expect(invalid.status).toBe(409);
    expect((await api(shop.token).get(`/api/v1/farmers/listings/${draft.id}`)).status).toBe(403);
  });

  test('minimum order cannot exceed total', async () => {
    const res = await api(farmer.token)
      .post('/api/v1/farmers/listings')
      .send({ productId: cat.tomato.id, harvestAt: new Date().toISOString(), totalQuantityKg: '10', pricePerKg: '20', minOrderKg: '50' });
    expect(res.status).toBe(422);
  });
});

describe('Order lifecycle (shop ← farmer)', () => {
  test('placing an order reserves quantity; validation of min order and availability', async () => {
    const l = await listing();
    expect((await order(shop, [{ sourceId: l.id, quantityKg: '5' }])).status).toBe(422); // below minimum
    expect((await order(shop, [{ sourceId: l.id, quantityKg: '150' }])).status).toBe(409); // above available
    const ok = await order(shop, [{ sourceId: l.id, quantityKg: '40' }]);
    expect(ok.status).toBe(201);
    expect(ok.body.data.total).toBe('800');
    expect(ok.body.data.type).toBe('SHOP_FROM_FARMER');
    expect(await available(l.id)).toBe('60');
  });

  test('concurrent buyers cannot oversell a listing', async () => {
    const l = await listing({ totalQuantityKg: '100', minOrderKg: '30' });
    const results = await Promise.all([order(shop, [{ sourceId: l.id, quantityKg: '40' }]), order(shop2, [{ sourceId: l.id, quantityKg: '40' }]), order(shop, [{ sourceId: l.id, quantityKg: '40' }])]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(results.filter((r) => r.status === 409)).toHaveLength(1);
    expect(await available(l.id)).toBe('20');
  });

  test('a listing sells out and comes back when an order is rejected', async () => {
    const l = await listing({ totalQuantityKg: '50' });
    const o = (await order(shop, [{ sourceId: l.id, quantityKg: '50' }])).body.data;
    expect((await prisma.harvestListing.findUnique({ where: { id: l.id } })).status).toBe('SOLD_OUT');
    expect((await move(farmer, o.id, 'REJECTED')).status).toBe(422); // reason required
    const rej = await move(farmer, o.id, 'REJECTED', { reason: 'Crop damaged by rain' });
    expect(rej.status).toBe(200);
    const after = await prisma.harvestListing.findUnique({ where: { id: l.id } });
    expect(after.status).toBe('ACTIVE');
    expect(D(after.availableQuantityKg).toString()).toBe('50');
  });

  test('only the right party can perform each transition, in order', async () => {
    const l = await listing();
    const o = (await order(shop, [{ sourceId: l.id, quantityKg: '20' }])).body.data;
    expect((await move(shop, o.id, 'ACCEPTED')).status).toBe(403); // buyer cannot accept
    expect((await move(farmer, o.id, 'DISPATCHED')).status).toBe(409); // cannot skip steps
    expect((await move(shop2, o.id, 'CANCELLED', { reason: 'not mine' })).status).toBe(404); // stranger
    expect((await api(shop2.token).get(`/api/v1/orders/${o.id}`)).status).toBe(404);
    expect((await move(farmer, o.id, 'ACCEPTED')).status).toBe(200);
    expect((await move(farmer, o.id, 'PREPARING')).status).toBe(200);
    expect((await move(farmer, o.id, 'READY')).status).toBe(200);
    expect((await move(farmer, o.id, 'DISPATCHED')).status).toBe(200);
    expect((await move(farmer, o.id, 'DELIVERED', { items: [{ itemId: o.items[0].id, deliveredQuantityKg: '25' }] })).status).toBe(422); // more than ordered
    expect((await move(farmer, o.id, 'DELIVERED', { items: [{ itemId: o.items[0].id, deliveredQuantityKg: '19' }] })).status).toBe(200);
    const history = (await api(shop.token).get(`/api/v1/orders/${o.id}`)).body.data.history.map((h) => h.toStatus);
    expect(history).toEqual(['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED']);
  });

  test('receipt adds stock to the shop, creates a settlement, and can happen only once', async () => {
    const l = await listing({ pricePerKg: '25' });
    const o = (await order(shop, [{ sourceId: l.id, quantityKg: '30' }])).body.data;
    for (const s of ['ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED']) await move(farmer, o.id, s);
    expect((await api(farmer.token).post(`/api/v1/orders/${o.id}/receive`).send({ items: [] })).status).toBe(403);

    const tooMuch = await api(shop.token).post(`/api/v1/orders/${o.id}/receive`).send({ items: [{ itemId: o.items[0].id, receivedQuantityKg: '31' }] });
    expect(tooMuch.status).toBe(422);
    const rec = await api(shop.token).post(`/api/v1/orders/${o.id}/receive`).send({ items: [{ itemId: o.items[0].id, receivedQuantityKg: '28.5' }] });
    expect(rec.status).toBe(200);
    expect(rec.body.data.status).toBe('RECEIVED');
    expect(rec.body.data.settlement.grossAmount).toBe('712.5');
    expect(rec.body.data.settlement.netAmount).toBe('712.5');

    const inv = await prisma.inventoryItem.findFirst({ where: { shopId: shop.user.id, productId: cat.tomato.id } });
    expect(D(inv.quantityKg).toString()).toBe('28.5');
    expect(D(inv.costPricePerKg).toString()).toBe('25');

    const again = await api(shop.token).post(`/api/v1/orders/${o.id}/receive`).send({ items: [{ itemId: o.items[0].id, receivedQuantityKg: '28.5' }] });
    expect(again.status).toBe(409);
    expect(D((await prisma.inventoryItem.findUnique({ where: { id: inv.id } })).quantityKg).toString()).toBe('28.5');

    // Payments are capped at what is owed and update the settlement
    expect((await api(shop.token).post(`/api/v1/payments/orders/${o.id}`).send({ amount: '800', mode: 'UPI' })).status).toBe(422);
    expect((await api(shop.token).post(`/api/v1/payments/orders/${o.id}`).send({ amount: '500', mode: 'UPI' })).status).toBe(201);
    expect((await api(farmer.token).post(`/api/v1/payments/orders/${o.id}`).send({ amount: '1', mode: 'UPI' })).status).toBe(403);
    await api(shop.token).post(`/api/v1/payments/orders/${o.id}`).send({ amount: '212.50', mode: 'CASH' });
    const s = await prisma.settlement.findUnique({ where: { orderId: o.id } });
    expect(s.status).toBe('PAID');
    expect((await api(shop.token).post(`/api/v1/payments/orders/${o.id}`).send({ amount: '1', mode: 'CASH' })).status).toBe(409);
  });

  test('admin may cancel (moderation) but may not act for a party', async () => {
    const l = await listing();
    const o = (await order(shop, [{ sourceId: l.id, quantityKg: '10' }])).body.data;
    expect((await move(admin, o.id, 'ACCEPTED')).status).toBe(403);
    const c = await move(admin, o.id, 'CANCELLED', { reason: 'Duplicate order reported' });
    expect(c.status).toBe(200);
    expect(await prisma.auditLog.count({ where: { action: 'ORDER_CANCELLED_BY_ADMIN', entityId: o.id } })).toBe(1);
  });
});

describe('Wholesale & mandi procurement', () => {
  test('shop orders a mandi lot; mandi buys from farmer with commission deducted in settlement', async () => {
    const lot = (
      await api(mandi.token)
        .post('/api/v1/mandi/lots')
        .send({ productId: cat.onion.id, lotType: 'BAGGED', unitSizeKg: '50', totalWeightKg: '1000', pricePerKg: '30', minOrderKg: '100', marketYardName: 'Yard 1', publish: true })
    ).body.data;
    expect(lot.lotCode).toMatch(/^LOT-\d{2}-\d{6}$/);
    expect((await api(farmer.token).get('/api/v1/procurement/mandi-lots')).status).toBe(403);

    const wo = await order(shop, [{ sourceId: lot.id, quantityKg: '200' }], 'MANDI_LOT');
    expect(wo.status).toBe(201);
    expect(wo.body.data.type).toBe('SHOP_FROM_MANDI');
    expect(D((await prisma.mandiLot.findUnique({ where: { id: lot.id } })).availableWeightKg).toString()).toBe('800');

    // mandi cannot order its own lot type from another mandi, and farmers cannot place orders
    expect((await order(mandi, [{ sourceId: lot.id, quantityKg: '100' }], 'MANDI_LOT')).status).toBe(403);
    expect((await order(farmer, [{ sourceId: lot.id, quantityKg: '100' }], 'MANDI_LOT')).status).toBe(403);

    const l = await listing({ pricePerKg: '20' });
    const mo = (await order(mandi, [{ sourceId: l.id, quantityKg: '50' }])).body.data;
    expect(mo.type).toBe('MANDI_FROM_FARMER');
    for (const s of ['ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED']) await move(farmer, mo.id, s);
    const rec = await api(mandi.token).post(`/api/v1/orders/${mo.id}/receive`).send({ items: [{ itemId: mo.items[0].id, receivedQuantityKg: '50' }] });
    expect(rec.body.data.settlement.grossAmount).toBe('1000');
    expect(rec.body.data.settlement.commissionAmount).toBe('50');
    expect(rec.body.data.settlement.netAmount).toBe('950');

    const dash = await api(mandi.token).get('/api/v1/mandi/dashboard');
    expect(dash.body.data.cards.commissionEarned).toBe('50');
  });

  test('idempotent order placement', async () => {
    const l = await listing();
    const key = uuid();
    const body = { idempotencyKey: key, source: 'HARVEST', items: [{ sourceId: l.id, quantityKg: '10' }] };
    const a = await api(shop.token).post('/api/v1/orders').send(body);
    const b = await api(shop.token).post('/api/v1/orders').send(body);
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.meta.duplicate).toBe(true);
    expect(await available(l.id)).toBe('90');
  });
});
