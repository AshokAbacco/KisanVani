const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const prisma = require('../../config/prisma');
const config = require('../../config');
const ApiError = require('../../utils/ApiError');
const { randomToken, sha256, hmac, numericCode, safeEqual } = require('../../utils/crypto');

const refreshHash = (token) => hmac(config.jwt.refreshSecret, token);
const { ROLE_LABELS } = require('../../constants');
const settings = require('../../services/settings.service');
const email = require('../../services/email.service');
const { notifyMany } = require('../../services/notification.service');
const repo = require('./auth.repository');

const RESET_TTL_MS = 15 * 60_000;
const MAX_OTP_ATTEMPTS = 5;
// Used to keep login timing similar whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', 10);

const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
    issuer: 'kisanvani',
    audience: 'kisanvani-app',
  });

const issueRefreshToken = async (userId, meta = {}, family = crypto.randomUUID(), client = prisma) => {
  const token = randomToken(48);
  const record = await client.refreshToken.create({
    data: {
      userId,
      family,
      tokenHash: refreshHash(token),
      expiresAt: new Date(Date.now() + config.jwt.refreshTtlDays * 86_400_000),
      userAgent: meta.userAgent?.slice(0, 250),
      ipAddress: meta.ip,
    },
  });
  return { token, record };
};

const buildSession = async (user, meta) => {
  const { token: refreshToken } = await issueRefreshToken(user.id, meta);
  const profileUser = await repo.findWithProfile(user.id);
  return { accessToken: signAccessToken(user), refreshToken, user: profileUser };
};

