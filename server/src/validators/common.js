const { z } = require('zod');

const idParam = z.object({ id: z.string().uuid('Invalid id') });

const mobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^\+91/, '').replace(/^0/, ''))
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');

const email = z.string().trim().toLowerCase().email('Enter a valid e-mail address');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

/** Positive decimal accepted as number or string, kept as a string for exact Decimal arithmetic. */
const decimalString = (opts = {}) => {
  const { min = 0, allowZero = false, max, places = 3 } = opts;
  return z
    .union([z.number(), z.string().trim()])
    .transform((v) => String(v))
    .refine((v) => /^\d+(\.\d+)?$/.test(v), 'Must be a valid number')
    .refine((v) => (v.split('.')[1] || '').length <= places, `At most ${places} decimal places`)
    .refine((v) => (allowZero ? Number(v) >= min : Number(v) > min), allowZero ? `Must be at least ${min}` : `Must be greater than ${min}`)
    .refine((v) => max === undefined || Number(v) <= max, `Must be at most ${max}`);
};

const quantity = (opts) => decimalString({ places: 3, ...opts });
const amount = (opts) => decimalString({ places: 2, ...opts });

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v));

/**
 * Optional date. '' and null mean "no date" — they must be mapped before coercion,
 * because z.coerce.date() would turn null into 1 Jan 1970.
 */
const optionalDate = z
  .preprocess((v) => (v === '' || v === null ? null : v), z.coerce.date({ invalid_type_error: 'Enter a valid date' }).nullable())
  .optional();

const reasonBody = z.object({ reason: z.string().trim().min(3, 'Please give a reason').max(500) });

const addressSchema = z
  .object({
    line1: optionalText(200),
    village: optionalText(100),
    city: optionalText(100),
    district: optionalText(100),
    state: optionalText(100),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Pincode must be 6 digits')
      .optional()
      .nullable()
      .or(z.literal('').transform(() => null)),
    latitude: latitude.optional().nullable(),
    longitude: longitude.optional().nullable(),
  })
  .partial();

module.exports = {
  z,
  idParam,
  mobile,
  email,
  password,
  decimalString,
  quantity,
  amount,
  latitude,
  longitude,
  optionalText,
  optionalDate,
  reasonBody,
  addressSchema,
};
