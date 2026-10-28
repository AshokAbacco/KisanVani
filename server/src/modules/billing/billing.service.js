const { Prisma } = require('@prisma/client');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const settings = require('../../services/settings.service');
const { D, money, qty, sum } = require('../../utils/money');
const { paginate, pageMeta, dateRange } = require('../../utils/pagination');
const { nextInvoiceNumber, nextDocumentNumber } = require('../../utils/numbering');
const { applyStockChange } = require('../inventory/inventory.repository');

const INVOICE_INCLUDE = {
  items: { include: { product: { select: { emoji: true, category: { select: { type: true } } } } } },
  customer: { select: { id: true, name: true, mobile: true, creditBalance: true } },
  payments: { select: { id: true, paymentNumber: true, amount: true, mode: true, status: true, createdAt: true } },
};

const shopFor = async (userId) => {
  const shop = await prisma.shopProfile.findUnique({ where: { userId }, include: { address: true } });
  if (!shop) throw ApiError.badRequest('Shop profile is missing');
  return shop;
};

/** Pure bill calculation — prices always come from the server-side stock master, never from the client. */
const calculate = (lines, discount) => {
  const computed = lines.map((l) => ({ ...l, lineTotal: money(qty(l.quantityKg).times(l.unitPrice)) }));
  const subtotal = money(sum(computed.map((l) => l.lineTotal)));
  const disc = money(discount);
  const total = money(subtotal.minus(disc));
  return { lines: computed, subtotal, discount: disc, total };
};

const findByKey = (shopId, idempotencyKey) =>
  prisma.salesInvoice.findUnique({ where: { shopId_idempotencyKey: { shopId, idempotencyKey } }, include: INVOICE_INCLUDE });

