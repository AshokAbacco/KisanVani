const router = require('express').Router();
const { z } = require('zod');
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const { idParam } = require('../../validators/common');
const c = require('./chat.controller');

const MAX_MESSAGE = 4000;
const body = z.object({ body: z.string().trim().min(1, 'Type a message').max(MAX_MESSAGE, `At most ${MAX_MESSAGE} characters`) });
const openBody = z.object({ userId: z.string().uuid('Invalid user') });
const contactsQuery = z.object({ search: z.string().trim().max(60).optional() });
const messagesQuery = z.object({ before: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(100).optional() });

// Every signed-in role can chat; who they may talk to is enforced in chat.service via chat.permissions.
router.use(authenticate);
router.get('/contacts', validate({ query: contactsQuery }), h(c.contacts));
router.get('/conversations', h(c.conversations));
router.get('/unread-count', h(c.unreadCount));
router.post('/conversations', validate({ body: openBody }), h(c.open));
router.get('/conversations/:id', validate({ params: idParam }), h(c.getConversation));
router.get('/conversations/:id/messages', validate({ params: idParam, query: messagesQuery }), h(c.messages));
router.post('/conversations/:id/messages', validate({ params: idParam, body }), h(c.send));
router.post('/conversations/:id/read', validate({ params: idParam }), h(c.read));
router.post('/conversations/:id/clear', validate({ params: idParam }), h(c.clear));
router.delete('/conversations/:id', validate({ params: idParam }), h(c.remove));
router.patch('/messages/:id', validate({ params: idParam, body }), h(c.edit));

module.exports = router;
