const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./procurement.validation');
const c = require('./procurement.controller');

router.use(authenticate);

// Marketplace — farmers' harvests are visible to shops and mandi owners; mandi lots to shops.
router.get('/harvest-listings', authorize('SHOPKEEPER', 'MANDI_OWNER', 'ADMIN'), validate({ query: v.marketQuery }), h(c.harvestListings));
router.get('/harvest-listings/:id', authorize('SHOPKEEPER', 'MANDI_OWNER', 'ADMIN'), validate({ params: v.idParam }), h(c.harvestListing));
router.get('/mandi-lots', authorize('SHOPKEEPER', 'ADMIN'), validate({ query: v.marketQuery }), h(c.mandiLots));
router.get('/mandi-lots/:id', authorize('SHOPKEEPER', 'ADMIN'), validate({ params: v.idParam }), h(c.mandiLot));

// Shop purchases from its own (off-platform) suppliers
router.get('/purchases', authorize('SHOPKEEPER'), validate({ query: v.purchaseQuery }), h(c.listPurchases));
router.post('/purchases', authorize('SHOPKEEPER'), validate({ body: v.createPurchase }), h(c.createPurchase));
router.get('/purchases/:id', authorize('SHOPKEEPER'), validate({ params: v.idParam }), h(c.getPurchase));
router.post('/purchases/:id/receive', authorize('SHOPKEEPER'), validate({ params: v.idParam, body: v.receivePurchase }), h(c.receivePurchase));
router.post('/purchases/:id/cancel', authorize('SHOPKEEPER'), validate({ params: v.idParam, body: v.reasonBody }), h(c.cancelPurchase));
router.post('/purchases/:id/payments', authorize('SHOPKEEPER'), validate({ params: v.idParam, body: v.purchasePayment }), h(c.payPurchase));

module.exports = router;
