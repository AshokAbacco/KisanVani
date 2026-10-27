const router = require('express').Router();
const { z } = require('zod');
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const v = require('./admin.validation');
const c = require('./admin.controller');

const rangeQuery = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() });

// Platform-wide management. Orders, trips, payments, vehicles, products etc. are administered through their
// own modules, which widen their scope for ADMIN while keeping the same validation and audit rules.
router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', validate({ query: rangeQuery }), h(c.dashboard));
router.get('/users', validate({ query: v.userQuery }), h(c.listUsers));
router.post('/users', validate({ body: v.createUser }), h(c.createUser));
router.get('/users/:id', validate({ params: v.idParam }), h(c.getUser));
router.patch('/users/:id', validate({ params: v.idParam, body: v.updateUser }), h(c.updateUser));
router.post('/users/:id/status', validate({ params: v.idParam, body: v.setStatus }), h(c.setStatus));
router.post('/users/:id/revoke-sessions', validate({ params: v.idParam }), h(c.revokeSessions));
router.get('/audit-logs', validate({ query: v.auditQuery }), h(c.auditLogs));

module.exports = router;
