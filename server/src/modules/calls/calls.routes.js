const router = require('express').Router();
const { z } = require('zod');
const { asyncHandler: h } = require('../../utils/http');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const c = require('./calls.controller');

const historyQuery = z.object({
  conversationId: z.string().uuid('Invalid conversation'),
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Placing, answering and ending calls happens over Socket.IO (sockets/call.socket.js).
router.use(authenticate);
router.get('/ice-servers', h(c.iceServers));
router.get('/', validate({ query: historyQuery }), h(c.history));

module.exports = router;