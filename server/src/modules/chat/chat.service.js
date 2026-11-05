const crypto = require('node:crypto');
const logger = require('../../config/logger');
const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const { emitTo, userRoom } = require('../../sockets/io');
const presence = require('../../sockets/presence');
const { contactRoles, canStartChat, canSendTo } = require('./chat.permissions');
const { notify } = require('../../services/notification.service');

/*
 * One-to-one chat.
 *
 * Message status, as the sender sees it:
 *   SENT       stored on the server (one grey tick)
 *   DELIVERED  reached the other user's device: they were online, or came online later (two grey ticks)
 *   READ       the other user opened the conversation (two blue ticks)
 *
 * Socket events (server → client), all sent to the user's private room:
 *   chat:message          { conversationId, message, conversation }   new message (also echoed to the sender's other tabs)
 *   chat:message-updated  { conversationId, message }                 a message was edited
 *   chat:status           { conversationId, status, upTo }            the other user received/read my messages up to `upTo`
 *   chat:presence         { userId, online, lastSeenAt }              a chat partner came online / went offline
 *   chat:typing           { conversationId, userId }                  the other user is typing
 *   chat:unread           { total }                                   my total unread count changed
 *   notification:new      (type CHAT_MESSAGE)                          header bell entry for a new message
 *   notification:sync     { link, unread }                            chat notifications for `link` were read
 */

/* Header notifications for chat use the same table and live event as order notifications. */
const CHAT_NOTIFICATION = 'CHAT_MESSAGE';
const ROLE_BASE = { ADMIN: '/admin', SHOPKEEPER: '/shop', FARMER: '/farmer', MANDI_OWNER: '/mandi', DRIVER: '/driver' };
/** Where a chat notification takes this user: straight into the conversation in their own dashboard. */
const chatLink = (user, conversationId) => `${ROLE_BASE[user.role] || ''}/chat/${conversationId}`;
const preview = (body) => {
  const flat = String(body).replace(/\s+/g, ' ').trim();
  return flat.length > 120 ? `${flat.slice(0, 117)}…` : flat;
};

/**
 * Marks this user's chat notifications for a conversation as read and tells their open tabs,
 * so the bell count drops as soon as the conversation is opened (or cleared / deleted).
 */
const readChatNotifications = async (user, conversationId) => {
  const link = chatLink(user, conversationId);
  const res = await prisma.notification.updateMany({ where: { userId: user.id, type: CHAT_NOTIFICATION, link, readAt: null }, data: { readAt: new Date() } });
  if (res.count > 0) {
    const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
    emitTo(userRoom(user.id), 'notification:sync', { link, unread });
  }
  return res.count;
};

const PERSON = { id: true, name: true, role: true, mobile: true, avatarUrl: true, status: true };
const MESSAGE_PAGE = 50;

const pairKeyOf = (a, b) => [a, b].sort().join(':');

const statusOf = (m) => (m.readAt ? 'READ' : m.deliveredAt ? 'DELIVERED' : 'SENT');

const toMessage = (m) => ({
  id: m.id,
  conversationId: m.conversationId,
  senderId: m.senderId,
  body: m.body,
  createdAt: m.createdAt,
  editedAt: m.editedAt,
  status: statusOf(m),
});

const toPerson = (u) => ({
  id: u.id,
  name: u.name,
  role: u.role,
  mobile: u.mobile,
  avatarUrl: u.avatarUrl,
  status: u.status,
  ...presence.presenceOf(u.id),
});

/** Loads a conversation the user takes part in. Missing and forbidden look the same (404) so ids cannot be probed. */
const loadMembership = async (userId, conversationId) => {
  const me = await prisma.chatParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: { conversation: { include: { participants: { include: { user: { select: PERSON } } } } } },
  });
  if (!me) throw ApiError.notFound('Conversation not found');
  const partner = me.conversation.participants.find((p) => p.userId !== userId)?.user;
  return { me, partner, conversation: me.conversation };
};

/** Messages this user may see in a conversation: everything after their last "clear chat". */
const visibleSince = (participant) => (participant.clearedAt ? { createdAt: { gt: participant.clearedAt } } : {});

/** Unread counts per conversation for one user (messages from the other side, not read, not cleared). */
const unreadByConversation = async (userId) => {
  const rows = await prisma.$queryRaw`
    SELECT m."conversationId" AS id, COUNT(*)::int AS n
    FROM chat_messages m
    JOIN chat_participants p ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE m."senderId" <> ${userId}
      AND m."readAt" IS NULL
      AND (p."clearedAt" IS NULL OR m."createdAt" > p."clearedAt")
    GROUP BY m."conversationId"`;
  return new Map(rows.map((r) => [r.id, Number(r.n)]));
};

