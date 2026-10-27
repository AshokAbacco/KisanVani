const http = require('node:http');
const { io: ioClient } = require('socket.io-client');
const { prisma, app, resetDb, createUser, api, createCatalog, uuid } = require('./helpers');
const { initSockets } = require('../src/sockets');

let cat;
let farmer;
let shop;
let stranger;
let driver;
let driver2;
let admin;
let vehicle;
let server;
let port;

const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  await resetDb();
  cat = await createCatalog();
  farmer = await createUser('FARMER');
  shop = await createUser('SHOPKEEPER');
  stranger = await createUser('SHOPKEEPER');
  driver = await createUser('DRIVER');
  driver2 = await createUser('DRIVER');
  admin = await createUser('ADMIN');

  const v = await api(driver.token).post('/api/v1/vehicles').send({ registrationNumber: 'ka 05 ab 1234', type: 'MINI_TRUCK', capacityKg: '1500', ownerName: 'Self' });
  vehicle = v.body.data;
  server = http.createServer(app);
  initSockets(server);
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
});
afterAll(async () => {
  await new Promise((r) => server.close(r));
  await prisma.$disconnect();
});

const newOrder = async () => {
  const l = (
    await api(farmer.token)
      .post('/api/v1/farmers/listings')
      .send({ productId: cat.tomato.id, harvestAt: new Date().toISOString(), totalQuantityKg: '500', pricePerKg: '20', minOrderKg: '10', publish: true })
  ).body.data;
  const o = (await api(shop.token).post('/api/v1/orders').send({ idempotencyKey: uuid(), source: 'HARVEST', items: [{ sourceId: l.id, quantityKg: '100' }] })).body.data;
  await api(farmer.token).post(`/api/v1/orders/${o.id}/transition`).send({ status: 'ACCEPTED' });
  return o;
};

const newRequest = async (orderId) =>
  (
    await api(farmer.token)
      .post('/api/v1/transport/requests')
      .send({
        orderId,
        commodity: 'Tomato 100 kg',
        expectedQuantityKg: '100',
        pickupAddress: 'Farm, Malur',
        pickupLat: 13.0,
        pickupLng: 77.9,
        pickupContactName: 'Farmer',
        pickupContactPhone: '9876543210',
        dropAddress: 'Shop, Bengaluru',
        dropLat: 12.97,
        dropLng: 77.59,
        offeredCharge: '1000',
      })
  ).body.data;

const trip = (who, id, status, extra = {}) => api(who.token).post(`/api/v1/transport/trips/${id}/transition`).send({ status, ...extra });

