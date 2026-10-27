const prisma = require('../../config/prisma');

const PROFILE_INCLUDE = {
  farmerProfile: { include: { address: true } },
  shopProfile: { include: { address: true } },
  mandiProfile: { include: { address: true } },
  driverProfile: { include: { address: true } },
};

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  role: true,
  status: true,
  preferredLanguage: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
};

const findByIdentifier = (identifier) => {
  const value = identifier.trim();
  if (value.includes('@')) return prisma.user.findUnique({ where: { email: value.toLowerCase() } });
  const mobile = value.replace(/[\s-]/g, '').replace(/^\+91/, '').replace(/^0/, '');
  return prisma.user.findUnique({ where: { mobile } });
};

const findWithProfile = (id) =>
  prisma.user.findUnique({ where: { id }, select: { ...SAFE_USER_SELECT, ...PROFILE_INCLUDE } });

/** Returns the role-specific profile relation name for a role. */
const profileKey = (role) =>
  ({ FARMER: 'farmerProfile', SHOPKEEPER: 'shopProfile', MANDI_OWNER: 'mandiProfile', DRIVER: 'driverProfile' })[role];

module.exports = { findByIdentifier, findWithProfile, profileKey, PROFILE_INCLUDE, SAFE_USER_SELECT };
