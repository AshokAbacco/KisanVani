const router = require('express').Router();
const { z } = require('zod');
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const { idParam, optionalText } = require('../../validators/common');
const c = require('./notifications.controller');

const broadcastBody = z.object({
  role: z.enum(['SHOPKEEPER', 'FARMER', 'MANDI_OWNER', 'DRIVER', 'ADMIN']).optional().nullable(),
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(1000),
  link: optionalText(200),
});
const listQuery = z.object({ unread: z.enum(['true', 'false']).optional() }).passthrough();

router.use(authenticate);
router.get('/', validate({ query: listQuery }), h(c.list));
router.get('/unread-count', h(c.unreadCount));
router.post('/read-all', h(c.markAllRead));
router.post('/broadcast', authorize('ADMIN'), validate({ body: broadcastBody }), h(c.broadcast));
router.post('/:id/read', validate({ params: idParam }), h(c.markRead));

module.exports = router;
