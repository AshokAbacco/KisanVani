const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { money } = require('../../utils/money');

/** Normalises a date range (default: last 30 days, inclusive of the end day). */
const range = ({ from, to }) => {
  const end = to ? new Date(to) : new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = from ? new Date(from) : new Date(end.getTime() - 29 * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);
  if (start > end) throw ApiError.badRequest('"from" must be before "to"');
  if (end - start > 366 * 86_400_000) throw ApiError.badRequest('Reports are limited to one year at a time');
  return { start, end };
};

const m = (rows, keys) => rows.map((r) => ({ ...r, ...Object.fromEntries(keys.map((k) => [k, money(r[k] || 0)])) }));

const shopSummary = async (userId, { start, end }) => {
  const [daily, byMode, products, totals, purchases] = await Promise.all([
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS bills, SUM(total) AS amount
                     FROM sales_invoices WHERE "shopId" = ${userId} AND status = 'COMPLETED' AND "createdAt" BETWEEN ${start} AND ${end} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT "paymentMode" AS mode, COUNT(*)::int AS bills, SUM(total) AS amount FROM sales_invoices
                     WHERE "shopId" = ${userId} AND status = 'COMPLETED' AND "createdAt" BETWEEN ${start} AND ${end} GROUP BY 1`,
    prisma.$queryRaw`SELECT i."productName" AS name, SUM(i."quantityKg") AS "quantityKg", SUM(i."lineTotal") AS amount
                     FROM sales_invoice_items i JOIN sales_invoices s ON s.id = i."invoiceId"
                     WHERE s."shopId" = ${userId} AND s.status = 'COMPLETED' AND s."createdAt" BETWEEN ${start} AND ${end}
                     GROUP BY 1 ORDER BY amount DESC LIMIT 10`,
    prisma.$queryRaw`SELECT COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS bills, COALESCE(SUM(total) FILTER (WHERE status = 'COMPLETED'), 0) AS sales,
                            COALESCE(SUM(discount) FILTER (WHERE status = 'COMPLETED'), 0) AS discount, COALESCE(SUM("creditAmount") FILTER (WHERE status = 'COMPLETED'), 0) AS credit,
                            COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
                     FROM sales_invoices WHERE "shopId" = ${userId} AND "createdAt" BETWEEN ${start} AND ${end}`,
    prisma.$queryRaw`SELECT COALESCE(SUM(total), 0) AS amount, COUNT(*)::int AS count FROM orders
                     WHERE "buyerId" = ${userId} AND status = 'RECEIVED' AND "receivedAt" BETWEEN ${start} AND ${end}`,
  ]);
  const t = totals[0];
  return {
    totals: {
      sales: money(t.sales),
      bills: t.bills,
      averageBill: t.bills ? money(Number(t.sales) / t.bills) : '0.00',
      discount: money(t.discount),
      creditGiven: money(t.credit),
      cancelledBills: t.cancelled,
      platformPurchases: money(purchases[0].amount),
      platformPurchaseOrders: purchases[0].count,
    },
    daily: m(daily, ['amount']),
    byPaymentMode: m(byMode, ['amount']),
    topProducts: m(products, ['amount']),
  };
};

const sellerSummary = async (userId, { start, end }) => {
  const [daily, products, buyers, statuses, settle] = await Promise.all([
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS orders, SUM(total) AS amount
                     FROM orders WHERE "sellerId" = ${userId} AND status NOT IN ('REJECTED','CANCELLED') AND "createdAt" BETWEEN ${start} AND ${end} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT p.name, SUM(COALESCE(oi."receivedQuantityKg", oi."quantityKg")) AS "quantityKg", SUM(oi."lineTotal") AS amount
                     FROM order_items oi JOIN orders o ON o.id = oi."orderId" JOIN products p ON p.id = oi."productId"
                     WHERE o."sellerId" = ${userId} AND o.status NOT IN ('REJECTED','CANCELLED') AND o."createdAt" BETWEEN ${start} AND ${end}
                     GROUP BY 1 ORDER BY amount DESC LIMIT 10`,
    prisma.$queryRaw`SELECT u.name, u.role, COUNT(o.id)::int AS orders, SUM(o.total) AS amount FROM orders o JOIN users u ON u.id = o."buyerId"
                     WHERE o."sellerId" = ${userId} AND o.status NOT IN ('REJECTED','CANCELLED') AND o."createdAt" BETWEEN ${start} AND ${end}
                     GROUP BY u.id ORDER BY amount DESC LIMIT 10`,
    prisma.$queryRaw`SELECT status, COUNT(*)::int AS count FROM orders WHERE "sellerId" = ${userId} AND "createdAt" BETWEEN ${start} AND ${end} GROUP BY 1`,
    prisma.$queryRaw`SELECT COALESCE(SUM("grossAmount"),0) AS gross, COALESCE(SUM("commissionAmount"),0) AS commission, COALESCE(SUM("netAmount"),0) AS net, COALESCE(SUM("paidAmount"),0) AS paid
                     FROM settlements WHERE "payeeId" = ${userId} AND status <> 'CANCELLED' AND "createdAt" BETWEEN ${start} AND ${end}`,
  ]);
  const s = settle[0];
  return {
    totals: { gross: money(s.gross), commission: money(s.commission), net: money(s.net), received: money(s.paid), outstanding: money(Number(s.net) - Number(s.paid)) },
    daily: m(daily, ['amount']),
    topProducts: m(products, ['amount']),
    topBuyers: m(buyers, ['amount']),
    orderStatus: statuses,
  };
};

