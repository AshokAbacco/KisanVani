const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const { imageUpload } = require('../../middlewares/upload');
const v = require('./mandi.validation');
const c = require('./mandi.controller');

router.use(authenticate, authorize('MANDI_OWNER'));

router.get('/dashboard', h(c.dashboard));
router.get('/products', h(c.products));
router.get('/partners', h(c.partners));
router.put('/commission', validate({ body: v.commission }), h(c.setCommission));
router.get('/lots', validate({ query: v.lotQuery }), h(c.list));
router.post('/lots', validate({ body: v.createLot }), h(c.create));
router.get('/lots/:id', validate({ params: v.idParam }), h(c.get));
router.patch('/lots/:id', validate({ params: v.idParam, body: v.updateLot }), h(c.update));
router.post('/lots/:id/status', validate({ params: v.idParam, body: v.lotStatus }), h(c.setStatus));
router.post('/lots/:id/images', validate({ params: v.idParam }), imageUpload.array('images', 5), h(c.addImages));
router.delete('/lots/:id/images', validate({ params: v.idParam, body: v.removeImage }), h(c.removeImage));

module.exports = router;
