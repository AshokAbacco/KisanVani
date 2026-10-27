const { z, idParam, quantity, amount, optionalText, latitude, longitude } = require('../../validators/common');

const listingBase = {
  productId: z.string().uuid('Choose a crop from the catalogue'),
  variety: optionalText(60),
  grade: optionalText(30),
  description: optionalText(1000),
  harvestAt: z.coerce.date({ invalid_type_error: 'Enter the harvest date' }),
  totalQuantityKg: quantity({ max: 1000000 }),
  pricePerKg: amount({ max: 100000 }),
  minOrderKg: quantity(),
  village: optionalText(80),
  district: optionalText(80),
  latitude: latitude.optional().nullable(),
  longitude: longitude.optional().nullable(),
  freshnessNotes: optionalText(300),
};

const createListing = z
  .object({ ...listingBase, publish: z.boolean().default(false) })
  .refine((v) => Number(v.minOrderKg) <= Number(v.totalQuantityKg), { path: ['minOrderKg'], message: 'Minimum order cannot exceed the total quantity' })
  .refine((v) => v.harvestAt <= new Date(Date.now() + 60 * 86_400_000), { path: ['harvestAt'], message: 'Harvest date is too far in the future' });

const updateListing = z.object(listingBase).partial().omit({ productId: true });

const listingStatus = z.object({ status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']) });

const listingQuery = z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'COMPLETED']).optional() }).passthrough();

const removeImage = z.object({ url: z.string().url() });

module.exports = { createListing, updateListing, listingStatus, listingQuery, removeImage, idParam };
