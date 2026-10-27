const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const { authenticate, authorize } = require('../../middlewares/auth');
const c = require('./driver.controller');

router.use(authenticate, authorize('DRIVER'));

router.get('/dashboard', h(c.dashboard));
router.get('/earnings', h(c.earnings));

module.exports = router;
