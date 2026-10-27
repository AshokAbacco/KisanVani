const prisma = require('../config/prisma');
const { DEFAULT_SETTINGS } = require('../constants');

let cache = null;
let cacheAt = 0;
const TTL_MS = 30_000;

const load = async () => {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  const rows = await prisma.applicationSetting.findMany();
  const map = {};
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) map[key] = def.value;
  for (const r of rows) map[r.key] = r.value;
  cache = map;
  cacheAt = Date.now();
  return map;
};

const get = async (key) => (await load())[key];

const getPublic = async () => {
  const rows = await prisma.applicationSetting.findMany({ where: { isPublic: true } });
  const out = {};
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) if (def.isPublic) out[key] = def.value;
  for (const r of rows) out[r.key] = r.value;
  return out;
};

const invalidate = () => {
  cache = null;
};

module.exports = { get, getPublic, load, invalidate };
