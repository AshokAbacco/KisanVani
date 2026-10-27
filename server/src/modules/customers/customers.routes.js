const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./customers.validation');
const c = require('./customers.controller');

router.use(authenticate, authorize('SHOPKEEPER'));

router.get('/', validate({ query: v.listQuery }), h(c.list));
router.post('/', validate({ body: v.create }), h(c.create));
router.get('/:id', validate({ params: v.idParam }), h(c.get));
router.patch('/:id', validate({ params: v.idParam, body: v.update }), h(c.update));
router.post('/:id/collect', validate({ params: v.idParam, body: v.collect }), h(c.collect));

module.exports = router;
