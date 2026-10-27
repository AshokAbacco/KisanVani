const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const { locationLimiter } = require('../../middlewares/rateLimit');
const v = require('./tracking.validation');
const c = require('./tracking.controller');

router.use(authenticate);

// Live trips visible to the caller (admins: all; others: trips they are party to)
router.get('/active', h(c.active));
// REST fallback for drivers whose socket connection is unavailable
router.post('/trips/:id/locations', authorize('DRIVER'), locationLimiter, validate({ params: v.idParam, body: v.locationBody }), h(c.postLocation));
router.get('/trips/:id/locations', validate({ params: v.idParam, query: v.locationsQuery }), h(c.getLocations));

module.exports = router;
