const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const { documentUpload } = require('../../middlewares/upload');
const v = require('./transport.validation');
const c = require('./transport.controller');

router.use(authenticate);

// Transport requests (loads)
router.post('/requests', authorize('FARMER', 'SHOPKEEPER', 'MANDI_OWNER', 'ADMIN'), validate({ body: v.createRequest }), h(c.createRequest));
router.get('/requests', validate({ query: v.requestQuery }), h(c.listRequests));
router.get('/requests/:id', validate({ params: v.idParam }), h(c.getRequest));
router.post('/requests/:id/cancel', authorize('FARMER', 'SHOPKEEPER', 'MANDI_OWNER', 'ADMIN'), validate({ params: v.idParam, body: v.reasonBody }), h(c.cancelRequest));
router.post('/requests/:id/claim', authorize('DRIVER'), validate({ params: v.idParam, body: v.claimRequest }), h(c.claimRequest));

// Trips
router.get('/available-drivers', authorize('ADMIN', 'MANDI_OWNER'), h(c.availableDrivers));
router.post('/trips', authorize('ADMIN', 'MANDI_OWNER'), validate({ body: v.assignTrip }), h(c.assignTrip));
router.get('/trips', validate({ query: v.tripQuery }), h(c.listTrips));
router.get('/trips/:id', validate({ params: v.idParam }), h(c.getTrip));
router.post('/trips/:id/transition', validate({ params: v.idParam, body: v.tripTransition }), h(c.transitionTrip));
router.post('/trips/:id/proof', authorize('DRIVER'), validate({ params: v.idParam }), documentUpload.single('file'), h(c.addProof));

module.exports = router;
