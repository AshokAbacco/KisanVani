const prisma = require('../config/prisma');
const logger = require('../config/logger');
const { emitTo, userRoom } = require('../sockets/io');

/**
 * Creates an in-app notification and pushes it over Socket.IO.
 * Notifications are best-effort: a failure never breaks the business action that triggered it.
 */
const notify = async (userId, { type, title, message, link }) => {
  if (!userId) return null;
  try {
    const n = await prisma.notification.create({ data: { userId, type, title, message, link } });
    emitTo(userRoom(userId), 'notification:new', n);
    return n;
  } catch (err) {
    logger.warn('Notification failed', { err: err.message, userId, type });
    return null;
  }
};

const notifyMany = async (userIds, payload) => Promise.all([...new Set(userIds.filter(Boolean))].map((id) => notify(id, payload)));

module.exports = { notify, notifyMany };
