/* eslint-disable no-console */
/**
 * Development seed. Creates demo accounts for every role plus a realistic catalogue, stock, listings,
 * bills and an order that has gone through the full lifecycle — all through the real service layer,
 * so seeded data follows the same rules as data created in the app.
 *
 *   npm run prisma:seed            → seeds only if the database is empty
 *   npm run prisma:seed -- --reset → wipes all data first (refused when NODE_ENV=production)
 */
require('dotenv').config();
const crypto = require('node:crypto');
const prisma = require('../src/config/prisma');
const { DEFAULT_SETTINGS } = require('../src/constants');

const DEMO_PASSWORDS = {
  ADMIN: '123456',
  SHOPKEEPER: '123456',
  FARMER: '123456',
  MANDI_OWNER: '123456',
  DRIVER: '123456',
};

const CATEGORIES = [
  { name: 'Vegetables', type: 'VEGETABLE' },
  { name: 'Fruits', type: 'FRUIT' },
  { name: 'Leafy Greens', type: 'LEAFY_GREEN' },
  { name: 'Grains', type: 'GRAIN' },
  { name: 'Pulses', type: 'PULSE' },
  { name: 'Spices', type: 'SPICE' },
];

const PRODUCTS = [
  ['Tomato', 'Tamatar', 'Vegetables', '🍅'],
  ['Onion', 'Pyaaz', 'Vegetables', '🧅'],
  ['Potato', 'Aloo', 'Vegetables', '🥔'],
  ['Carrot', 'Gajar', 'Vegetables', '🥕'],
  ['Brinjal', 'Baingan', 'Vegetables', '🍆'],
  ['Green Chilli', 'Hari Mirch', 'Vegetables', '🌶️'],
  ['Cucumber', 'Kheera', 'Vegetables', '🥒'],
  ['Capsicum', 'Shimla Mirch', 'Vegetables', '🫑'],
  ['Cauliflower', 'Phool Gobhi', 'Vegetables', '🥦'],
  ['Cabbage', 'Patta Gobhi', 'Vegetables', '🥬'],
  ['Beans', 'Sem', 'Vegetables', '🫛'],
  ['Ginger', 'Adrak', 'Spices', '🫚'],
  ['Garlic', 'Lahsun', 'Spices', '🧄'],
  ['Corn', 'Makka', 'Grains', '🌽'],
  ['Banana', 'Kela', 'Fruits', '🍌'],
  ['Mango', 'Aam', 'Fruits', '🥭'],
  ['Apple', 'Seb', 'Fruits', '🍎'],
  ['Grapes', 'Angoor', 'Fruits', '🍇'],
  ['Papaya', 'Papita', 'Fruits', '🍈'],
  ['Watermelon', 'Tarbooz', 'Fruits', '🍉'],
  ['Pomegranate', 'Anaar', 'Fruits', '🍎'],
  ['Orange', 'Santra', 'Fruits', '🍊'],
  ['Lemon', 'Nimbu', 'Fruits', '🍋'],
  ['Coconut', 'Nariyal', 'Fruits', '🥥'],
  ['Spinach', 'Palak', 'Leafy Greens', '🥬'],
  ['Coriander', 'Dhaniya', 'Leafy Greens', '🌿'],
  ['Mint', 'Pudina', 'Leafy Greens', '🌿'],
  ['Fenugreek Leaves', 'Methi', 'Leafy Greens', '🌿'],
  ['Rice', 'Chawal', 'Grains', '🍚'],
  ['Toor Dal', 'Arhar', 'Pulses', '🫘'],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const reset = async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to reset a production database');
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  }
  console.log('• Existing data removed');
};

