const { prisma, resetDb, createUser, api, createCatalog, uuid } = require('./helpers');
const { calculate } = require('../src/modules/billing/billing.service');
const { D } = require('../src/utils/money');

let shop;
let other;
let cat;
let tomato;
let onion;

beforeAll(async () => {
  await resetDb();
  cat = await createCatalog();
  shop = await createUser('SHOPKEEPER');
  other = await createUser('SHOPKEEPER');
  tomato = (await api(shop.token).post('/api/v1/inventory').send({ productId: cat.tomato.id, sellingPricePerKg: '32.50', costPricePerKg: '24', openingQuantityKg: '10' })).body.data;
  onion = (await api(shop.token).post('/api/v1/inventory').send({ productId: cat.onion.id, sellingPricePerKg: '38', openingQuantityKg: '5.5' })).body.data;
});
afterAll(() => prisma.$disconnect());

const stockOf = async (id) => D((await prisma.inventoryItem.findUnique({ where: { id } })).quantityKg).toString();

describe('Bill calculation (pure)', () => {
  test('uses exact decimal arithmetic with gram precision', () => {
    const r = calculate(
      [
        { quantityKg: D('0.333'), unitPrice: D('30.00') },
        { quantityKg: D('1.25'), unitPrice: D('38.40') },
      ],
      '1.00'
    );
    expect(r.lines[0].lineTotal.toString()).toBe('9.99');
    expect(r.lines[1].lineTotal.toString()).toBe('48');
    expect(r.subtotal.toString()).toBe('57.99');
    expect(r.total.toString()).toBe('56.99');
  });

  test('0.1 + 0.2 style errors do not occur', () => {
    const r = calculate([{ quantityKg: D('0.1'), unitPrice: D('0.10') }, { quantityKg: D('0.2'), unitPrice: D('0.10') }], '0');
    expect(r.subtotal.toString()).toBe('0.03');
  });
});

