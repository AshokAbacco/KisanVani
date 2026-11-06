const crypto = require('node:crypto');
const prisma = require('../../config/prisma');
const config = require('../../config');
const logger = require('../../config/logger');
const ApiError = require('../../utils/ApiError');
const { canSendTo } = require('../chat/chat.permissions');
const { notify } = require('../../services/notification.service');
const { emitTo, userRoom } = require('../../sockets/io');

/**
 * Voice & video calls: database records, call history and the ICE (STUN/TURN) server list.
 * The live call itself is coordinated in sockets/call.socket.js.
 */

const PERSON = { id: true, name: true, role: true, avatarUrl: true, status: true };
const ROLE_BASE = { ADMIN: '/admin', SHOPKEEPER: '/shop', FARMER: '/farmer', MANDI_OWNER: '/mandi', DRIVER: '/driver' };
const FINAL = ['REJECTED', 'MISSED', 'BUSY', 'CANCELLED', 'ENDED'];

const toPerson = (u) => ({ id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl || null });

/** A call as seen by `viewerId` (direction is relative to them). */
const toCall = (c, viewerId) => ({
  id: c.id,
  conversationId: c.conversationId,
  type: c.callType,
  status: c.status,
  endReason: c.endReason || null,
  direction: c.callerId === viewerId ? 'OUTGOING' : 'INCOMING',
  callerId: c.callerId,
  receiverId: c.receiverId,
  startedAt: c.startedAt,
  answeredAt: c.answeredAt,
  endedAt: c.endedAt,
  duration: c.duration,
  createdAt: c.createdAt,
});

/**
 * The other person of a conversation, if `me` belongs to it and is allowed to call them
 * (same rules as sending a message: chat.permissions.js).
 */
const callablePartner = async (me, conversationId) => {
  const parts = await prisma.chatParticipant.findMany({ where: { conversationId }, include: { user: { select: PERSON } } });
  if (!parts.some((p) => p.userId === me.id)) throw ApiError.notFound('Conversation not found');
  const partner = parts.find((p) => p.userId !== me.id)?.user;
  if (!partner) throw ApiError.notFound('Conversation not found');
  if (!canSendTo(me, partner)) throw ApiError.forbidden('You cannot call this user');
  return partner;
};

// async: any error (even a missing Prisma model) becomes a rejected promise, never a crash.
const createCall = async ({ id, conversationId, callerId, receiverId, type, status = 'INITIATED' }) =>
  prisma.call.create({ data: { id, conversationId, callerId, receiverId, callType: type, status, ...(FINAL.includes(status) ? { endedAt: new Date() } : {}) } });

/** Status changes are written in the background: the live call never waits for the database. */
const saveCall = async (id, data) =>
  Promise.resolve()
    .then(() => prisma.call.update({ where: { id }, data }))
    .catch((err) => {
      logger.warn(`call ${id}: could not save ${JSON.stringify(data)}: ${err.message}`);
      return null;
    });

const chatLink = (user, conversationId) => `${ROLE_BASE[user.role] || ''}/chat/${conversationId}`;

/**
 * A call has finished: tell both chat windows (call entry in the conversation) and, for a call the
 * receiver never picked up, put a "missed call" in their notification bell.
 */
const announceFinished = async (call, { caller, receiver }) => {
  for (const viewer of [caller, receiver]) emitTo(userRoom(viewer.id), 'call:log', { conversationId: call.conversationId, call: toCall(call, viewer.id) });
  if (['MISSED', 'CANCELLED', 'BUSY'].includes(call.status)) {
    await notify(receiver.id, {
      type: 'CALL_MISSED',
      title: caller.name,
      message: call.callType === 'VIDEO' ? 'Missed video call' : 'Missed voice call',
      link: chatLink(receiver, call.conversationId),
    });
  }
};

/** Call history of one conversation (newest first), hiding calls before "clear chat". */
const history = async (me, { conversationId, before, limit = 50 }) => {
  const part = await prisma.chatParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId: me.id } } });
  if (!part) throw ApiError.notFound('Conversation not found');
  const createdAt = {};
  if (part.clearedAt) createdAt.gt = part.clearedAt;
  if (before) createdAt.lt = before;
  const calls = await prisma.call.findMany({
    where: { conversationId, status: { in: FINAL }, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return calls.map((c) => toCall(c, me.id));
};

/* ───────── ICE servers (STUN / TURN) ───────── */

let cloudflareCache = null; // { servers, until }

const cloudflareServers = async () => {
  const { cloudflareKeyId, cloudflareToken, turnTtlSec } = config.calls;
  if (cloudflareCache && cloudflareCache.until > Date.now()) return cloudflareCache.servers;
  const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${cloudflareKeyId}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cloudflareToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: turnTtlSec }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Cloudflare TURN responded ${res.status}`);
  const body = await res.json();
  const servers = Array.isArray(body.iceServers) ? body.iceServers : [body.iceServers];
  cloudflareCache = { servers, until: Date.now() + (turnTtlSec * 1000) / 2 };
  return servers;
};

/**
 * STUN + TURN servers for RTCPeerConnection. TURN credentials are never stored in the client:
 *  - TURN_SECRET (coturn use-auth-secret): a short-lived username/password made for this user;
 *  - TURN_USERNAME + TURN_CREDENTIAL: fixed credentials (e.g. a hosted TURN service);
 *  - CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_API_TOKEN: Cloudflare Realtime TURN.
 */
const iceServers = async (me) => {
  const c = config.calls;
  const servers = [];
  if (c.stunUrls.length) servers.push({ urls: c.stunUrls });
  if (c.cloudflareKeyId && c.cloudflareToken) {
    try {
      servers.push(...(await cloudflareServers()));
    } catch (err) {
      logger.warn(`TURN (Cloudflare) unavailable: ${err.message}`);
    }
  }
  if (c.turnUrls.length) {
    if (c.turnSecret) {
      const username = `${Math.floor(Date.now() / 1000) + c.turnTtlSec}:${me.id}`;
      const credential = crypto.createHmac('sha1', c.turnSecret).update(username).digest('base64');
      servers.push({ urls: c.turnUrls, username, credential });
    } else if (c.turnUsername && c.turnCredential) {
      servers.push({ urls: c.turnUrls, username: c.turnUsername, credential: c.turnCredential });
    }
  }
  const hasTurn = servers.some((s) => [].concat(s.urls).some((u) => /^turns?:/.test(u)));
  return { iceServers: servers, hasTurn, ttlSec: c.turnTtlSec };
};

/** After a server restart no call can still be live: close the ones left open. */
const closeStaleCalls = async () => {
  const now = new Date();
  const [unanswered, answered] = await Promise.all([
    prisma.call.updateMany({ where: { status: { in: ['INITIATED', 'RINGING'] } }, data: { status: 'MISSED', endReason: 'SERVER_RESTART', endedAt: now } }),
    prisma.call.updateMany({ where: { status: 'ACCEPTED' }, data: { status: 'ENDED', endReason: 'SERVER_RESTART', endedAt: now } }),
  ]);
  if (unanswered.count || answered.count) logger.info(`Closed ${unanswered.count + answered.count} call(s) left open by the last run`);
};

module.exports = { PERSON, toPerson, toCall, callablePartner, createCall, saveCall, announceFinished, history, iceServers, closeStaleCalls, FINAL };

