const router = require('express').Router();
const { z } = require('zod');
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const c = require('./reports.controller');

const rangeQuery = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });
const exportQuery = rangeQuery.extend({ dataset: z.enum(['sales', 'stock', 'credit', 'orders', 'settlements', 'trips', 'users', 'payments']) });

router.use(authenticate);
router.get('/summary', validate({ query: rangeQuery }), h(c.summary));
router.get('/export', validate({ query: exportQuery }), h(c.export));

module.exports = router;
