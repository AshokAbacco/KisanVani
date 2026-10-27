const { z, idParam, quantity, optionalText, optionalDate, mobile } = require('../../validators/common');

const VEHICLE_TYPES = ['TRACTOR', 'MINI_TRUCK', 'TEMPO', 'PICKUP', 'TRUCK', 'OTHER'];

// Indian registration plates, e.g. KA01AB1234, KA 01 AB 1234, 22BH1234AA (BH series)
const registrationNumber = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase().replace(/[\s-]/g, ''))
  .refine((v) => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(v) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(v), 'Enter a valid vehicle registration number');

const create = z.object({
  registrationNumber,
  type: z.enum(VEHICLE_TYPES),
  make: optionalText(60),
  model: optionalText(60),
  capacityKg: quantity({ max: 60000 }),
  ownerName: z.string().trim().min(2).max(100),
  ownerMobile: mobile.optional().nullable().or(z.literal('').transform(() => null)),
  insurancePolicyNo: optionalText(60),
  insuranceExpiry: optionalDate,
  fitnessExpiry: optionalDate,
  permitNumber: optionalText(60),
  permitExpiry: optionalDate,
});

const update = create.partial().extend({ isActive: z.boolean().optional() });

const documentBody = z.object({
  type: z.enum(['REGISTRATION', 'INSURANCE', 'FITNESS', 'PERMIT', 'POLLUTION', 'OTHER']),
  documentNumber: optionalText(60),
  expiryDate: optionalDate,
});

const verify = z.object({ status: z.enum(['VERIFIED', 'REJECTED']), note: optionalText(300) }).refine((v) => v.status === 'VERIFIED' || (v.note && v.note.length >= 3), { path: ['note'], message: 'Give a reason for rejection' });

const docParams = z.object({ id: z.string().uuid(), docId: z.string().uuid() });

const listQuery = z
  .object({ verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(), type: z.enum(VEHICLE_TYPES).optional(), driverId: z.string().uuid().optional() })
  .passthrough();

module.exports = { create, update, documentBody, verify, docParams, listQuery, idParam, VEHICLE_TYPES };
