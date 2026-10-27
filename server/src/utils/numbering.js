const prisma = require('../config/prisma');

/**
 * Atomically increments a named counter and returns the new value.
 * INSERT … ON CONFLICT DO UPDATE is a single statement, so concurrent callers always get distinct values.
 * Pass a transaction client to make the number part of the surrounding transaction.
 */
const nextValue = async (key, client = prisma) => {
  const rows = await client.$queryRaw`
    INSERT INTO "document_counters" ("key", "value") VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "document_counters"."value" + 1
    RETURNING "value"`;
  return Number(rows[0].value);
};

const pad = (n, width = 6) => String(n).padStart(width, '0');

const yearPart = () => String(new Date().getUTCFullYear()).slice(-2);

/** e.g. ORD-26-000042 */
const nextDocumentNumber = async (prefix, client = prisma) => {
  const yy = yearPart();
  const n = await nextValue(`${prefix}-${yy}`, client);
  return `${prefix}-${yy}-${pad(n)}`;
};

/** Per-shop invoice numbers, e.g. KV-SHP1A2B-26-000123 */
const nextInvoiceNumber = async (shopCode, client = prisma) => {
  const yy = yearPart();
  const n = await nextValue(`INV-${shopCode}-${yy}`, client);
  return `KV-${shopCode}-${yy}-${pad(n)}`;
};

module.exports = { nextValue, nextDocumentNumber, nextInvoiceNumber };
