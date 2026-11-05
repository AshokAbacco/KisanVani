const { z } = require('zod');
const logger = require('../config/logger');
const presence = require('./presence');
const { emitTo, userRoom } = require('./io');
const chat = require('../modules/chat/chat.service');

const typingSchema = z.object({ conversationId: z.string().uuid() });

/** Tells everyone who shares a conversation with this user that they came online / went offline. */
const announce = async (userId) => {
  const partners = await chat.partnersOf(userId);
  const payload = { userId, ...presence.presenceOf(userId) };
  for (const id of partners) emitTo(userRoom(id), 'chat:presence', payload);
};

/**
 * Chat over Socket.IO. Messages are sent through the REST API (validated and permission-checked);
 * the socket only carries live updates, presence and typing.
 *   client → server: chat:typing { conversationId }
 */
module.exports = (io, socket) => {
  const { user } = socket.data;

  if (presence.connect(user.id)) {
    // First device online: messages that were waiting for this user are now delivered.
    chat
      .markDelivered(user.id)
      .then(() => announce(user.id))
      .catch((err) => logger.warn(`chat presence (online) failed for ${user.id}: ${err.message}`));
  }

  socket.on('chat:typing', async (payload) => {
    const parsed = typingSchema.safeParse(payload);
    if (!parsed.success) return;
    const partnerId = await chat.partnerIn(user.id, parsed.data.conversationId).catch(() => null);
    if (partnerId) emitTo(userRoom(partnerId), 'chat:typing', { conversationId: parsed.data.conversationId, userId: user.id });
  });

  socket.on('disconnect', () => {
    if (presence.disconnect(user.id)) announce(user.id).catch((err) => logger.warn(`chat presence (offline) failed for ${user.id}: ${err.message}`));
  });
};