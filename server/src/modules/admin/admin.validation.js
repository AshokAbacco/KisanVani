const { z, idParam, mobile, email, password, optionalText } = require('../../validators/common');
const { register } = require('../auth/auth.validation');

const createUser = z.union([
  register,
  z.object({
    role: z.literal('ADMIN'),
    name: z.string().trim().min(2).max(100),
    mobile,
    email,
    password,
  }),
]);

const updateUser = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: email.optional().nullable().or(z.literal('').transform(() => null)),
  mobile: mobile.optional(),
});

const setStatus = z
  .object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
    reason: optionalText(300),
  })
  .refine((v) => v.status === 'ACTIVE' || (v.reason && v.reason.length >= 3), { path: ['reason'], message: 'Give a reason' });

const userQuery = z
  .object({
    role: z.enum(['ADMIN', 'SHOPKEEPER', 'FARMER', 'MANDI_OWNER', 'DRIVER']).optional(),
    status: z.enum(['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
  })
  .passthrough();

module.exports = { createUser, updateUser, setStatus, userQuery, idParam };