const createInvoice = async (user, input) => {
  const existing = await findByKey(user.id, input.idempotencyKey);
  if (existing) return { invoice: existing, duplicate: true };

  const shop = await shopFor(user.id);

  // Merge repeated lines for the same item so stock is checked against the combined quantity.
  const merged = new Map();
  for (const it of input.items) merged.set(it.inventoryItemId, qty(merged.get(it.inventoryItemId) || 0).plus(it.quantityKg));

  const stock = await prisma.inventoryItem.findMany({
    where: { id: { in: [...merged.keys()] }, shopId: user.id, isActive: true },
    include: { product: { select: { id: true, name: true } } },
  });
  if (stock.length !== merged.size) throw ApiError.badRequest('One or more items are not available in your stock master');

  const lines = stock.map((s) => ({
    inventoryItemId: s.id,
    productId: s.productId,
    productName: s.product.name,
    quantityKg: qty(merged.get(s.id)),
    unitPrice: money(s.sellingPricePerKg),
  }));
  const bill = calculate(lines, input.discount);

  const maxDiscountPct = D((await settings.get('billing.maxDiscountPercent')) ?? 0);
  if (bill.discount.gt(money(bill.subtotal.times(maxDiscountPct).div(100)))) {
    throw ApiError.unprocessable(`Discount cannot exceed ${maxDiscountPct.toString()}% of the bill`);
  }
  if (bill.total.lte(0)) throw ApiError.unprocessable('Bill total must be greater than zero');

  let amountPaid = bill.total;
  let creditAmount = D(0);
  if (input.paymentMode === 'CREDIT') {
    amountPaid = money(input.amountPaid ?? 0);
    if (amountPaid.gt(bill.total)) throw ApiError.unprocessable('Amount paid cannot exceed the bill total');
    creditAmount = money(bill.total.minus(amountPaid));
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      let customer = null;
      if (input.customerMobile) {
        customer = await tx.customer.upsert({
          where: { shopId_mobile: { shopId: user.id, mobile: input.customerMobile } },
          create: { shopId: user.id, mobile: input.customerMobile, name: input.customerName || 'Walk-in customer' },
          update: input.customerName ? { name: input.customerName } : {},
        });
      }

      if (creditAmount.gt(0)) {
        // Conditional increment: fails if the new balance would exceed the customer's credit limit.
        const updated = await tx.$executeRaw`
          UPDATE customers SET "creditBalance" = "creditBalance" + ${creditAmount.toString()}::numeric, "updatedAt" = NOW()
          WHERE id = ${customer.id} AND "creditBalance" + ${creditAmount.toString()}::numeric <= "creditLimit"`;
        if (updated !== 1) {
          const c = await tx.customer.findUnique({ where: { id: customer.id } });
          throw ApiError.unprocessable(
            `Credit limit exceeded for ${c.name}: outstanding ₹${c.creditBalance}, limit ₹${c.creditLimit}, this bill adds ₹${creditAmount}`
          );
        }
      }

      const invoiceNumber = await nextInvoiceNumber(shop.shopCode, tx);
      const created = await tx.salesInvoice.create({
        data: {
          invoiceNumber,
          shopId: user.id,
          customerId: customer?.id,
          customerName: input.customerName || customer?.name || null,
          customerMobile: input.customerMobile || null,
          subtotal: bill.subtotal,
          discount: bill.discount,
          total: bill.total,
          paymentMode: input.paymentMode,
          amountPaid,
          creditAmount,
          idempotencyKey: input.idempotencyKey,
          items: {
            create: bill.lines.map((l) => ({
              inventoryItemId: l.inventoryItemId,
              productId: l.productId,
              productName: l.productName,
              quantityKg: l.quantityKg,
              unitPrice: l.unitPrice,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      for (const l of bill.lines) {
        await applyStockChange(tx, {
          inventoryItemId: l.inventoryItemId,
          change: l.quantityKg.negated(),
          type: 'SALE',
          referenceType: 'SalesInvoice',
          referenceId: created.id,
          userId: user.id,
        });
      }

      if (amountPaid.gt(0)) {
        await tx.payment.create({
          data: {
            paymentNumber: await nextDocumentNumber('PAY', tx),
            purpose: 'SALE_INVOICE',
            amount: amountPaid,
            mode: input.paymentMode === 'CREDIT' ? 'CASH' : input.paymentMode,
            reference: input.paymentReference,
            payeeId: user.id,
            recordedById: user.id,
            invoiceId: created.id,
            customerId: customer?.id,
          },
        });
      }
      return created;
    });
    return { invoice: await getInvoice(user, invoice.id), duplicate: false };
  } catch (err) {
    // Two identical submissions racing: the unique (shopId, idempotencyKey) index lets only one through.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const dup = await findByKey(user.id, input.idempotencyKey);
      if (dup) return { invoice: dup, duplicate: true };
    }
    throw err;
  }
};

const getInvoice = async (user, id) => {
  const where = user.role === 'ADMIN' ? { id } : { id, shopId: user.id };
  const invoice = await prisma.salesInvoice.findFirst({
    where,
    include: { ...INVOICE_INCLUDE, shop: { select: { name: true, mobile: true, shopProfile: { include: { address: true } } } } },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return invoice;
};

const listInvoices = async (user, query) => {
  const { q, skip, take, orderBy } = paginate(query, ['createdAt', 'total', 'invoiceNumber'], 'createdAt');
  const where = {
    ...(user.role === 'ADMIN' ? {} : { shopId: user.id }),
    ...(query.paymentMode ? { paymentMode: query.paymentMode } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...dateRange(q),
    ...(q.search
      ? {
          OR: [
            { invoiceNumber: { contains: q.search, mode: 'insensitive' } },
            { customerName: { contains: q.search, mode: 'insensitive' } },
            { customerMobile: { contains: q.search } },
          ],
        }
      : {}),
  };
  const [items, total, totals] = await prisma.$transaction([
    prisma.salesInvoice.findMany({ where, skip, take, orderBy, include: { _count: { select: { items: true } } } }),
    prisma.salesInvoice.count({ where }),
    prisma.salesInvoice.aggregate({ where: { ...where, status: 'COMPLETED' }, _sum: { total: true } }),
  ]);
  return { items, meta: { ...pageMeta(q, total), totalValue: totals._sum.total || '0' } };
};

/** Records a reprint and returns the full invoice for the thermal printer layout. */
const printInvoice = async (user, id) => {
  const inv = await getInvoice(user, id);
  if (user.role !== 'SHOPKEEPER' || inv.shopId !== user.id) throw ApiError.forbidden('Only the issuing shop can print this invoice');
  await prisma.salesInvoice.update({ where: { id }, data: { printCount: { increment: 1 } } });
  return { ...inv, printCount: inv.printCount + 1, isDuplicateCopy: inv.printCount > 0 };
};

/** Cancels a bill: restores stock, reverses any credit and marks recorded payments refunded. */
const cancelInvoice = async (user, id, reason) => {
  const inv = await getInvoice(user, id);
  if (inv.status !== 'COMPLETED') throw ApiError.conflict('Invoice is already cancelled');

  await prisma.$transaction(async (tx) => {
    const res = await tx.salesInvoice.updateMany({
      where: { id, status: 'COMPLETED' },
      data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date() },
    });
    if (res.count !== 1) throw ApiError.conflict('Invoice is already cancelled');

    for (const item of inv.items) {
      await applyStockChange(tx, {
        inventoryItemId: item.inventoryItemId,
        change: item.quantityKg,
        type: 'SALE_CANCELLED',
        referenceType: 'SalesInvoice',
        referenceId: id,
        note: reason,
        userId: user.id,
      });
    }
    if (inv.customerId && D(inv.creditAmount).gt(0)) {
      await tx.$executeRaw`
        UPDATE customers SET "creditBalance" = GREATEST("creditBalance" - ${D(inv.creditAmount).toString()}::numeric, 0), "updatedAt" = NOW()
        WHERE id = ${inv.customerId}`;
    }
    await tx.payment.updateMany({ where: { invoiceId: id, status: 'COMPLETED' }, data: { status: 'REFUNDED' } });
  });
  return getInvoice(user, id);
};

const posConfig = async (user) => {
  const shop = await shopFor(user.id);
  return {
    shop,
    maxDiscountPercent: await settings.get('billing.maxDiscountPercent'),
    weighingScale: await settings.get('billing.weighingScale'),
  };
};

module.exports = { calculate, createInvoice, getInvoice, listInvoices, printInvoice, cancelInvoice, posConfig };