const unreadTotal = async (userId) => {
  const map = await unreadByConversation(userId);
  let total = 0;
  for (const n of map.values()) total += n;
  return { total };
};

const pushUnread = async (userId) => emitTo(userRoom(userId), 'chat:unread', await unreadTotal(userId));

/** Builds the chat-list entry of a conversation as `userId` sees it. */
const summarize = async (userId, participant, partner, unread) => {
  const last = await prisma.chatMessage.findFirst({
    where: { conversationId: participant.conversationId, ...visibleSince(participant) },
    orderBy: { createdAt: 'desc' },
  });
  return {
    id: participant.conversationId,
    partner: toPerson(partner),
    lastMessage: last ? toMessage(last) : null,
    lastMessageAt: last?.createdAt || null,
    unread: unread ?? 0,
    canMessage: canSendTo({ id: userId, role: participant.user?.role }, partner),
  };
};

/* ───────────────────────────── Contacts ───────────────────────────── */

const ROLE_WORDS = {
  FARMER: ['farmer', 'kisan'],
  SHOPKEEPER: ['shopkeeper', 'shop', 'retailer'],
  MANDI_OWNER: ['mandi', 'market', 'mandi owner', 'trader', 'wholesaler'],
  DRIVER: ['driver', 'transport', 'vehicle'],
  ADMIN: ['admin', 'administrator'],
};

/** People this user may start a chat with, filtered by name, phone or role. */
const contacts = async (me, { search = '' } = {}) => {
  const roles = contactRoles(me.role);
  const term = String(search).trim();
  const digits = term.replace(/\D/g, '');
  const roleHits = term ? roles.filter((r) => ROLE_WORDS[r].some((w) => w.startsWith(term.toLowerCase()) || term.toLowerCase().startsWith(w))) : [];

  const users = await prisma.user.findMany({
    where: {
      id: { not: me.id },
      status: 'ACTIVE',
      role: { in: roles },
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              ...(digits.length >= 3 ? [{ mobile: { contains: digits } }] : []),
              ...(roleHits.length ? [{ role: { in: roleHits } }] : []),
            ],
          }
        : {}),
    },
    select: PERSON,
    orderBy: [{ name: 'asc' }],
    take: 100,
  });

  // Mark people this user already has a conversation with, so the client can open it instead.
  const keys = users.map((u) => pairKeyOf(me.id, u.id));
  const existing = await prisma.chatConversation.findMany({ where: { pairKey: { in: keys } }, select: { id: true, pairKey: true } });
  const byKey = new Map(existing.map((c) => [c.pairKey, c.id]));
  return users.map((u) => ({ ...toPerson(u), conversationId: byKey.get(pairKeyOf(me.id, u.id)) || null }));
};

/* ───────────────────────────── Conversations ───────────────────────────── */

