const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

/**
 * Verifies the bearer access token and loads the user from the database on every request,
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

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, mobile: true, role: true, status: true, passwordChangedAt: true, preferredLanguage: true },
    });
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

module.exports = { authenticate, authorize };
