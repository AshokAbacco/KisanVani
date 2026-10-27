const router = require('express').Router();
const { z } = require('zod');
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const { idParam } = require('../../validators/common');
const c = require('./settlements.controller');

const listQuery = z
  .object({ as: z.enum(['payer', 'payee']).optional(), status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED']).optional() })
  .passthrough();

router.use(authenticate, authorize('ADMIN', 'SHOPKEEPER', 'FARMER', 'MANDI_OWNER'));
router.get('/', validate({ query: listQuery }), h(c.list));
router.get('/:id', validate({ params: idParam }), h(c.get));

module.exports = router;
