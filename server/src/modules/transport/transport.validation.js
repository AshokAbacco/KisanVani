const { z, idParam, quantity, amount, optionalText, optionalDate, latitude, longitude, mobile, reasonBody } = require('../../validators/common');
const { VEHICLE_TYPES } = require('../vehicle/vehicle.validation');

const createRequest = z.object({
  orderId: z.string().uuid().optional().nullable(),
  commodity: z.string().trim().min(2).max(200),
  expectedQuantityKg: quantity({ max: 60000 }),
  pickupAddress: z.string().trim().min(3).max(300),
  pickupLat: latitude.optional().nullable(),
  pickupLng: longitude.optional().nullable(),
  pickupContactName: z.string().trim().min(2).max(100),
  pickupContactPhone: mobile,
  dropAddress: z.string().trim().min(3).max(300),
  dropLat: latitude.optional().nullable(),
  dropLng: longitude.optional().nullable(),
  dropContactName: optionalText(100),
  dropContactPhone: mobile.optional().nullable().or(z.literal('').transform(() => null)),
  preferredVehicleType: z.enum(VEHICLE_TYPES).optional().nullable(),
  preferredPickupAt: optionalDate,
  offeredCharge: amount({ allowZero: true }).optional().nullable(),
  notes: optionalText(500),
});

const requestQuery = z
  .object({ open: z.enum(['true', 'false']).optional(), status: z.enum(['OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED']).optional() })
  .passthrough();

const assignTrip = z.object({
  transportRequestId: z.string().uuid(),
  driverId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  transportCharge: amount({ allowZero: true }),
  estimatedArrivalAt: optionalDate,
});

const claimRequest = z.object({
  vehicleId: z.string().uuid(),
  transportCharge: amount({ allowZero: true }).optional(),
});

const tripTransition = z
  .object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED']),
    reason: optionalText(500),
    loadedQuantityKg: quantity().optional(),
    deliveredQuantityKg: quantity({ allowZero: true }).optional(),
    estimatedArrivalAt: optionalDate,
  })
  .superRefine((v, ctx) => {
    if (['REJECTED', 'CANCELLED', 'FAILED'].includes(v.status) && (!v.reason || v.reason.length < 3)) ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Please give a reason' });
    if (v.status === 'PICKED_UP' && !v.loadedQuantityKg) ctx.addIssue({ code: 'custom', path: ['loadedQuantityKg'], message: 'Enter the loaded quantity' });
    if (v.status === 'DELIVERED' && v.deliveredQuantityKg === undefined) ctx.addIssue({ code: 'custom', path: ['deliveredQuantityKg'], message: 'Enter the delivered quantity' });
  });

const proofBody = z.object({
  receiverName: z.string().trim().min(2).max(100),
  receiverMobile: mobile.optional().nullable().or(z.literal('').transform(() => null)),
  deliveredQuantityKg: quantity({ allowZero: true }),
  notes: optionalText(300),
});

const tripQuery = z.object({ status: z.string().max(120).optional(), driverId: z.string().uuid().optional() }).passthrough();

module.exports = { createRequest, requestQuery, assignTrip, claimRequest, tripTransition, proofBody, tripQuery, idParam, reasonBody };