const main = async () => {
  if (process.argv.includes('--reset')) await reset();
  else if (await prisma.user.count()) {
    console.log('Database already has users — skipping seed. Use "npm run prisma:seed -- --reset" to start over.');
    return;
  }

  // Services are required after any reset so their caches start empty.
  const auth = require('../src/modules/auth/auth.service');
  const inventory = require('../src/modules/inventory/inventory.service');
  const billing = require('../src/modules/billing/billing.service');
  const farmer = require('../src/modules/farmer/farmer.service');
  const mandi = require('../src/modules/mandi/mandi.service');
  const orders = require('../src/modules/orders/orders.service');
  const payments = require('../src/modules/payments/payments.service');
  const transport = require('../src/modules/transport/transport.service');
  const vehicles = require('../src/modules/vehicle/vehicle.service');
  const customers = require('../src/modules/customers/customers.service');
  const suppliers = require('../src/modules/suppliers/suppliers.service');

  // ─── Settings ───
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.applicationSetting.upsert({ where: { key }, create: { key, value: def.value, description: def.description, isPublic: def.isPublic }, update: {} });
  }

  // ─── Catalogue ───
  const cats = {};
  for (const c of CATEGORIES) cats[c.name] = await prisma.productCategory.create({ data: { ...c, slug: slug(c.name) } });
  const products = {};
  for (const [name, localName, cat, emoji] of PRODUCTS) {
    products[name] = await prisma.product.create({ data: { name, localName, emoji, categoryId: cats[cat].id } });
  }
  console.log(`• ${PRODUCTS.length} products in ${CATEGORIES.length} categories`);

  // ─── Users ───
  const mk = (input) => auth.createUserWithProfile(input, { status: 'ACTIVE', action: 'USER_SEEDED' });
  const admin = await mk({ role: 'ADMIN', name: 'Platform Admin', mobile: '9000000001', email: 'admin@gmail.com', password: DEMO_PASSWORDS.ADMIN });
  const shop = await mk({
    role: 'SHOPKEEPER',
    name: 'Suresh Kumar',
    mobile: '9000000002',
    email: 'shop@gmail.com',
    password: DEMO_PASSWORDS.SHOPKEEPER,
    shopName: 'Sri Lakshmi Fresh Vegetables',
    address: { line1: '12, 4th Cross, Jayanagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560041', latitude: 12.9308, longitude: 77.5838 },
  });
  const farmerUser = await mk({
    role: 'FARMER',
    name: 'Ramesh Gowda',
    mobile: '9000000003',
    email: 'farmer@gmail.com',
    password: DEMO_PASSWORDS.FARMER,
    farmName: 'Gowda Organic Farms',
    primaryCrops: ['Tomato', 'Onion', 'Beans'],
    address: { village: 'Malur', district: 'Kolar', state: 'Karnataka', pincode: '563130', latitude: 13.0037, longitude: 77.9383 },
  });
  const farmer2 = await mk({
    role: 'FARMER',
    name: 'Lakshmamma',
    mobile: '9000000006',
    email: 'farmer2@gmail.com',
    password: DEMO_PASSWORDS.FARMER,
    farmName: 'Devanahalli Orchards',
    primaryCrops: ['Mango', 'Banana', 'Papaya'],
    address: { village: 'Devanahalli', district: 'Bengaluru Rural', state: 'Karnataka', pincode: '562110', latitude: 13.2437, longitude: 77.7172 },
  });
  const mandiUser = await mk({
    role: 'MANDI_OWNER',
    name: 'Mohammed Irfan',
    mobile: '9000000004',
    email: 'mandi@gmail.com',
    password: DEMO_PASSWORDS.MANDI_OWNER,
    mandiName: 'Irfan & Sons Wholesale',
    marketYardName: 'K.R. Market APMC Yard',
    licenseNumber: 'APMC-BLR-2024-117',
    address: { line1: 'Gate 3, K.R. Market', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560002', latitude: 12.9634, longitude: 77.5775 },
  });
  await prisma.mandiProfile.update({ where: { userId: mandiUser.id }, data: { commissionPercent: '4.00' } });
  const driverUser = await mk({
    role: 'DRIVER',
    name: 'Manjunath R',
    mobile: '9000000005',
    email: 'driver@gmail.com',
    password: DEMO_PASSWORDS.DRIVER,
    licenseNumber: 'KA0520190012345',
    licenseExpiry: new Date('2031-03-31'),
    experienceYrs: 8,
    address: { city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
  });
  const driver2 = await mk({
    role: 'DRIVER',
    name: 'Prakash Naik',
    mobile: '9000000007',
    email: 'driver2@gmail.com',
    password: DEMO_PASSWORDS.DRIVER,
    licenseNumber: 'KA0720170098765',
    experienceYrs: 5,
  });
  // A pending registration so the approval workflow has something to show.
  await auth.createUserWithProfile(
    { role: 'DRIVER', name: 'Venkatesh (pending)', mobile: '9000000008', password: DEMO_PASSWORDS.DRIVER, licenseNumber: 'KA0120210055555' },
    { status: 'PENDING_APPROVAL', action: 'USER_SEEDED' }
  );
  console.log('• Demo users for all five roles');

  const as = async (u) => prisma.user.findUnique({ where: { id: u.id }, select: { id: true, name: true, role: true, email: true, mobile: true, status: true } });
  const A = await as(admin);
  const S = await as(shop);
  const F = await as(farmerUser);
  const F2 = await as(farmer2);
  const M = await as(mandiUser);
  const D1 = await as(driverUser);
  const D2 = await as(driver2);

  // ─── Vehicles (verified by admin through the normal workflow) ───
  const v1 = await vehicles.create(D1, {
    registrationNumber: 'KA05AB1234',
    type: 'MINI_TRUCK',
    make: 'Tata',
    model: 'Ace Gold',
    capacityKg: '1500',
    ownerName: 'Manjunath R',
    insurancePolicyNo: 'INS-77821',
    insuranceExpiry: new Date('2027-06-30'),
    fitnessExpiry: new Date('2028-01-31'),
  });
  await vehicles.verify(A, v1.id, { status: 'VERIFIED', note: 'Documents checked' });
  const v2 = await vehicles.create(D2, {
    registrationNumber: 'KA07C4521',
    type: 'TRACTOR',
    make: 'Mahindra',
    model: '575 DI with trolley',
    capacityKg: '3000',
    ownerName: 'Prakash Naik',
    insuranceExpiry: new Date('2027-02-28'),
  });
  await vehicles.verify(A, v2.id, { status: 'VERIFIED', note: 'Documents checked' });
  await vehicles.create(D1, { registrationNumber: 'KA05MN9087', type: 'TEMPO', make: 'Mahindra', model: 'Jeeto', capacityKg: '700', ownerName: 'Manjunath R' });
  console.log('• Vehicles registered and verified');

  // ─── Shop stock & rates master ───
  const stock = [
    ['Tomato', '32.00', '24.00', '85'],
    ['Onion', '38.00', '30.00', '120'],
    ['Potato', '30.00', '22.00', '150'],
    ['Carrot', '56.00', '42.00', '40'],
    ['Brinjal', '40.00', '30.00', '25'],
    ['Green Chilli', '80.00', '60.00', '12'],
    ['Cucumber', '36.00', '26.00', '30'],
    ['Capsicum', '70.00', '52.00', '18'],
    ['Beans', '64.00', '48.00', '22'],
    ['Ginger', '120.00', '90.00', '8'],
    ['Banana', '48.00', '36.00', '60'],
    ['Apple', '180.00', '140.00', '35'],
    ['Pomegranate', '160.00', '120.00', '20'],
    ['Grapes', '90.00', '68.00', '3'],
    ['Spinach', '40.00', '28.00', '10'],
    ['Coriander', '60.00', '40.00', '4'],
    ['Mint', '80.00', '55.00', '3'],
  ];
  const inv = {};
  for (const [name, sell, cost, opening] of stock) {
    inv[name] = await inventory.create(S, { productId: products[name].id, sellingPricePerKg: sell, costPricePerKg: cost, openingQuantityKg: opening, lowStockThresholdKg: '5' });
  }
  console.log(`• ${stock.length} stock items for the shop`);

  // ─── Customers & suppliers ───
  const cust = await customers.create(S.id, { name: 'Anitha Rao', mobile: '9845012345', creditLimit: '5000' });
  await customers.create(S.id, { name: 'Hotel Annapoorna', mobile: '9845098765', creditLimit: '25000', address: 'Jayanagar 9th Block' });
  const supplier = await suppliers.create(S.id, { name: 'Hosur Road Vegetable Traders', mobile: '9886001122', type: 'WHOLESALER' });

  // ─── POS bills ───
  const bill = (items, extra = {}) =>
    billing.createInvoice(S, {
      idempotencyKey: crypto.randomUUID(),
      items: items.map(([name, q]) => ({ inventoryItemId: inv[name].id, quantityKg: q })),
      discount: '0',
      paymentMode: 'CASH',
      ...extra,
    });
  await bill([['Tomato', '2'], ['Onion', '1.5'], ['Coriander', '0.25']]);
  await bill([['Apple', '1'], ['Banana', '2']], { paymentMode: 'UPI', paymentReference: 'UPI-DEMO-001' });
  await bill([['Potato', '5'], ['Carrot', '1'], ['Beans', '0.5']], { paymentMode: 'CREDIT', customerName: 'Anitha Rao', customerMobile: cust.mobile, amountPaid: '100' });
  await bill([['Capsicum', '0.5'], ['Green Chilli', '0.25'], ['Ginger', '0.25']], { customerName: 'Walk-in', discount: '2.00' });
  console.log('• 4 POS bills (cash, UPI, credit)');

  // ─── Farmer harvest listings ───
  const harvestDay = new Date(Date.now() - 86_400_000);
  const tomato = await farmer.create(F, {
    productId: products.Tomato.id,
    variety: 'Hybrid (Arka Rakshak)',
    grade: 'A',
    description: 'Firm, deep red tomatoes. Hand-picked and sorted.',
    harvestAt: harvestDay,
    totalQuantityKg: '1200',
    pricePerKg: '18.00',
    minOrderKg: '50',
    freshnessNotes: 'Picked yesterday morning, stored in shade',
    publish: true,
  });
  await farmer.create(F, { productId: products.Onion.id, variety: 'Bellary Red', grade: 'A', harvestAt: harvestDay, totalQuantityKg: '2500', pricePerKg: '22.00', minOrderKg: '100', publish: true });
  await farmer.create(F, { productId: products.Beans.id, variety: 'French beans', harvestAt: new Date(), totalQuantityKg: '300', pricePerKg: '38.00', minOrderKg: '25', publish: true });
  await farmer.create(F, { productId: products.Cucumber.id, harvestAt: new Date(Date.now() + 3 * 86_400_000), totalQuantityKg: '400', pricePerKg: '15.00', minOrderKg: '40', publish: false });
  await farmer.create(F2, { productId: products.Mango.id, variety: 'Alphonso', grade: 'Premium', harvestAt: harvestDay, totalQuantityKg: '800', pricePerKg: '85.00', minOrderKg: '20', freshnessNotes: 'Naturally ripened, no carbide', publish: true });
  await farmer.create(F2, { productId: products.Banana.id, variety: 'Yelakki', harvestAt: harvestDay, totalQuantityKg: '600', pricePerKg: '34.00', minOrderKg: '30', publish: true });
  console.log('• 6 harvest listings');

  // ─── Mandi lots ───
  await mandi.create(M, { productId: products.Potato.id, variety: 'Jyoti', grade: 'Medium', lotType: 'BAGGED', unitSizeKg: '50', totalWeightKg: '5000', pricePerKg: '19.50', minOrderKg: '200', marketYardName: 'K.R. Market APMC Yard', location: 'Shed 14', qualityNotes: 'Cleaned, no greening', loadingInfo: 'Gate 3, loading 6 AM – 2 PM', publish: true });
  await mandi.create(M, { productId: products.Onion.id, variety: 'Nashik Red', grade: 'Big', lotType: 'BAGGED', unitSizeKg: '50', totalWeightKg: '8000', pricePerKg: '26.00', minOrderKg: '250', marketYardName: 'K.R. Market APMC Yard', location: 'Shed 9', publish: true });
  await mandi.create(M, { productId: products.Apple.id, variety: 'Shimla Royal Delicious', grade: 'A', lotType: 'BOXED', unitSizeKg: '25', totalWeightKg: '1500', pricePerKg: '115.00', minOrderKg: '50', marketYardName: 'K.R. Market APMC Yard', location: 'Fruit section', publish: true });
  await mandi.create(M, { productId: products.Pomegranate.id, variety: 'Bhagwa', lotType: 'CRATED', unitSizeKg: '20', totalWeightKg: '900', pricePerKg: '95.00', minOrderKg: '40', marketYardName: 'K.R. Market APMC Yard', publish: true });
  console.log('• 4 mandi lots');

  // ─── A completed shop ← farmer order, end to end ───
  const { order } = await orders.createOrder(S, { idempotencyKey: crypto.randomUUID(), source: 'HARVEST', items: [{ sourceId: tomato.id, quantityKg: '100' }], notes: 'Deliver before 8 AM' });
  await orders.transition(F, order.id, { status: 'ACCEPTED' });
  await orders.transition(F, order.id, { status: 'PREPARING' });
  const request = await transport.createRequest(F, {
    orderId: order.id,
    commodity: 'Tomato 100 kg (10 crates)',
    expectedQuantityKg: '100',
    pickupAddress: 'Gowda Organic Farms, Malur, Kolar',
    pickupLat: 13.0037,
    pickupLng: 77.9383,
    pickupContactName: 'Ramesh Gowda',
    pickupContactPhone: '9000000003',
    dropAddress: 'Sri Lakshmi Fresh Vegetables, Jayanagar, Bengaluru',
    dropLat: 12.9308,
    dropLng: 77.5838,
    dropContactName: 'Suresh Kumar',
    dropContactPhone: '9000000002',
    preferredVehicleType: 'MINI_TRUCK',
    offeredCharge: '1200',
  });
  await orders.transition(F, order.id, { status: 'READY' });
  const trip = await transport.assignTrip(A, { transportRequestId: request.id, driverId: D1.id, vehicleId: v1.id, transportCharge: '1200' });
  await transport.transitionTrip(D1, trip.id, { status: 'ACCEPTED' });
  await transport.transitionTrip(D1, trip.id, { status: 'PICKED_UP', loadedQuantityKg: '100' });
  await transport.transitionTrip(D1, trip.id, { status: 'IN_TRANSIT' });
  await transport.transitionTrip(D1, trip.id, { status: 'DELIVERED', deliveredQuantityKg: '98' });
  const delivered = await orders.getOrder(S, order.id);
  await orders.receive(S, order.id, { items: delivered.items.map((i) => ({ itemId: i.id, receivedQuantityKg: '98' })) });
  await payments.payOrder(S, order.id, { amount: '1000', mode: 'UPI', reference: 'UPI-DEMO-ORDER' });
  await payments.payTrip(A, trip.id, { amount: '1200', mode: 'BANK_TRANSFER', reference: 'NEFT-DEMO' });
  console.log('• Order ORD (farmer → shop) taken through accept → transport → delivery → receipt → payment');

  // ─── Orders waiting for action, so each dashboard has work to do ───
  const lots = await prisma.mandiLot.findMany({ where: { mandiOwnerId: M.id }, orderBy: { createdAt: 'asc' } });
  await orders.createOrder(S, { idempotencyKey: crypto.randomUUID(), source: 'MANDI_LOT', items: [{ sourceId: lots[0].id, quantityKg: '250' }] });
  const onion = await prisma.harvestListing.findFirst({ where: { farmerId: F.id, cropName: 'Onion' } });
  const { order: mandiOrder } = await orders.createOrder(M, { idempotencyKey: crypto.randomUUID(), source: 'HARVEST', items: [{ sourceId: onion.id, quantityKg: '500' }] });
  await orders.transition(F, mandiOrder.id, { status: 'ACCEPTED' });

  // An open load for the driver marketplace
  await transport.createRequest(F2, {
    commodity: 'Mango 200 kg',
    expectedQuantityKg: '200',
    pickupAddress: 'Devanahalli Orchards, Devanahalli',
    pickupLat: 13.2437,
    pickupLng: 77.7172,
    pickupContactName: 'Lakshmamma',
    pickupContactPhone: '9000000006',
    dropAddress: 'K.R. Market APMC Yard, Bengaluru',
    dropLat: 12.9634,
    dropLng: 77.5775,
    offeredCharge: '1500',
    preferredPickupAt: new Date(Date.now() + 86_400_000),
  });

  // Supplier purchase awaiting receipt
  const procurement = require('../src/modules/procurement/procurement.service');
  await procurement.createPurchase(S, { supplierId: supplier.id, items: [{ productId: products.Grapes.id, quantityKg: '20', unitCost: '65.00' }, { productId: products.Mint.id, quantityKg: '5', unitCost: '50.00' }] });

  console.log('\n✔ Seed complete. Demo accounts (development only):');
  console.table([
    { role: 'ADMIN', login: 'admin@gmail.com / 9000000001', password: DEMO_PASSWORDS.ADMIN },
    { role: 'SHOPKEEPER', login: 'shop@gmail.com / 9000000002', password: DEMO_PASSWORDS.SHOPKEEPER },
    { role: 'FARMER', login: 'farmer@gmail.com / 9000000003', password: DEMO_PASSWORDS.FARMER },
    { role: 'MANDI_OWNER', login: 'mandi@gmail.com / 9000000004', password: DEMO_PASSWORDS.MANDI_OWNER },
    { role: 'DRIVER', login: 'driver@gmail.com / 9000000005', password: DEMO_PASSWORDS.DRIVER },
  ]);
};

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
