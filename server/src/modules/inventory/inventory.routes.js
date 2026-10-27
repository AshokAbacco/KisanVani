const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./inventory.validation');
const c = require('./inventory.controller');

router.use(authenticate, authorize('SHOPKEEPER'));

router.get('/', validate({ query: v.listQuery }), h(c.list));
router.get('/transactions', validate({ query: v.txnQuery }), h(c.transactions));
router.post('/', validate({ body: v.create }), h(c.create));
router.get('/:id', validate({ params: v.idParam }), h(c.get));
router.patch('/:id', validate({ params: v.idParam, body: v.update }), h(c.update));
router.post('/:id/adjust', validate({ params: v.idParam, body: v.adjust }), h(c.adjust));

module.exports = router;
