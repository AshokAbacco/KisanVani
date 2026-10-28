const { Prisma } = require('../generated/prisma/client.ts');

const Decimal = Prisma.Decimal;

/** Converts input (string | number | Decimal | null) to a Decimal. */
const D = (v) => new Decimal(v === null || v === undefined || v === '' ? 0 : v);

/** Money is held to 2 decimal places, rounding half-up (standard for INR receipts). */
const money = (v) => D(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** Quantities in kilograms are held to 3 decimal places (gram precision). */
const qty = (v) => D(v).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);

const sum = (values) => values.reduce((acc, v) => acc.plus(D(v)), D(0));

/** Converts Decimal values (deeply) to strings so JSON responses never lose precision. */
const serialize = (value) => {
  if (value === null || value === undefined) return value;
  if (Decimal.isDecimal(value)) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
};

module.exports = { Decimal, D, money, qty, sum, serialize };