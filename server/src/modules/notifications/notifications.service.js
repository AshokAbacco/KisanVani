const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const audit = require('../../services/audit.service');
const { emitTo, userRoom } = require('../../sockets/io');
const { paginate, pageMeta } = require('../../utils/pagination');

const list = async (userId, query) => {
  const { q, skip, take } = paginate(query, ['createdAt'], 'createdAt');
  const where = { userId, ...(query.unread === 'true' ? { readAt: null } : {}) };
  const [items, total, unread] = await prisma.$transaction([
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, meta: { ...pageMeta(q, total), unread } };
};

const unreadCount = async (userId) => ({ unread: await prisma.notification.count({ where: { userId, readAt: null } }) });

const markRead = async (userId, id) => {
  const res = await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  if (res.count !== 1) throw ApiError.notFound('Notification not found');
  return unreadCount(userId);
};

const markAllRead = async (userId) => {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return { unread: 0 };
};

/** Admin broadcast to every active user (optionally of one role). */
const broadcast = async (admin, { role, title, message, link }) => {
  const users = await prisma.user.findMany({ where: { status: 'ACTIVE', ...(role ? { role } : {}) }, select: { id: true } });
  if (!users.length) return { sent: 0 };
  await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, type: 'BROADCAST', title, message, link })) });
  for (const u of users) emitTo(userRoom(u.id), 'notification:new', { type: 'BROADCAST', title, message, link, createdAt: new Date() });
  await audit.record({ actorId: admin.id, action: 'NOTIFICATION_BROADCAST', entityType: 'Notification', metadata: { role: role || 'ALL', title, recipients: users.length } });
  return { sent: users.length };
};

module.exports = { list, unreadCount, markRead, markAllRead, broadcast };
