const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Short in-memory cache of the signed-in user, so each API call doesn't wait for one extra
 * database round trip (expensive when the database is in another region).
 * Every place that changes a user's status, role, password or profile calls `forgetUser(id)`,
 * so those changes still apply on the very next request; the TTL is only a safety net.
 */
const USER_TTL_MS = 30_000;
const userCache = new Map(); // id -> { user, at, pending }
const USER_SELECT = { id: true, name: true, email: true, mobile: true, role: true, status: true, passwordChangedAt: true, preferredLanguage: true };

const forgetUser = (id) => userCache.delete(id);

const loadUser = async (id) => {
  const hit = userCache.get(id);
  if (hit && Date.now() - hit.at < USER_TTL_MS) return hit.pending || hit.user;
  // Concurrent requests for the same user share one query.
  const pending = prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  userCache.set(id, { at: Date.now(), pending });
  try {
    const user = await pending;
    if (userCache.get(id)?.pending === pending) {
      if (user) userCache.set(id, { user, at: Date.now() });
      else userCache.delete(id);
    }
    return user;
  } catch (e) {
    if (userCache.get(id)?.pending === pending) userCache.delete(id);
    throw e;
  }
};

// Keep the cache small.
setInterval(() => {
  const now = Date.now();
  for (const [id, v] of userCache) if (!v.pending && now - v.at >= USER_TTL_MS) userCache.delete(id);
}, 60_000).unref();

/**
 * Verifies the bearer access token and loads the user (see the cache above),
 * so role changes, suspensions and password changes take effect immediately.
 */
const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret, { issuer: 'kisanvani', audience: 'kisanvani-app' });
    } catch (e) {
      throw new ApiError(401, e.name === 'TokenExpiredError' ? 'Session expired' : 'Invalid token', e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
    }

    const cached = await loadUser(payload.sub);
    // A copy, so a request handler changing req.user can't alter the cached entry.
    const user = cached && { ...cached };
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (user.status !== 'ACTIVE') throw new ApiError(403, 'Your account is not active', 'ACCOUNT_INACTIVE');
    if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
      throw new ApiError(401, 'Password changed — please sign in again', 'TOKEN_REVOKED');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/** Restricts a route to one or more roles. Always use after `authenticate`. */
const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };

module.exports = { authenticate, authorize, forgetUser };