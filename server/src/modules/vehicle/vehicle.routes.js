const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const { documentUpload } = require('../../middlewares/upload');
const v = require('./vehicle.validation');
const c = require('./vehicle.controller');

router.use(authenticate);

router.get('/', authorize('DRIVER', 'ADMIN'), validate({ query: v.listQuery }), h(c.list));
router.post('/', authorize('DRIVER'), validate({ body: v.create }), h(c.create));
router.get('/:id', authorize('DRIVER', 'ADMIN'), validate({ params: v.idParam }), h(c.get));
router.patch('/:id', authorize('DRIVER'), validate({ params: v.idParam, body: v.update }), h(c.update));
router.post('/:id/documents', authorize('DRIVER'), validate({ params: v.idParam }), documentUpload.single('file'), h(c.addDocument));
router.delete('/:id/documents/:docId', authorize('DRIVER'), validate({ params: v.docParams }), h(c.removeDocument));
router.post('/:id/verify', authorize('ADMIN'), validate({ params: v.idParam, body: v.verify }), h(c.verify));
router.post('/:id/documents/:docId/verify', authorize('ADMIN'), validate({ params: v.docParams, body: v.verify }), h(c.verifyDocument));

module.exports = router;
