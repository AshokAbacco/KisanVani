const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./categories.validation');
const c = require('./categories.controller');

router.use(authenticate);
router.get('/', validate({ query: v.listQuery }), h(c.list));
router.post('/', authorize('ADMIN'), validate({ body: v.create }), h(c.create));
router.patch('/:id', authorize('ADMIN'), validate({ params: v.idParam, body: v.update }), h(c.update));
router.delete('/:id', authorize('ADMIN'), validate({ params: v.idParam }), h(c.remove));

module.exports = router;
