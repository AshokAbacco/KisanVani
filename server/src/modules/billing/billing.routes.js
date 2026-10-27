const router = require('express').Router();
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./billing.validation');
const c = require('./billing.controller');

router.use(authenticate);

router.get('/pos-config', authorize('SHOPKEEPER'), h(c.posConfig));
router.post('/invoices', authorize('SHOPKEEPER'), validate({ body: v.createInvoice }), h(c.createInvoice));
router.get('/invoices', authorize('SHOPKEEPER', 'ADMIN'), validate({ query: v.listQuery }), h(c.list));
router.get('/invoices/:id', authorize('SHOPKEEPER', 'ADMIN'), validate({ params: v.idParam }), h(c.get));
router.post('/invoices/:id/print', authorize('SHOPKEEPER'), validate({ params: v.idParam }), h(c.print));
router.post('/invoices/:id/cancel', authorize('SHOPKEEPER'), validate({ params: v.idParam, body: v.reasonBody }), h(c.cancel));

module.exports = router;