/** The user's chat list, newest first. Also marks messages waiting for them as delivered. */
/** The newest visible message of every conversation of `userId`, in one query. */
const lastMessagesFor = async (userId) => {
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT ON (m."conversationId")
      m.id, m."conversationId", m."senderId", m.body, m."editedAt", m."deliveredAt", m."readAt", m."createdAt"
    FROM chat_messages m
    JOIN chat_participants p ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE p."deletedAt" IS NULL
      AND (p."clearedAt" IS NULL OR m."createdAt" > p."clearedAt")
    ORDER BY m."conversationId", m."createdAt" DESC`;
  return new Map(rows.map((m) => [m.conversationId, m]));
};

const listConversations = async (me) => {
  // Everything below is independent, so it runs side by side: one database round trip instead of 3 + one per chat.
  const [, parts, unread, lastByConversation] = await Promise.all([
    markDelivered(me.id),
    prisma.chatParticipant.findMany({
      where: { userId: me.id, deletedAt: null },
      include: { conversation: { include: { participants: { include: { user: { select: PERSON } } } } } },
    }),
    unreadByConversation(me.id),
    lastMessagesFor(me.id),
  ]);
  const items = parts.map((p) => {
    const partner = p.conversation.participants.find((x) => x.userId !== me.id)?.user;
    if (!partner) return null;
    const last = lastByConversation.get(p.conversationId);
    return {
      id: p.conversationId,
      partner: toPerson(partner),
      lastMessage: last ? toMessage(last) : null,
      lastMessageAt: last?.createdAt || null,
      unread: unread.get(p.conversationId) ?? 0,
      canMessage: canSendTo({ id: me.id, role: me.role }, partner),
    };
  });
  return items
    .filter(Boolean)
    .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0) || a.partner.name.localeCompare(b.partner.name));
};

/** Opens the conversation with `otherUserId`, creating it if needed. Never creates a duplicate. */
const openConversation = async (me, otherUserId) => {
  const other = await prisma.user.findUnique({ where: { id: otherUserId }, select: PERSON });
  const pairKey = pairKeyOf(me.id, otherUserId);
  const existing = other ? await prisma.chatConversation.findUnique({ where: { pairKey } }) : null;

  if (!existing) {
    if (!canStartChat(me, other)) throw ApiError.forbidden('You cannot start a chat with this user');
    try {
      await prisma.chatConversation.create({
        data: { pairKey, participants: { create: [{ userId: me.id }, { userId: otherUserId }] } },
      });
    } catch (err) {
      // Both users pressed "chat" at the same moment: the unique pair key lets only one create win.
      if (err.code !== 'P2002') throw err;
    }
  } else {
    // An existing conversation may be reopened even with an admin who started it, but not by an outsider.
    const mine = await prisma.chatParticipant.findUnique({ where: { conversationId_userId: { conversationId: existing.id, userId: me.id } } });
    if (!mine) throw ApiError.notFound('Conversation not found');
    if (mine.deletedAt) await prisma.chatParticipant.update({ where: { id: mine.id }, data: { deletedAt: null } });
  }

  const conv = await prisma.chatConversation.findUnique({ where: { pairKey } });
  const { me: participant, partner } = await loadMembership(me.id, conv.id);
  const unread = await unreadByConversation(me.id);
  return summarize(me.id, { ...participant, user: { role: me.role } }, partner, unread.get(conv.id));
};

const getConversation = async (me, conversationId) => {
  const { me: participant, partner } = await loadMembership(me.id, conversationId);
  const unread = await unreadByConversation(me.id);
  return summarize(me.id, { ...participant, user: { role: me.role } }, partner, unread.get(conversationId));
};

/* ───────────────────────────── Messages ───────────────────────────── */

/** A page of messages, oldest first. Pass `before` (ISO date) to load older ones. */
const listMessages = async (me, conversationId, { before, limit } = {}) => {
  const { me: participant } = await loadMembership(me.id, conversationId);
  const take = Math.min(Math.max(Number(limit) || MESSAGE_PAGE, 1), 100);
  const where = {
    conversationId,
    ...(participant.clearedAt || before
      ? {
          createdAt: {
            ...(participant.clearedAt ? { gt: participant.clearedAt } : {}),
            ...(before ? { lt: new Date(before) } : {}),
          },
        }
      : {}),
  };
  const rows = await prisma.chatMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: take + 1 });
  const hasMore = rows.length > take;
  return { items: rows.slice(0, take).reverse().map(toMessage), hasMore };
};

const sendMessage = async (me, conversationId, { body }) => {
  const { partner } = await loadMembership(me.id, conversationId);
  if (!canSendTo(me, partner)) throw ApiError.forbidden('You cannot send messages to this user');

  // The three writes are independent, so they run side by side: one database round trip instead of five
  // (a transaction would add BEGIN/COMMIT and run them one after another, slow with a far-away database).
  const now = new Date();
  const [message] = await Promise.all([
    prisma.chatMessage.create({
      data: { id: crypto.randomUUID(), conversationId, senderId: me.id, body, createdAt: now, deliveredAt: presence.isOnline(partner.id) ? now : null },
    }),
    prisma.chatConversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
    // A new message brings a deleted conversation back for both people (like WhatsApp).
    prisma.chatParticipant.updateMany({ where: { conversationId, deletedAt: { not: null } }, data: { deletedAt: null } }),
  ]);

  const payload = toMessage(message);
  // Live updates, unread badge and the bell notification go out after the reply, so the sender
  // isn't kept waiting for them.
  setImmediate(() => {
    fanOutMessage(me, partner, conversationId, payload, body).catch((err) => logger.warn(`chat fan-out failed for ${conversationId}: ${err.message}`));
  });
  return payload;
};

const fanOutMessage = async (me, partner, conversationId, payload, body) => {
  const [mineSummary, theirSummary] = await Promise.all([getConversation(me, conversationId), getConversation(partner, conversationId)]);
  emitTo(userRoom(partner.id), 'chat:message', { conversationId, message: payload, conversation: theirSummary });
  emitTo(userRoom(me.id), 'chat:message', { conversationId, message: payload, conversation: mineSummary });
  await Promise.all([
    pushUnread(partner.id),
    // Header notification (bell + sound), one per message, opening the conversation directly.
    notify(partner.id, { type: CHAT_NOTIFICATION, title: me.name, message: preview(body), link: chatLink(partner, conversationId) }),
  ]);
};

const editMessage = async (me, messageId, { body }) => {
  const m = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  // Only the sender may edit, and only while they are still a participant.
  if (!m || m.senderId !== me.id) throw ApiError.notFound('Message not found');
  const { partner } = await loadMembership(me.id, m.conversationId);
  if (m.body === body) return toMessage(m);
  const updated = await prisma.chatMessage.update({ where: { id: messageId }, data: { body, editedAt: new Date() } });
  const payload = toMessage(updated);
  emitTo(userRoom(partner.id), 'chat:message-updated', { conversationId: m.conversationId, message: payload });
  emitTo(userRoom(me.id), 'chat:message-updated', { conversationId: m.conversationId, message: payload });
  return payload;
};

/** The user opened the conversation: everything the partner sent so far becomes READ. */
const markRead = async (me, conversationId) => {
  const { partner } = await loadMembership(me.id, conversationId);
  const now = new Date();
  // Only up to `now`: the sender is told "read up to now", so a message arriving in between must stay
  // unread here (the next markRead picks it up and reports it), otherwise its blue ticks never show.
  const incoming = { conversationId, senderId: { not: me.id }, readAt: null, createdAt: { lte: now } };
  const [, read] = await prisma.$transaction([
    prisma.chatMessage.updateMany({ where: { ...incoming, deliveredAt: null }, data: { deliveredAt: now } }),
    prisma.chatMessage.updateMany({ where: incoming, data: { readAt: now } }),
  ]);
  if (read.count > 0 && partner) emitTo(userRoom(partner.id), 'chat:status', { conversationId, status: 'READ', upTo: now });
  await readChatNotifications(me, conversationId);
  const unread = await unreadTotal(me.id);
  emitTo(userRoom(me.id), 'chat:unread', unread);
  return { conversationId, readAt: now, ...unread };
};

/** Marks every message waiting for this user as delivered and tells each sender (called when they come online). */
const markDelivered = async (userId) => {
  const waiting = await prisma.chatMessage.findMany({
    where: { deliveredAt: null, senderId: { not: userId }, conversation: { participants: { some: { userId } } } },
    select: { conversationId: true, senderId: true },
    distinct: ['conversationId'],
  });
  if (!waiting.length) return 0;
  const now = new Date();
  const res = await prisma.chatMessage.updateMany({
    where: { deliveredAt: null, senderId: { not: userId }, createdAt: { lte: now }, conversationId: { in: waiting.map((w) => w.conversationId) } },
    data: { deliveredAt: now },
  });
  for (const w of waiting) emitTo(userRoom(w.senderId), 'chat:status', { conversationId: w.conversationId, status: 'DELIVERED', upTo: now });
  return res.count;
};

/** "Clear chat": hides every message so far for this user only. The other person keeps theirs. */
const clearConversation = async (me, conversationId) => {
  const { me: participant } = await loadMembership(me.id, conversationId);
  await prisma.chatParticipant.update({ where: { id: participant.id }, data: { clearedAt: new Date() } });
  await readChatNotifications(me, conversationId);
  await pushUnread(me.id);
  return { conversationId, cleared: true };
};

/** "Delete chat": clears it and removes it from this user's list until a new message arrives. */
const deleteConversation = async (me, conversationId) => {
  const { me: participant } = await loadMembership(me.id, conversationId);
  const now = new Date();
  await prisma.chatParticipant.update({ where: { id: participant.id }, data: { clearedAt: now, deletedAt: now } });
  await readChatNotifications(me, conversationId);
  await pushUnread(me.id);
  return { conversationId, deleted: true };
};

/** Users who share a conversation with this user (who should hear about their presence). */
const partnersOf = async (userId) => {
  const rows = await prisma.chatParticipant.findMany({
    where: { userId: { not: userId }, conversation: { participants: { some: { userId } } } },
    select: { userId: true },
  });
  return [...new Set(rows.map((r) => r.userId))];
};

/** Is this user a participant of the conversation? Returns the partner's id, or null. */
const partnerIn = async (userId, conversationId) => {
  const rows = await prisma.chatParticipant.findMany({ where: { conversationId }, select: { userId: true } });
  if (!rows.some((r) => r.userId === userId)) return null;
  return rows.find((r) => r.userId !== userId)?.userId || null;
};

module.exports = {
  contacts,
  listConversations,
  openConversation,
  getConversation,
  listMessages,
  sendMessage,
  editMessage,
  markRead,
  markDelivered,
  clearConversation,
  deleteConversation,
  unreadTotal,
  partnersOf,
  partnerIn,
  pairKeyOf,
};