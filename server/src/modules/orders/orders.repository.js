const ApiError = require('../../utils/ApiError');
const { qty } = require('../../utils/money');

/**
 * Reserves quantity on a harvest listing or mandi lot with a single guarded UPDATE.
 * The row is only changed if it is still on sale and has enough quantity, so concurrent
 * buyers can never oversell; the listing flips to SOLD_OUT when it reaches zero.
 */
const reserve = async (tx, item) => {
  const q = qty(item.quantityKg).toString();
  if (item.harvestListingId) {
    const n = await tx.$executeRaw`
      UPDATE harvest_listings
      SET "availableQuantityKg" = "availableQuantityKg" - ${q}::numeric,
          status = CASE WHEN "availableQuantityKg" - ${q}::numeric <= 0 THEN 'SOLD_OUT'::"ListingStatus" ELSE status END,
          "updatedAt" = NOW()
      WHERE id = ${item.harvestListingId} AND status = 'ACTIVE' AND "availableQuantityKg" >= ${q}::numeric`;
    if (n !== 1) throw ApiError.conflict(`Only part of ${item.itemName} is still available — please refresh and try again`, { code: 'INSUFFICIENT_QUANTITY' });
  } else {
    const n = await tx.$executeRaw`
      UPDATE mandi_lots
      SET "availableWeightKg" = "availableWeightKg" - ${q}::numeric,
          status = CASE WHEN "availableWeightKg" - ${q}::numeric <= 0 THEN 'SOLD_OUT'::"LotStatus" ELSE status END,
          "updatedAt" = NOW()
      WHERE id = ${item.mandiLotId} AND status = 'AVAILABLE' AND "availableWeightKg" >= ${q}::numeric`;
    if (n !== 1) throw ApiError.conflict(`Only part of ${item.itemName} is still available — please refresh and try again`, { code: 'INSUFFICIENT_QUANTITY' });
  }
};

/** Returns reserved quantity to the source when an order is rejected or cancelled. */
const release = async (tx, item) => {
  const q = qty(item.quantityKg).toString();
  if (item.harvestListingId) {
    await tx.$executeRaw`
      UPDATE harvest_listings
      SET "availableQuantityKg" = LEAST("availableQuantityKg" + ${q}::numeric, "totalQuantityKg"),
          status = CASE WHEN status = 'SOLD_OUT' THEN 'ACTIVE'::"ListingStatus" ELSE status END,
          "updatedAt" = NOW()
      WHERE id = ${item.harvestListingId}`;
  } else if (item.mandiLotId) {
    await tx.$executeRaw`
      UPDATE mandi_lots
      SET "availableWeightKg" = LEAST("availableWeightKg" + ${q}::numeric, "totalWeightKg"),
          status = CASE WHEN status = 'SOLD_OUT' THEN 'AVAILABLE'::"LotStatus" ELSE status END,
          "updatedAt" = NOW()
      WHERE id = ${item.mandiLotId}`;
  }
};

const ORDER_DETAIL_INCLUDE = {
  buyer: { select: { id: true, name: true, mobile: true, role: true, shopProfile: { select: { shopName: true } }, mandiProfile: { select: { mandiName: true } } } },
  seller: { select: { id: true, name: true, mobile: true, role: true, farmerProfile: { select: { farmName: true } }, mandiProfile: { select: { mandiName: true, marketYardName: true } } } },
  items: {
    include: {
      product: { select: { emoji: true } },
      harvestListing: { select: { id: true, village: true, district: true, latitude: true, longitude: true } },
      mandiLot: { select: { id: true, lotCode: true, marketYardName: true, location: true, loadingInfo: true, latitude: true, longitude: true } },
    },
  },
  history: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { name: true, role: true } } } },
  settlement: true,
  payments: { orderBy: { createdAt: 'desc' }, select: { id: true, paymentNumber: true, amount: true, mode: true, status: true, reference: true, createdAt: true } },
  transportRequests: { select: { id: true, requestNumber: true, status: true, createdAt: true } },
  trips: {
    select: {
      id: true,
      tripNumber: true,
      status: true,
      trackingActive: true,
      lastLocationAt: true,
      driver: { select: { name: true, mobile: true } },
      vehicle: { select: { registrationNumber: true, type: true } },
    },
  },
};

module.exports = { reserve, release, ORDER_DETAIL_INCLUDE };
