const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./payments.validation');
const c = require('./payments.controller');

router.use(authenticate);

router.get('/', validate({ query: v.listQuery }), h(c.list));
router.get('/summary', h(c.summary));
router.post('/orders/:orderId', authorize('SHOPKEEPER', 'MANDI_OWNER'), validate({ params: v.orderParam, body: v.recordPayment }), h(c.payOrder));
router.post('/trips/:tripId', authorize('SHOPKEEPER', 'MANDI_OWNER', 'FARMER', 'ADMIN'), validate({ params: v.tripParam, body: v.recordPayment }), h(c.payTrip));

module.exports = router;