describe('POS invoices', () => {
  test('server prices the bill, deducts stock and numbers the invoice', async () => {
    const res = await api(shop.token)
      .post('/api/v1/billing/invoices')
      .send({
        idempotencyKey: uuid(),
        paymentMode: 'CASH',
        items: [
          { inventoryItemId: tomato.id, quantityKg: '0.5' },
          { inventoryItemId: onion.id, quantityKg: '1.25' },
          { inventoryItemId: tomato.id, quantityKg: '0.25' },
          // A tampered client price would be ignored — there is no price field at all.
        ],
      });
    expect(res.status).toBe(201);
    const inv = res.body.data;
    expect(inv.invoiceNumber).toMatch(/^KV-S[0-9A-F]{6}-\d{2}-000001$/);
    expect(inv.subtotal).toBe('71.88'); // 0.75 × 32.50 = 24.375 → 24.38 ; 1.25 × 38 = 47.50
    expect(inv.total).toBe('71.88');
    expect(inv.items).toHaveLength(2); // duplicate lines merged
    expect(await stockOf(tomato.id)).toBe('9.25');
    expect(await stockOf(onion.id)).toBe('4.25');
    const ledger = await prisma.inventoryTransaction.findMany({ where: { referenceId: inv.id } });
    expect(ledger).toHaveLength(2);
  });

  test('a repeated submission with the same idempotency key does not double-charge stock', async () => {
    const key = uuid();
    const body = { idempotencyKey: key, paymentMode: 'UPI', items: [{ inventoryItemId: tomato.id, quantityKg: '1' }] };
    const before = await stockOf(tomato.id);
    const [a, b] = await Promise.all([api(shop.token).post('/api/v1/billing/invoices').send(body), api(shop.token).post('/api/v1/billing/invoices').send(body)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.data.id).toBe(b.body.data.id);
    expect(D(before).minus(await stockOf(tomato.id)).toString()).toBe('1');
  });

  test('insufficient stock fails the whole bill with no partial deduction', async () => {
    const t0 = await stockOf(tomato.id);
    const o0 = await stockOf(onion.id);
    const res = await api(shop.token)
      .post('/api/v1/billing/invoices')
      .send({ idempotencyKey: uuid(), paymentMode: 'CASH', items: [{ inventoryItemId: tomato.id, quantityKg: '1' }, { inventoryItemId: onion.id, quantityKg: '999' }] });
    expect(res.status).toBe(409);
    expect(await stockOf(tomato.id)).toBe(t0);
    expect(await stockOf(onion.id)).toBe(o0);
  });

  test('concurrent sales can never drive stock negative', async () => {
    const item = (await api(shop.token).post('/api/v1/inventory').send({ productId: cat.mango.id, sellingPricePerKg: '100', openingQuantityKg: '3' })).body.data;
    const attempts = await Promise.all(
      Array.from({ length: 6 }, () => api(shop.token).post('/api/v1/billing/invoices').send({ idempotencyKey: uuid(), paymentMode: 'CASH', items: [{ inventoryItemId: item.id, quantityKg: '1' }] }))
    );
    expect(attempts.filter((r) => r.status === 201)).toHaveLength(3);
    expect(attempts.filter((r) => r.status === 409)).toHaveLength(3);
    expect(await stockOf(item.id)).toBe('0');
  });

  test('another shop cannot bill against or read this shop’s stock and invoices', async () => {
    const res = await api(other.token).post('/api/v1/billing/invoices').send({ idempotencyKey: uuid(), paymentMode: 'CASH', items: [{ inventoryItemId: tomato.id, quantityKg: '1' }] });
    expect(res.status).toBe(400);
    const list = await api(shop.token).get('/api/v1/billing/invoices');
    const someId = list.body.data[0].id;
    expect((await api(other.token).get(`/api/v1/billing/invoices/${someId}`)).status).toBe(404);
    expect((await api(other.token).post(`/api/v1/billing/invoices/${someId}/print`)).status).toBe(404);
  });

  test('discount is capped by the platform setting', async () => {
    const res = await api(shop.token)
      .post('/api/v1/billing/invoices')
      .send({ idempotencyKey: uuid(), paymentMode: 'CASH', discount: '20', items: [{ inventoryItemId: onion.id, quantityKg: '1' }] });
    expect(res.status).toBe(422);
    const ok = await api(shop.token)
      .post('/api/v1/billing/invoices')
      .send({ idempotencyKey: uuid(), paymentMode: 'CASH', discount: '3.80', items: [{ inventoryItemId: onion.id, quantityKg: '1' }] });
    expect(ok.status).toBe(201);
    expect(ok.body.data.total).toBe('34.2');
  });

  test('credit (udhar) bill updates the khata, respects the limit and can be collected', async () => {
    const mobile = '9876501234';
    const noCustomer = await api(shop.token).post('/api/v1/billing/invoices').send({ idempotencyKey: uuid(), paymentMode: 'CREDIT', items: [{ inventoryItemId: onion.id, quantityKg: '0.5' }] });
    expect(noCustomer.status).toBe(422);

    const res = await api(shop.token)
      .post('/api/v1/billing/invoices')
      .send({ idempotencyKey: uuid(), paymentMode: 'CREDIT', amountPaid: '5', customerName: 'Kumar', customerMobile: mobile, items: [{ inventoryItemId: onion.id, quantityKg: '0.5' }] });
    expect(res.status).toBe(201);
    expect(res.body.data.creditAmount).toBe('14');
    const customer = await prisma.customer.findFirst({ where: { mobile } });
    expect(D(customer.creditBalance).toString()).toBe('14');

    await prisma.customer.update({ where: { id: customer.id }, data: { creditLimit: '20' } });
    const over = await api(shop.token)
      .post('/api/v1/billing/invoices')
      .send({ idempotencyKey: uuid(), paymentMode: 'CREDIT', customerName: 'Kumar', customerMobile: mobile, items: [{ inventoryItemId: tomato.id, quantityKg: '1' }] });
    expect(over.status).toBe(422);

    const tooMuch = await api(shop.token).post(`/api/v1/customers/${customer.id}/collect`).send({ amount: '50', mode: 'CASH' });
    expect(tooMuch.status).toBe(422);
    const collect = await api(shop.token).post(`/api/v1/customers/${customer.id}/collect`).send({ amount: '10', mode: 'UPI' });
    expect(collect.status).toBe(201);
    expect(collect.body.data.customer.creditBalance).toBe('4');

    const khata = await api(shop.token).get(`/api/v1/customers/${customer.id}`);
    expect(khata.body.data.ledger.map((l) => l.type)).toEqual(expect.arrayContaining(['CREDIT_SALE', 'COLLECTION']));
  });

  test('cancelling a bill restores stock and reverses credit, and only once', async () => {
    const mobile = '9876509999';
    const res = await api(shop.token)
      .post('/api/v1/billing/invoices')
      .send({ idempotencyKey: uuid(), paymentMode: 'CREDIT', customerName: 'Meena', customerMobile: mobile, items: [{ inventoryItemId: tomato.id, quantityKg: '2' }] });
    const before = await stockOf(tomato.id);
    const cancel = await api(shop.token).post(`/api/v1/billing/invoices/${res.body.data.id}/cancel`).send({ reason: 'Customer returned items' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe('CANCELLED');
    expect(D(await stockOf(tomato.id)).minus(before).toString()).toBe('2');
    const c = await prisma.customer.findFirst({ where: { mobile } });
    expect(D(c.creditBalance).toString()).toBe('0');
    expect((await api(shop.token).post(`/api/v1/billing/invoices/${res.body.data.id}/cancel`).send({ reason: 'again' })).status).toBe(409);
  });

  test('reprints are counted', async () => {
    const list = await api(shop.token).get('/api/v1/billing/invoices?limit=1');
    const id = list.body.data[0].id;
    const p1 = await api(shop.token).post(`/api/v1/billing/invoices/${id}/print`);
    const p2 = await api(shop.token).post(`/api/v1/billing/invoices/${id}/print`);
    expect(p1.body.data.isDuplicateCopy).toBe(false);
    expect(p2.body.data.isDuplicateCopy).toBe(true);
  });

  test('stock adjustments are logged and cannot go negative', async () => {
    const bad = await api(shop.token).post(`/api/v1/inventory/${onion.id}/adjust`).send({ type: 'WASTAGE', direction: 'OUT', quantityKg: '500', note: 'Rotten' });
    expect(bad.status).toBe(409);
    const ok = await api(shop.token).post(`/api/v1/inventory/${onion.id}/adjust`).send({ type: 'ADJUSTMENT', direction: 'IN', quantityKg: '2', note: 'Recount' });
    expect(ok.status).toBe(200);
    const txns = await api(shop.token).get(`/api/v1/inventory/transactions?inventoryItemId=${onion.id}`);
    expect(txns.body.data.some((t) => t.type === 'ADJUSTMENT')).toBe(true);
  });
});
