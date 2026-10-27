const { z, idParam, quantity, amount, optionalText, latitude, longitude } = require('../../validators/common');

const lotBase = {
  productId: z.string().uuid('Choose a commodity from the catalogue'),
  variety: optionalText(60),
  grade: optionalText(30),
  lotType: z.enum(['LOOSE', 'BAGGED', 'CRATED', 'BOXED']).default('LOOSE'),
  unitSizeKg: quantity().optional().nullable(),
  totalWeightKg: quantity({ max: 10000000 }),
  pricePerKg: amount({ max: 100000 }),
  minOrderKg: quantity(),
  marketYardName: z.string().trim().min(2, 'Market yard name is required').max(120),
  location: optionalText(200),
  district: optionalText(80),
  latitude: latitude.optional().nullable(),
  longitude: longitude.optional().nullable(),
  qualityNotes: optionalText(500),
  loadingInfo: optionalText(300),
};

const createLot = z
  .object({ ...lotBase, publish: z.boolean().default(false) })
  .refine((v) => Number(v.minOrderKg) <= Number(v.totalWeightKg), { path: ['minOrderKg'], message: 'Minimum order cannot exceed the total weight' })
  .refine((v) => v.lotType === 'LOOSE' || v.unitSizeKg, { path: ['unitSizeKg'], message: 'Enter the bag/crate size' });

const updateLot = z.object(lotBase).partial().omit({ productId: true });

const lotStatus = z.object({ status: z.enum(['AVAILABLE', 'PAUSED', 'CLOSED']) });

const lotQuery = z.object({ status: z.enum(['DRAFT', 'AVAILABLE', 'PAUSED', 'SOLD_OUT', 'CLOSED']).optional() }).passthrough();

const removeImage = z.object({ url: z.string().url() });

const commission = z.object({ commissionPercent: z.coerce.number().min(0).max(15) });

module.exports = { createLot, updateLot, lotStatus, lotQuery, removeImage, commission, idParam };
