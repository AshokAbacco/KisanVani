const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { DEFAULT_SETTINGS } = require('../../constants');
const settings = require('../../services/settings.service');
const { VALUE_SCHEMAS } = require('./settings.validation');

const listAll = async () => {
  const rows = await prisma.applicationSetting.findMany({ include: { updatedBy: { select: { name: true } } } });
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  return Object.entries(DEFAULT_SETTINGS).map(([key, def]) => ({
    key,
    value: byKey[key]?.value ?? def.value,
    defaultValue: def.value,
    description: def.description,
    isPublic: def.isPublic,
    updatedAt: byKey[key]?.updatedAt || null,
    updatedBy: byKey[key]?.updatedBy?.name || null,
  }));
};

const update = async (actor, key, value, _ip) => {
  const def = DEFAULT_SETTINGS[key];
  if (!def) throw ApiError.notFound(`Unknown setting "${key}"`);
  const parsed = VALUE_SCHEMAS[key].safeParse(value);
  if (!parsed.success) throw ApiError.unprocessable(parsed.error.issues[0]?.message || 'Invalid value');

  const row = await prisma.applicationSetting.upsert({
    where: { key },
    create: { key, value: parsed.data, description: def.description, isPublic: def.isPublic, updatedById: actor.id },
    update: { value: parsed.data, updatedById: actor.id },
  });
  settings.invalidate();
  return row;
};

module.exports = { listAll, update, getPublic: settings.getPublic };
