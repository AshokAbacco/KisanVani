const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const { imageUpload } = require('../../middlewares/upload');
const v = require('./farmer.validation');
const c = require('./farmer.controller');

router.use(authenticate, authorize('FARMER'));

router.get('/dashboard', h(c.dashboard));
router.get('/crops', h(c.crops));
router.get('/listings', validate({ query: v.listingQuery }), h(c.list));
router.post('/listings', validate({ body: v.createListing }), h(c.create));
router.get('/listings/:id', validate({ params: v.idParam }), h(c.get));
router.patch('/listings/:id', validate({ params: v.idParam, body: v.updateListing }), h(c.update));
router.post('/listings/:id/status', validate({ params: v.idParam, body: v.listingStatus }), h(c.setStatus));
router.post('/listings/:id/images', validate({ params: v.idParam }), imageUpload.array('images', 5), h(c.addImages));
router.delete('/listings/:id/images', validate({ params: v.idParam, body: v.removeImage }), h(c.removeImage));

module.exports = router;
