const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./suppliers.validation');
const c = require('./suppliers.controller');

router.use(authenticate, authorize('SHOPKEEPER'));

router.get('/', h(c.list));
router.post('/', validate({ body: v.create }), h(c.create));
router.get('/:id', validate({ params: v.idParam }), h(c.get));
router.patch('/:id', validate({ params: v.idParam, body: v.update }), h(c.update));

module.exports = router;
