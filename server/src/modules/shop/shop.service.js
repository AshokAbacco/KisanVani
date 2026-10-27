const prisma = require('../../config/prisma');
const { money } = require('../../utils/money');

const startOfToday = () => {
  // Day boundaries follow Indian Standard Time, which is where KisanVani shops operate.
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 330 * 60_000);
};

const dashboard = async (shopId) => {
  const today = startOfToday();
  const monthStart = new Date(today);
  monthStart.setUTCDate(1);

  const [todaySales, monthSales, lowStock, stockItems, pendingOrders, credit, recentInvoices, daily, topProducts, byMode] = await Promise.all([
    prisma.salesInvoice.aggregate({ where: { shopId, status: 'COMPLETED', createdAt: { gte: today } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.salesInvoice.aggregate({ where: { shopId, status: 'COMPLETED', createdAt: { gte: monthStart } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM inventory_items WHERE "shopId" = ${shopId} AND "isActive" = true AND "quantityKg" <= "lowStockThresholdKg"`,
    prisma.inventoryItem.count({ where: { shopId, isActive: true } }),
    prisma.order.count({ where: { buyerId: shopId, status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'] } } }),
    prisma.customer.aggregate({ where: { shopId, creditBalance: { gt: 0 } }, _sum: { creditBalance: true }, _count: { _all: true } }),
    prisma.salesInvoice.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, invoiceNumber: true, customerName: true, total: true, paymentMode: true, status: true, createdAt: true },
    }),
    prisma.$queryRaw`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day, COUNT(*)::int AS bills, COALESCE(SUM(total), 0) AS amount
                     FROM sales_invoices WHERE "shopId" = ${shopId} AND status = 'COMPLETED' AND "createdAt" > NOW() - INTERVAL '7 days'
                     GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw`SELECT i."productName" AS name, SUM(i."quantityKg") AS qty, SUM(i."lineTotal") AS amount
                     FROM sales_invoice_items i JOIN sales_invoices s ON s.id = i."invoiceId"
                     WHERE s."shopId" = ${shopId} AND s.status = 'COMPLETED' AND s."createdAt" > NOW() - INTERVAL '30 days'
                     GROUP BY 1 ORDER BY amount DESC LIMIT 5`,
    prisma.salesInvoice.groupBy({ by: ['paymentMode'], where: { shopId, status: 'COMPLETED', createdAt: { gte: today } }, _sum: { total: true } }),
  ]);

  return {
    cards: {
      todaySales: money(todaySales._sum.total || 0),
      todayBills: todaySales._count._all,
      monthSales: money(monthSales._sum.total || 0),
      monthBills: monthSales._count._all,
      stockItems,
      lowStockItems: lowStock[0].n,
      pendingOrders,
      creditOutstanding: money(credit._sum.creditBalance || 0),
      creditCustomers: credit._count._all,
    },
    recentInvoices,
    dailySales: daily.map((d) => ({ day: d.day, bills: d.bills, amount: money(d.amount) })),
    topProducts: topProducts.map((p) => ({ name: p.name, qty: p.qty, amount: money(p.amount) })),
    todayByMode: byMode.map((m) => ({ mode: m.paymentMode, amount: money(m._sum.total || 0) })),
  };
};

module.exports = { dashboard, startOfToday };
