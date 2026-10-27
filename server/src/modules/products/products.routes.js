const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const { imageUpload } = require('../../middlewares/upload');
const v = require('./products.validation');
const c = require('./products.controller');

router.use(authenticate);
router.get('/', validate({ query: v.listQuery }), h(c.list));
router.get('/:id', validate({ params: v.idParam }), h(c.get));
router.post('/', authorize('ADMIN'), validate({ body: v.create }), h(c.create));
router.patch('/:id', authorize('ADMIN'), validate({ params: v.idParam, body: v.update }), h(c.update));
router.post('/:id/image', authorize('ADMIN'), validate({ params: v.idParam }), imageUpload.single('image'), h(c.uploadImage));

module.exports = router;
