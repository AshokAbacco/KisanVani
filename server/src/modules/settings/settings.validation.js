const { z } = require('../../validators/common');
const { DEFAULT_SETTINGS } = require('../../constants');

const keyParam = z.object({ key: z.string().min(3).max(80) });

/** Per-key value validators; unknown keys are rejected so typos cannot create dead settings. */
const VALUE_SCHEMAS = {
  'platform.name': z.string().trim().min(2).max(60),
  'platform.supportEmail': z.string().email(),
  'platform.supportPhone': z.string().trim().min(6).max(20),
  'auth.approvalRequiredRoles': z.array(z.enum(['SHOPKEEPER', 'FARMER', 'MANDI_OWNER', 'DRIVER'])).max(4),
  'billing.maxDiscountPercent': z.number().min(0).max(100),
  'billing.weighingScale': z.object({ enabled: z.boolean(), baudRate: z.number().int().refine((n) => [1200, 2400, 4800, 9600, 19200, 38400].includes(n), 'Unsupported baud rate') }),
  'tracking.locationIntervalSec': z.number().int().min(5).max(600),
  'tracking.staleAfterSec': z.number().int().min(30).max(3600),
  'map.tileUrl': z.string().trim().url().or(z.string().regex(/^https:\/\/.+\{z\}.+\{x\}.+\{y\}/, 'Must be a tile URL template')),
  'map.attribution': z.string().trim().min(3).max(300),
  'orders.platformFeePercent': z.number().min(0).max(20),
};

const updateBody = z.object({ value: z.any() });

module.exports = { keyParam, updateBody, VALUE_SCHEMAS, KNOWN_KEYS: Object.keys(DEFAULT_SETTINGS) };