const mandiSummary = async (userId, r) => {
  const base = await sellerSummary(userId, r);
  const [bought, commission] = await Promise.all([
    prisma.$queryRaw`SELECT COALESCE(SUM(total), 0) AS amount, COUNT(*)::int AS count FROM orders
                     WHERE "buyerId" = ${userId} AND status NOT IN ('REJECTED','CANCELLED') AND "createdAt" BETWEEN ${r.start} AND ${r.end}`,
    prisma.$queryRaw`SELECT COALESCE(SUM("commissionAmount"), 0) AS amount FROM settlements
                     WHERE "payerId" = ${userId} AND status <> 'CANCELLED' AND "createdAt" BETWEEN ${r.start} AND ${r.end}`,
  ]);
  return { ...base, procurement: { amount: money(bought[0].amount), orders: bought[0].count }, commissionEarned: money(commission[0].amount) };
};

const driverSummary = async (userId, { start, end }) => {
  const [daily, statuses, totals] = await Promise.all([
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "deliveredAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS trips, SUM("transportCharge") AS amount
                     FROM trips WHERE "driverId" = ${userId} AND status = 'DELIVERED' AND "deliveredAt" BETWEEN ${start} AND ${end} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT status, COUNT(*)::int AS count FROM trips WHERE "driverId" = ${userId} AND "createdAt" BETWEEN ${start} AND ${end} GROUP BY 1`,
    prisma.$queryRaw`SELECT COUNT(*)::int AS trips, COALESCE(SUM("transportCharge"),0) AS earned, COALESCE(SUM("amountPaid"),0) AS received, COALESCE(SUM("deliveredQuantityKg"),0) AS "deliveredKg"
                     FROM trips WHERE "driverId" = ${userId} AND status = 'DELIVERED' AND "deliveredAt" BETWEEN ${start} AND ${end}`,
  ]);
  const t = totals[0];
  return {
    totals: { trips: t.trips, earned: money(t.earned), received: money(t.received), pending: money(Number(t.earned) - Number(t.received)), deliveredKg: t.deliveredKg },
    daily: m(daily, ['amount']),
    tripStatus: statuses,
  };
};

const adminSummary = async ({ start, end }) => {
  const [registrations, orders, trips, sales, roleCounts, orderStatus] = await Promise.all([
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, role, COUNT(*)::int AS count
                     FROM users WHERE "createdAt" BETWEEN ${start} AND ${end} GROUP BY 1, 2 ORDER BY 1`,
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS orders, SUM(total) AS value
                     FROM orders WHERE status NOT IN ('REJECTED','CANCELLED') AND "createdAt" BETWEEN ${start} AND ${end} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "deliveredAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS trips
                     FROM trips WHERE status = 'DELIVERED' AND "deliveredAt" BETWEEN ${start} AND ${end} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS bills, SUM(total) AS amount
                     FROM sales_invoices WHERE status = 'COMPLETED' AND "createdAt" BETWEEN ${start} AND ${end} GROUP BY 1 ORDER BY 1`,
    prisma.user.groupBy({ by: ['role', 'status'], _count: { _all: true } }),
    prisma.order.groupBy({ by: ['status'], where: { createdAt: { gte: start, lte: end } }, _count: { _all: true } }),
  ]);

  // Pivot registrations to one row per day with a column per role.
  const regByDay = {};
  for (const r of registrations) {
    regByDay[r.day] = regByDay[r.day] || { day: r.day, FARMER: 0, SHOPKEEPER: 0, MANDI_OWNER: 0, DRIVER: 0, ADMIN: 0 };
    regByDay[r.day][r.role] = r.count;
  }
  return {
    registrations: Object.values(regByDay),
    orders: m(orders, ['value']),
    completedTrips: trips,
    posSales: m(sales, ['amount']),
    usersByRole: roleCounts.map((r) => ({ role: r.role, status: r.status, count: r._count._all })),
    orderStatus: orderStatus.map((o) => ({ status: o.status, count: o._count._all })),
  };
};

const summary = async (user, query) => {
  const r = range(query);
  const fn = { SHOPKEEPER: shopSummary, FARMER: sellerSummary, MANDI_OWNER: mandiSummary, DRIVER: driverSummary }[user.role];
  const data = user.role === 'ADMIN' ? await adminSummary(r) : await fn(user.id, r);
  return { from: r.start, to: r.end, ...data };
};

// ─── CSV exports (always scoped to the caller) ───

const DATASETS = {
  sales: {
    roles: ['SHOPKEEPER', 'ADMIN'],
    columns: [
      { key: 'invoiceNumber', label: 'Invoice' },
      { key: 'createdAt', label: 'Date (UTC)' },
      { key: 'customerName', label: 'Customer' },
      { key: 'customerMobile', label: 'Mobile' },
      { key: 'subtotal', label: 'Subtotal' },
      { key: 'discount', label: 'Discount' },
      { key: 'total', label: 'Total' },
      { key: 'paymentMode', label: 'Mode' },
      { key: 'amountPaid', label: 'Paid' },
      { key: 'creditAmount', label: 'Credit' },
      { key: 'status', label: 'Status' },
    ],
    fetch: (user, { start, end }) =>
      prisma.salesInvoice.findMany({ where: { ...(user.role === 'ADMIN' ? {} : { shopId: user.id }), createdAt: { gte: start, lte: end } }, orderBy: { createdAt: 'asc' }, take: 50000 }),
  },
  stock: {
    roles: ['SHOPKEEPER'],
    columns: [
      { key: (r) => r.product.name, label: 'Product' },
      { key: 'quantityKg', label: 'Quantity (kg)' },
      { key: 'sellingPricePerKg', label: 'Selling ₹/kg' },
      { key: 'costPricePerKg', label: 'Cost ₹/kg' },
      { key: 'lowStockThresholdKg', label: 'Low-stock level (kg)' },
      { key: 'isActive', label: 'Active' },
    ],
    fetch: (user) => prisma.inventoryItem.findMany({ where: { shopId: user.id }, include: { product: true }, orderBy: { product: { name: 'asc' } } }),
  },
  credit: {
    roles: ['SHOPKEEPER'],
    columns: [
      { key: 'name', label: 'Customer' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'creditBalance', label: 'Outstanding' },
      { key: 'creditLimit', label: 'Limit' },
    ],
    fetch: (user) => prisma.customer.findMany({ where: { shopId: user.id, creditBalance: { gt: 0 } }, orderBy: { creditBalance: 'desc' } }),
  },
  orders: {
    roles: ['SHOPKEEPER', 'FARMER', 'MANDI_OWNER', 'ADMIN'],
    columns: [
      { key: 'orderNumber', label: 'Order' },
      { key: 'createdAt', label: 'Date (UTC)' },
      { key: 'type', label: 'Type' },
      { key: (r) => r.buyer.name, label: 'Buyer' },
      { key: (r) => r.seller.name, label: 'Seller' },
      { key: (r) => r.items.map((i) => `${i.itemName} ${i.quantityKg}kg`).join('; '), label: 'Items' },
      { key: 'total', label: 'Total' },
      { key: 'amountPaid', label: 'Paid' },
      { key: 'status', label: 'Status' },
    ],
    fetch: (user, { start, end }) =>
      prisma.order.findMany({
        where: { ...(user.role === 'ADMIN' ? {} : { OR: [{ buyerId: user.id }, { sellerId: user.id }] }), createdAt: { gte: start, lte: end } },
        include: { buyer: { select: { name: true } }, seller: { select: { name: true } }, items: true },
        orderBy: { createdAt: 'asc' },
        take: 50000,
      }),
  },
  settlements: {
    roles: ['SHOPKEEPER', 'FARMER', 'MANDI_OWNER', 'ADMIN'],
    columns: [
      { key: 'settlementNumber', label: 'Settlement' },
      { key: 'createdAt', label: 'Date (UTC)' },
      { key: (r) => r.order.orderNumber, label: 'Order' },
      { key: (r) => r.payer.name, label: 'Payer' },
      { key: (r) => r.payee.name, label: 'Payee' },
      { key: 'grossAmount', label: 'Gross' },
      { key: 'commissionAmount', label: 'Commission/Fees' },
      { key: 'netAmount', label: 'Net' },
      { key: 'paidAmount', label: 'Paid' },
      { key: 'status', label: 'Status' },
    ],
    fetch: (user, { start, end }) =>
      prisma.settlement.findMany({
        where: { ...(user.role === 'ADMIN' ? {} : { OR: [{ payerId: user.id }, { payeeId: user.id }] }), createdAt: { gte: start, lte: end } },
        include: { order: { select: { orderNumber: true } }, payer: { select: { name: true } }, payee: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
  },
  trips: {
    roles: ['DRIVER', 'ADMIN', 'MANDI_OWNER'],
    columns: [
      { key: 'tripNumber', label: 'Trip' },
      { key: 'createdAt', label: 'Created (UTC)' },
      { key: (r) => r.driver.name, label: 'Driver' },
      { key: (r) => r.vehicle.registrationNumber, label: 'Vehicle' },
      { key: 'commodity', label: 'Commodity' },
      { key: 'pickupAddress', label: 'Pickup' },
      { key: 'dropAddress', label: 'Destination' },
      { key: 'loadedQuantityKg', label: 'Loaded (kg)' },
      { key: 'deliveredQuantityKg', label: 'Delivered (kg)' },
      { key: 'transportCharge', label: 'Charge' },
      { key: 'amountPaid', label: 'Paid' },
      { key: 'status', label: 'Status' },
      { key: 'deliveredAt', label: 'Delivered at (UTC)' },
    ],
    fetch: (user, { start, end }) =>
      prisma.trip.findMany({
        where: {
          ...(user.role === 'ADMIN' ? {} : user.role === 'DRIVER' ? { driverId: user.id } : { OR: [{ assignedById: user.id }, { transportRequest: { requesterId: user.id } }] }),
          createdAt: { gte: start, lte: end },
        },
        include: { driver: { select: { name: true } }, vehicle: { select: { registrationNumber: true } } },
        orderBy: { createdAt: 'asc' },
      }),
  },
  users: {
    roles: ['ADMIN'],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'E-mail' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Registered (UTC)' },
      { key: 'lastLoginAt', label: 'Last login (UTC)' },
    ],
    fetch: () => prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: { name: true, role: true, mobile: true, email: true, status: true, createdAt: true, lastLoginAt: true } }),
  },
  payments: {
    roles: ['ADMIN', 'SHOPKEEPER', 'FARMER', 'MANDI_OWNER', 'DRIVER'],
    columns: [
      { key: 'paymentNumber', label: 'Payment' },
      { key: 'createdAt', label: 'Date (UTC)' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'mode', label: 'Mode' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status' },
      { key: (r) => r.payer?.name, label: 'Payer' },
      { key: (r) => r.payee?.name, label: 'Payee' },
      { key: 'reference', label: 'Reference' },
    ],
    fetch: (user, { start, end }) =>
      prisma.payment.findMany({
        where: { ...(user.role === 'ADMIN' ? {} : { OR: [{ payerId: user.id }, { payeeId: user.id }] }), createdAt: { gte: start, lte: end } },
        include: { payer: { select: { name: true } }, payee: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 50000,
      }),
  },
};

const exportDataset = async (user, query) => {
  const ds = DATASETS[query.dataset];
  if (!ds || !ds.roles.includes(user.role)) throw ApiError.badRequest('This export is not available for your account');
  const rows = await ds.fetch(user, range(query));
  return { rows, columns: ds.columns };
};

module.exports = { summary, exportDataset, DATASETS, range };
