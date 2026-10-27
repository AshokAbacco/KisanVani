const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const { authenticate, authorize } = require('../../middlewares/auth');
const c = require('./shop.controller');

// Shop profile, GPS location and receipt settings are managed through PATCH /auth/me.
router.use(authenticate, authorize('SHOPKEEPER'));
router.get('/dashboard', h(c.dashboard));

module.exports = router;
