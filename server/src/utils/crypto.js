const crypto = require('node:crypto');

const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString('base64url');

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

/** Keyed hash (HMAC-SHA256) — used so leaked database rows cannot be replayed as tokens. */
const hmac = (secret, value) => crypto.createHmac('sha256', secret).update(String(value)).digest('hex');

/** Cryptographically random numeric code, e.g. a 6-digit OTP */
const numericCode = (digits = 6) => String(crypto.randomInt(0, 10 ** digits)).padStart(digits, '0');

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

module.exports = { randomToken, sha256, hmac, numericCode, safeEqual };
