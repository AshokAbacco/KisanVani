const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./settings.validation');
const c = require('./settings.controller');

router.get('/public', h(c.publicSettings));
router.get('/', authenticate, authorize('ADMIN'), h(c.list));
router.put('/:key', authenticate, authorize('ADMIN'), validate({ params: v.keyParam, body: v.updateBody }), h(c.update));

module.exports = router;
