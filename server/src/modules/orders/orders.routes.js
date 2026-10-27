const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./orders.validation');
const c = require('./orders.controller');

router.use(authenticate);

// Buyers: shopkeepers (from farmers or mandis) and mandi owners (from farmers)
router.post('/', authorize('SHOPKEEPER', 'MANDI_OWNER'), validate({ body: v.createOrder }), h(c.create));
router.get('/', authorize('SHOPKEEPER', 'MANDI_OWNER', 'FARMER', 'ADMIN'), validate({ query: v.listQuery }), h(c.list));
router.get('/:id', authorize('SHOPKEEPER', 'MANDI_OWNER', 'FARMER', 'ADMIN'), validate({ params: v.idParam }), h(c.get));
router.post('/:id/transition', authorize('SHOPKEEPER', 'MANDI_OWNER', 'FARMER', 'ADMIN'), validate({ params: v.idParam, body: v.transition }), h(c.transition));
router.post('/:id/receive', authorize('SHOPKEEPER', 'MANDI_OWNER'), validate({ params: v.idParam, body: v.receive }), h(c.receive));

module.exports = router;