const shopCodeFor = () => `S${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/**
 * Creates a user with the role-specific profile in one transaction.
 * Used by self-registration and by admins creating accounts.
 */
const createUserWithProfile = async (input, { status }) => {
  const exists = await prisma.user.findFirst({
    where: { OR: [{ mobile: input.mobile }, ...(input.email ? [{ email: input.email }] : [])] },
    select: { mobile: true, email: true },
  });
  if (exists) {
    throw ApiError.conflict(exists.mobile === input.mobile ? 'This mobile number is already registered' : 'This e-mail is already registered');
  }
  const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

  return prisma.$transaction(async (tx) => {
    const hasAddress = input.address && Object.values(input.address).some((v) => v !== null && v !== undefined && v !== '');
    const address = hasAddress ? await tx.address.create({ data: input.address }) : null;
    const addressConnect = address ? { addressId: address.id } : {};

    const profileData = {
      ADMIN: {},
      SHOPKEEPER: { shopProfile: { create: { shopName: input.shopName, gstin: input.gstin, shopCode: shopCodeFor(), ...addressConnect } } },
      FARMER: { farmerProfile: { create: { farmName: input.farmName, primaryCrops: input.primaryCrops || [], ...addressConnect } } },
      MANDI_OWNER: {
        mandiProfile: {
          create: { mandiName: input.mandiName, marketYardName: input.marketYardName, licenseNumber: input.licenseNumber || null, ...addressConnect },
        },
      },
      DRIVER: {
        driverProfile: {
          create: {
            licenseNumber: input.licenseNumber?.toUpperCase(),
            licenseExpiry: input.licenseExpiry || null,
            experienceYrs: input.experienceYrs,
            ...addressConnect,
          },
        },
      },
    }[input.role];

    const created = await tx.user.create({
      data: {
        name: input.name,
        mobile: input.mobile,
        email: input.email || null,
        passwordHash,
        role: input.role,
        status,
        preferredLanguage: input.preferredLanguage || 'en',
        ...profileData,
      },
    });
    return created;
  });
};

const register = async (input, meta) => {
  const approvalRoles = (await settings.get('auth.approvalRequiredRoles')) || [];
  const status = approvalRoles.includes(input.role) ? 'PENDING_APPROVAL' : 'ACTIVE';
  const user = await createUserWithProfile(input, { status, action: 'USER_REGISTERED', ip: meta.ip });

  if (status === 'PENDING_APPROVAL') {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' }, select: { id: true } });
    await notifyMany(
      admins.map((a) => a.id),
      { type: 'USER_APPROVAL', title: 'New account awaiting approval', message: `${user.name} registered as ${ROLE_LABELS[user.role]}`, link: `/admin/users/${user.id}` }
    );
    return { pendingApproval: true, user: { id: user.id, name: user.name, role: user.role, status: user.status } };
  }

  return { pendingApproval: false, ...(await buildSession(user, meta)) };
};

const login = async ({ identifier, password, role }, meta) => {
  const user = await repo.findByIdentifier(identifier);
  const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !valid) throw new ApiError(401, 'Incorrect e-mail/mobile or password', 'INVALID_CREDENTIALS');

  if (user.role !== role) {
    throw new ApiError(403, `This account is registered as ${ROLE_LABELS[user.role]}. Please choose that role to sign in.`, 'ROLE_MISMATCH');
  }
  if (user.status === 'PENDING_APPROVAL') throw new ApiError(403, 'Your account is awaiting admin approval', 'ACCOUNT_PENDING');
  if (user.status === 'SUSPENDED') throw new ApiError(403, 'Your account has been suspended. Contact support.', 'ACCOUNT_SUSPENDED');
  if (user.status === 'DEACTIVATED') throw new ApiError(403, 'Your account has been deactivated', 'ACCOUNT_DEACTIVATED');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return buildSession(user, meta);
};

/** Rotates a refresh token. Re-use of a revoked token revokes the whole token family (theft detection). */
const refresh = async (token, meta) => {
  if (!token) throw new ApiError(401, 'No session', 'NO_REFRESH_TOKEN');
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: refreshHash(token) }, include: { user: true } });
  if (!record) throw new ApiError(401, 'Invalid session', 'INVALID_REFRESH_TOKEN');

  if (record.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { family: record.family, revokedAt: null }, data: { revokedAt: new Date() } });
    throw new ApiError(401, 'Session is no longer valid. Please sign in again.', 'REFRESH_TOKEN_REUSED');
  }
  if (record.expiresAt < new Date()) throw new ApiError(401, 'Session expired', 'REFRESH_TOKEN_EXPIRED');
  if (record.user.status !== 'ACTIVE') throw new ApiError(403, 'Your account is not active', 'ACCOUNT_INACTIVE');

  const next = await prisma.$transaction(async (tx) => {
    const issued = await issueRefreshToken(record.userId, meta, record.family, tx);
    const revoked = await tx.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedBy: issued.record.id },
    });
    // Two concurrent refreshes with the same token: only one may win.
    if (revoked.count !== 1) throw new ApiError(401, 'Session already refreshed', 'REFRESH_CONFLICT');
    return issued;
  });

  return {
    accessToken: signAccessToken(record.user),
    refreshToken: next.token,
    user: await repo.findWithProfile(record.userId),
  };
};

const logout = async (token) => {
  if (!token) return;
  await prisma.refreshToken.updateMany({ where: { tokenHash: refreshHash(token), revokedAt: null }, data: { revokedAt: new Date() } });
};

const logoutAll = async (userId) => {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
};

const forgotPassword = async ({ identifier }, _meta) => {
  const user = await repo.findByIdentifier(identifier);
  // Always respond the same way so the endpoint cannot be used to discover accounts.
  const response = { message: 'If an account exists, a verification code has been sent to the registered e-mail.' };
  if (!user || user.status !== 'ACTIVE') return response;

  const token = randomToken(32);
  const otp = numericCode(6);
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), otpHash: sha256(`${user.id}:${otp}`), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    }),
  ]);

  const resetUrl = `${config.clientUrls[0]}/reset-password?token=${encodeURIComponent(token)}`;
  const delivery = user.email
    ? await email.sendPasswordReset({ to: user.email, name: user.name, resetUrl, otp })
    : config.isProd
      ? 'unavailable'
      : await email.sendPasswordReset({ to: `(mobile ${user.mobile})`, name: user.name, resetUrl, otp });

  if (!config.isProd && delivery === 'logged') response.devNote = 'SMTP is not configured: the code and link were written to the server log.';
  return response;
};

/** Exchanges a valid OTP for a one-time reset token. */
const verifyOtp = async ({ identifier, otp }) => {
  const invalid = new ApiError(400, 'Invalid or expired code', 'INVALID_OTP');
  const user = await repo.findByIdentifier(identifier);
  if (!user) throw invalid;
  const record = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw invalid;
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    throw new ApiError(429, 'Too many incorrect attempts. Request a new code.', 'OTP_LOCKED');
  }
  if (!safeEqual(record.otpHash, sha256(`${user.id}:${otp}`))) {
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw invalid;
  }
  const token = randomToken(32);
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { tokenHash: sha256(token) } });
  return { resetToken: token };
};

const resetPassword = async ({ token, password }, _meta) => {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(400, 'This reset link is invalid or has expired', 'INVALID_RESET_TOKEN');
  }
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  await prisma.$transaction(async (tx) => {
    const used = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (used.count !== 1) throw new ApiError(400, 'This reset link has already been used', 'INVALID_RESET_TOKEN');
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash, passwordChangedAt: new Date() } });
    await tx.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  });
  return { message: 'Password updated. Please sign in with your new password.' };
};

const changePassword = async (userId, { currentPassword, newPassword }, meta) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(400, 'Current password is incorrect', 'INVALID_PASSWORD');
  }
  const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  const { token } = await issueRefreshToken(userId, meta);
  return { accessToken: signAccessToken(user), refreshToken: token };
};

const PROFILE_FIELDS = {
  SHOPKEEPER: ['shopName', 'gstin', 'receiptFooter', 'upiId'],
  FARMER: ['farmName', 'landAcres', 'primaryCrops', 'upiId', 'bankAccount', 'ifsc'],
  MANDI_OWNER: ['mandiName', 'marketYardName', 'licenseNumber', 'upiId'],
  DRIVER: ['licenseExpiry', 'experienceYrs', 'isAvailable'],
  ADMIN: [],
};

const updateProfile = async (user, input) => {
  if (input.email) {
    const taken = await prisma.user.findFirst({ where: { email: input.email, NOT: { id: user.id } }, select: { id: true } });
    if (taken) throw ApiError.conflict('This e-mail is already used by another account');
  }

  await prisma.$transaction(async (tx) => {
    const userData = {};
    for (const k of ['name', 'email', 'preferredLanguage']) if (input[k] !== undefined) userData[k] = input[k];
    if (Object.keys(userData).length) await tx.user.update({ where: { id: user.id }, data: userData });

    const key = repo.profileKey(user.role);
    if (!key) return;
    const modelName = key; // prisma delegate names match the relation names (shopProfile, farmerProfile…)
    const profile = await tx[modelName].findUnique({ where: { userId: user.id } });
    if (!profile) return;

    const data = {};
    for (const f of PROFILE_FIELDS[user.role]) if (input.profile && input.profile[f] !== undefined) data[f] = input.profile[f];

    if (input.address) {
      if (profile.addressId) await tx.address.update({ where: { id: profile.addressId }, data: input.address });
      else data.addressId = (await tx.address.create({ data: input.address })).id;
    }
    if (Object.keys(data).length) await tx[modelName].update({ where: { userId: user.id }, data });
  });

  return repo.findWithProfile(user.id);
};

const setAvatar = async (userId, url) => {
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } });
  return repo.findWithProfile(userId);
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  updateProfile,
  setAvatar,
  signAccessToken,
  createUserWithProfile,
  me: repo.findWithProfile,
};
