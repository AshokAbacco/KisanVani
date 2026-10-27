const ApiError = require('../../utils/ApiError');
const { D, qty, money } = require('../../utils/money');

/**
 * Applies a signed quantity change to an inventory item inside a transaction and writes the ledger entry.
 * Deductions use a conditional UPDATE (quantity >= amount) so concurrent sales can never drive stock negative.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
const applyStockChange = async (tx, { inventoryItemId, change, type, referenceType, referenceId, note, userId }) => {
  const delta = qty(change);
  if (delta.isZero()) throw ApiError.badRequest('Quantity change cannot be zero');

  if (delta.isNegative()) {
    const needed = delta.abs();
    const res = await tx.inventoryItem.updateMany({
      where: { id: inventoryItemId, quantityKg: { gte: needed } },
      data: { quantityKg: { decrement: needed } },
    });
    if (res.count !== 1) {
      const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId }, include: { product: { select: { name: true } } } });
      throw ApiError.conflict(
        `Not enough stock for ${item?.product?.name || 'item'}: available ${item ? qty(item.quantityKg).toString() : 0} kg, required ${needed.toString()} kg`,
        { code: 'INSUFFICIENT_STOCK', inventoryItemId }
      );
    }
  } else {
    await tx.inventoryItem.update({ where: { id: inventoryItemId }, data: { quantityKg: { increment: delta } } });
  }

  const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId }, select: { quantityKg: true } });
  await tx.inventoryTransaction.create({
    data: {
      inventoryItemId,
      type,
      quantityChangeKg: delta,
      balanceAfterKg: item.quantityKg,
      referenceType,
      referenceId,
      note,
      createdById: userId,
    },
  });
  return item.quantityKg;
};

/**
 * Finds (or creates) a shop's stock-master row for a product. New rows start at the purchase cost as their
 * selling price so the shop can review rates in the Stock & Rates Master before selling.
 */
const ensureItem = async (tx, shopId, productId, unitCost) => {
  const existing = await tx.inventoryItem.findUnique({ where: { shopId_productId: { shopId, productId } } });
  if (existing) {
    if (unitCost !== undefined && unitCost !== null) {
      await tx.inventoryItem.update({ where: { id: existing.id }, data: { costPricePerKg: money(unitCost) } });
    }
    return existing;
  }
  return tx.inventoryItem.create({
    data: { shopId, productId, quantityKg: 0, sellingPricePerKg: money(unitCost ?? 0), costPricePerKg: unitCost != null ? money(unitCost) : null },
  });
};

module.exports = { applyStockChange, ensureItem, D };