describe('Vehicles', () => {
  test('registration is normalised and must be verified before use', async () => {
    expect(vehicle.registrationNumber).toBe('KA05AB1234');
    expect(vehicle.verificationStatus).toBe('PENDING');
    const dup = await api(driver2.token).post('/api/v1/vehicles').send({ registrationNumber: 'KA05AB1234', type: 'TEMPO', capacityKg: '500', ownerName: 'Xavier' });
    expect(dup.status).toBe(409);
    const badPlate = await api(driver2.token).post('/api/v1/vehicles').send({ registrationNumber: 'HELLO', type: 'TEMPO', capacityKg: '500', ownerName: 'Xavier' });
    expect(badPlate.status).toBe(422);

    const o = await newOrder();
    const r = await newRequest(o.id);
    const early = await api(admin.token).post('/api/v1/transport/trips').send({ transportRequestId: r.id, driverId: driver.user.id, vehicleId: vehicle.id, transportCharge: '1000' });
    expect(early.status).toBe(409); // not verified

    expect((await api(driver.token).post(`/api/v1/vehicles/${vehicle.id}/verify`).send({ status: 'VERIFIED' })).status).toBe(403);
    const ver = await api(admin.token).post(`/api/v1/vehicles/${vehicle.id}/verify`).send({ status: 'VERIFIED' });
    expect(ver.body.data.verificationStatus).toBe('VERIFIED');

    // changing a verified field puts it back into review
    const upd = await api(driver.token).patch(`/api/v1/vehicles/${vehicle.id}`).send({ capacityKg: '1800' });
    expect(upd.body.data.verificationStatus).toBe('PENDING');
    await api(admin.token).post(`/api/v1/vehicles/${vehicle.id}/verify`).send({ status: 'VERIFIED' });
  });

  test('vehicle documents upload with signature check', async () => {
    const pdf = Buffer.from('%PDF-1.4\n% test document content\n');
    const ok = await api(driver.token).post(`/api/v1/vehicles/${vehicle.id}/documents`).field('type', 'INSURANCE').field('documentNumber', 'POL-1').field('expiryDate', '2030-01-01').attach('file', pdf, { filename: 'ins.pdf', contentType: 'application/pdf' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.documents).toHaveLength(1);
    expect(ok.body.data.insurancePolicyNo).toBe('POL-1');
    const fake = await api(driver.token).post(`/api/v1/vehicles/${vehicle.id}/documents`).field('type', 'PERMIT').attach('file', Buffer.from('MZ not really a pdf at all'), { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(fake.status).toBe(400);
  });
});

describe('Trip lifecycle', () => {
  test('ASSIGNED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED drives the order too', async () => {
    const o = await newOrder();
    await api(farmer.token).post(`/api/v1/orders/${o.id}/transition`).send({ status: 'PREPARING' });
    await api(farmer.token).post(`/api/v1/orders/${o.id}/transition`).send({ status: 'READY' });
    const r = await newRequest(o.id);
    expect((await newRequestDup(o.id)).status).toBe(409);

    const assigned = await api(admin.token).post('/api/v1/transport/trips').send({ transportRequestId: r.id, driverId: driver.user.id, vehicleId: vehicle.id, transportCharge: '1000' });
    expect(assigned.status).toBe(201);
    const t = assigned.body.data;
    expect(t.status).toBe('ASSIGNED');

    expect((await trip(driver2, t.id, 'ACCEPTED')).status).toBe(404); // other driver cannot see it
    expect((await trip(driver, t.id, 'IN_TRANSIT')).status).toBe(409); // cannot skip
    expect((await trip(driver, t.id, 'ACCEPTED')).status).toBe(200);
    expect((await trip(driver, t.id, 'PICKED_UP')).status).toBe(422); // loaded quantity required
    expect((await trip(driver, t.id, 'PICKED_UP', { loadedQuantityKg: '100' })).status).toBe(200);
    expect((await prisma.order.findUnique({ where: { id: o.id } })).status).toBe('DISPATCHED');
    expect((await trip(admin, t.id, 'CANCELLED', { reason: 'too late' })).status).toBe(409); // after pickup
    expect((await trip(driver, t.id, 'IN_TRANSIT')).status).toBe(200);
    expect((await trip(driver, t.id, 'DELIVERED', { deliveredQuantityKg: '120' })).status).toBe(422);
    const done = await trip(driver, t.id, 'DELIVERED', { deliveredQuantityKg: '99' });
    expect(done.status).toBe(200);
    expect(done.body.data.events.map((e) => e.toStatus)).toEqual(['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']);

    const ord = await prisma.order.findUnique({ where: { id: o.id }, include: { items: true } });
    expect(ord.status).toBe('DELIVERED');
    expect(String(ord.items[0].deliveredQuantityKg)).toBe('99');
    expect((await prisma.transportRequest.findUnique({ where: { id: r.id } })).status).toBe('COMPLETED');

    // Requester pays the driver; capped at the agreed charge
    expect((await api(farmer.token).post(`/api/v1/payments/trips/${t.id}`).send({ amount: '1500', mode: 'UPI' })).status).toBe(422);
    expect((await api(farmer.token).post(`/api/v1/payments/trips/${t.id}`).send({ amount: '1000', mode: 'UPI' })).status).toBe(201);
    const earn = await api(driver.token).get('/api/v1/drivers/earnings');
    expect(earn.body.data.totals.received).toBe('1000');
  });

  test('rejection puts the load back on the market; drivers can claim open loads once', async () => {
    const o = await newOrder();
    const r = await newRequest(o.id);
    const t = (await api(admin.token).post('/api/v1/transport/trips').send({ transportRequestId: r.id, driverId: driver.user.id, vehicleId: vehicle.id, transportCharge: '900' })).body.data;
    expect((await trip(driver, t.id, 'REJECTED')).status).toBe(422); // reason needed
    expect((await trip(driver, t.id, 'REJECTED', { reason: 'Vehicle under repair' })).status).toBe(200);
    expect((await prisma.transportRequest.findUnique({ where: { id: r.id } })).status).toBe('OPEN');

    const open = await api(driver.token).get('/api/v1/transport/requests');
    expect(open.body.data.some((x) => x.id === r.id)).toBe(true);

    const [c1, c2] = await Promise.all([
      api(driver.token).post(`/api/v1/transport/requests/${r.id}/claim`).send({ vehicleId: vehicle.id }),
      api(driver.token).post(`/api/v1/transport/requests/${r.id}/claim`).send({ vehicleId: vehicle.id }),
    ]);
    expect([c1.status, c2.status].sort()).toEqual([201, 409]);
    const claimed = c1.status === 201 ? c1.body.data : c2.body.data;
    expect(claimed.status).toBe('ACCEPTED');
    expect(claimed.transportCharge).toBe('1000');
  });
});

describe('Live tracking authorization', () => {
  let t;
  let order;
  beforeAll(async () => {
    order = await newOrder();
    const r = await newRequest(order.id);
    t = (await api(admin.token).post('/api/v1/transport/trips').send({ transportRequestId: r.id, driverId: driver.user.id, vehicleId: vehicle.id, transportCharge: '800' })).body.data;
  });

  const post = (who, body) => api(who.token).post(`/api/v1/tracking/trips/${t.id}/locations`).send(body);

  test('no location is accepted before the driver accepts the trip', async () => {
    expect((await post(driver, { latitude: 13.0, longitude: 77.9 })).status).toBe(409);
  });

  test('only the assigned driver can post; updates are rate-limited; parties can read', async () => {
    await trip(driver, t.id, 'ACCEPTED');
    expect((await post(driver2, { latitude: 13.0, longitude: 77.9 })).status).toBe(404);
    expect((await post(driver, { latitude: 91, longitude: 77.9 })).status).toBe(422);
    expect((await post(driver, { latitude: 13.01, longitude: 77.91 })).status).toBe(201);
    expect((await post(driver, { latitude: 13.02, longitude: 77.92 })).status).toBe(429);

    for (const who of [shop, farmer, admin, driver]) {
      const res = await api(who.token).get(`/api/v1/tracking/trips/${t.id}/locations`);
      expect(res.status).toBe(200);
      expect(res.body.data.points).toHaveLength(1);
      expect(res.body.data.snapshot.isStale).toBe(false);
    }
    expect((await api(stranger.token).get(`/api/v1/tracking/trips/${t.id}/locations`)).status).toBe(404);
    expect((await api(driver2.token).get(`/api/v1/tracking/trips/${t.id}/locations`)).status).toBe(404);

    const active = await api(stranger.token).get('/api/v1/tracking/active');
    expect(active.body.data.find((x) => x.id === t.id)).toBeUndefined();
    const mine = await api(shop.token).get('/api/v1/tracking/active');
    expect(mine.body.data.find((x) => x.id === t.id)).toBeDefined();
  });

  test('socket: unrelated users cannot join the trip room; related users receive live points', async () => {
    const connect = (token) => ioClient(`http://localhost:${port}`, { auth: { token }, transports: ['websocket'], forceNew: true });
    const shopSock = connect(shop.token);
    const strangerSock = connect(stranger.token);
    const driverSock = connect(driver.token);
    const bad = connect('not-a-token');
    try {
      const badErr = await new Promise((r) => bad.on('connect_error', (e) => r(e.message)));
      expect(badErr).toBe('UNAUTHORIZED');

      const subShop = await shopSock.timeout(5000).emitWithAck('trip:subscribe', { tripId: t.id });
      expect(subShop.ok).toBe(true);
      const subStranger = await strangerSock.timeout(5000).emitWithAck('trip:subscribe', { tripId: t.id });
      expect(subStranger.ok).toBe(false);

      const received = new Promise((r) => shopSock.on('trip:location', r));
      let strangerGot = false;
      strangerSock.on('trip:location', () => (strangerGot = true));

      await waitFor(2100); // respect the per-trip minimum interval
      const ack = await driverSock.timeout(5000).emitWithAck('trip:location', { tripId: t.id, latitude: 13.05, longitude: 77.8 });
      expect(ack.ok).toBe(true);
      const point = await received;
      expect(point.latitude).toBe(13.05);
      await waitFor(200);
      expect(strangerGot).toBe(false);

      // shopkeeper cannot push locations
      const spoof = await shopSock.timeout(5000).emitWithAck('trip:location', { tripId: t.id, latitude: 1, longitude: 1 });
      expect(spoof.ok).toBe(false);

      // tracking stops when the trip ends
      const stopped = new Promise((r) => shopSock.on('trip:tracking-stopped', r));
      await trip(driver, t.id, 'PICKED_UP', { loadedQuantityKg: '100' });
      await trip(driver, t.id, 'IN_TRANSIT');
      await trip(driver, t.id, 'FAILED', { reason: 'Receiver unavailable, shop closed' });
      expect((await stopped).status).toBe('FAILED');
      await waitFor(2100);
      const late = await driverSock.timeout(5000).emitWithAck('trip:location', { tripId: t.id, latitude: 13.06, longitude: 77.8 });
      expect(late.ok).toBe(false);
      const snap = await prisma.trip.findUnique({ where: { id: t.id } });
      expect(snap.trackingActive).toBe(false);
    } finally {
      [shopSock, strangerSock, driverSock, bad].forEach((s) => s.close());
    }
  });
});

// helper defined after use for readability
async function newRequestDup(orderId) {
  return api(farmer.token)
    .post('/api/v1/transport/requests')
    .send({ orderId, commodity: 'Tomato', expectedQuantityKg: '1', pickupAddress: 'abc', pickupContactName: 'ab', pickupContactPhone: '9876543210', dropAddress: 'xyz' });
}
