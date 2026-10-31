const { z, mobile, email, password, optionalText, addressSchema, optionalDate } = require('../../validators/common');
const { ROLES, SELF_REGISTER_ROLES } = require('../../constants');

const baseRegister = {
  name: z.string().trim().min(2, 'Name is required').max(100),
  mobile,
  email: email.optional().nullable().or(z.literal('').transform(() => null)),
  password,
  preferredLanguage: z.enum(['en', 'hi', 'kn', 'te', 'ta', 'ml', 'mr']).default('en'),
  address: addressSchema.optional(),
};

const register = z.discriminatedUnion('role', [
  z.object({
    ...baseRegister,
    role: z.literal(ROLES.SHOPKEEPER),
    shopName: z.string().trim().min(2, 'Shop name is required').max(120),
    gstin: optionalText(20),
  }),
  z.object({
    ...baseRegister,
    role: z.literal(ROLES.FARMER),
    farmName: optionalText(120),
    primaryCrops: z.array(z.string().trim().max(50)).max(20).default([]),
  }),
  z.object({
    ...baseRegister,
    role: z.literal(ROLES.MANDI_OWNER),
    mandiName: z.string().trim().min(2, 'Mandi name is required').max(120),
    marketYardName: optionalText(120),
    licenseNumber: optionalText(60),
  }),
  z.object({
    ...baseRegister,
    role: z.literal(ROLES.DRIVER),
    licenseNumber: z.string().trim().min(5, 'Driving licence number is required').max(30),
    licenseExpiry: optionalDate,
    experienceYrs: z.coerce.number().int().min(0).max(60).optional(),
  }),
]);

const login = z.object({
  identifier: z.string().trim().min(3, 'Enter your e-mail or mobile number').max(120),
  password: z.string().min(1, 'Password is required').max(72),
  // No role: it is read from the account. A `role` sent by an older client is ignored (stripped).
});

const forgotPassword = z.object({ identifier: z.string().trim().min(3).max(120) });

const verifyOtp = z.object({
  identifier: z.string().trim().min(3).max(120),
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

const resetPassword = z.object({
  token: z.string().min(20).max(200),
  password,
});

const changePassword = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: password,
});

const updateProfile = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: email.optional().nullable().or(z.literal('').transform(() => null)),
  preferredLanguage: z.enum(['en', 'hi', 'kn', 'te', 'ta', 'ml', 'mr']).optional(),
  address: addressSchema.optional(),
  profile: z
    .object({
      // shop
      shopName: z.string().trim().min(2).max(120).optional(),
      gstin: optionalText(20),
      receiptFooter: optionalText(200),
      // farmer
      farmName: optionalText(120),
      landAcres: z.coerce.number().min(0).max(100000).optional().nullable(),
      primaryCrops: z.array(z.string().trim().max(50)).max(20).optional(),
      ifsc: optionalText(15),
      bankAccount: optionalText(30),
      // mandi
      mandiName: z.string().trim().min(2).max(120).optional(),
      marketYardName: optionalText(120),
      licenseNumber: z.string().trim().max(60).optional(),
      // driver
      licenseExpiry: optionalDate,
      experienceYrs: z.coerce.number().int().min(0).max(60).optional(),
      isAvailable: z.boolean().optional(),
      // shared
      upiId: optionalText(60),
    })
    .partial()
    .optional(),
});

module.exports = { register, login, forgotPassword, verifyOtp, resetPassword, changePassword, updateProfile, SELF_REGISTER_ROLES };