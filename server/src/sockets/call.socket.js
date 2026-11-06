const crypto = require('node:crypto');
const { z } = require('zod');
const config = require('../config');
const logger = require('../config/logger');
const presence = require('./presence');
const state = require('./callState');
const { emitTo, userRoom } = require('./io');
const calls = require('../modules/calls/calls.service');

/**
 * Voice & video call signalling over the existing Socket.IO connection.
 * Audio and video never pass through here: they flow over WebRTC, directly between the two browsers
 * or through the TURN server. This only coordinates who calls whom and relays the WebRTC handshake.
 *
 * client → server (each with an acknowledgement callback):
 *   call:start   { conversationId, type: 'VOICE'|'VIDEO' }  → { ok, call } | { ok:false, code: BUSY | ALREADY_IN_CALL | FORBIDDEN | ... }
 *   call:accept  { callId }      call:reject { callId }      call:hangup { callId }
 *   call:signal  { callId, gen, data: offer | answer | candidate | media }
 *   call:rejoin  { callId }      after a page refresh or a reconnected socket
 *   call:restart { callId }      the WebRTC connection failed (network change): set it up again
 *
 * server → client:
 *   call:incoming, call:ringing, call:accepted, call:answered-elsewhere, call:signal,
 *   call:renegotiate, call:peer-reconnecting, call:ended, call:log
 *
 * Rules: only the two people of the conversation, only if they may message each other
 * (chat.permissions.js), one call per person at a time, and signalling is only relayed between
 * the two browser tabs that actually joined the call.
 */

const callId = z.object({ callId: z.string().uuid() });
const startSchema = z.object({ conversationId: z.string().uuid(), type: z.enum(['VOICE', 'VIDEO']) });
const signalSchema = z.object({
  callId: z.string().uuid(),
  gen: z.number().int().min(0),
  data: z.discriminatedUnion('type', [
    z.object({ type: z.literal('offer'), sdp: z.string().max(200_000) }),
    z.object({ type: z.literal('answer'), sdp: z.string().max(200_000) }),
    z.object({
      type: z.literal('candidate'),
      candidate: z
        .object({
          candidate: z.string().max(2000),
          sdpMid: z.string().max(64).nullable().optional(),
          sdpMLineIndex: z.number().int().min(0).max(64).nullable().optional(),
          usernameFragment: z.string().max(256).nullable().optional(),
        })
        .nullable(),
    }),
    z.object({ type: z.literal('media'), audio: z.boolean(), video: z.boolean() }),
  ]),
});

const MAX_RESTARTS = 10;
const reply = (ack, payload) => typeof ack === 'function' && ack(payload);

/** What a client needs to know about a call it is part of. */
const publicCall = (call, viewerId) => ({
  id: call.id,
  conversationId: call.conversationId,
  type: call.type,
  status: call.status,
  isCaller: call.caller.id === viewerId,
  partner: state.otherOf(call, viewerId),
  gen: call.gen,
  startedAt: call.startedAt,
  answeredAt: call.answeredAt,
});

/** Database writes for one call run one after another, in the background. */
const persist = (call, data) => {
  call.saved = (call.saved || Promise.resolve()).catch(() => null).then(() => calls.saveCall(call.id, data));
  return call.saved;
};

const toSocket = (io, socketId, event, payload) => socketId && io.to(socketId).emit(event, payload);

/** Ends a call for everyone (all tabs of both people), records it and posts the call entry / missed call. */
const finish = (io, call, status, reason) => {
  if (state.get(call.id) !== call) return; // already finished
  state.remove(call);
  const endedAt = new Date();
  const duration = call.answeredAt ? Math.max(0, Math.round((endedAt - call.answeredAt) / 1000)) : 0;
  const payload = { callId: call.id, conversationId: call.conversationId, status, reason, duration };
  emitTo(userRoom(call.caller.id), 'call:ended', payload);
  emitTo(userRoom(call.receiver.id), 'call:ended', payload);
  persist(call, { status, endReason: reason, endedAt, duration })
    .then((saved) => saved && calls.announceFinished(saved, { caller: call.caller, receiver: call.receiver }))
    .catch((err) => logger.warn(`call ${call.id}: finishing failed: ${err.message}`));
};

/** Rings the receiver (every open tab, or one socket that just came online). */
const ring = (io, call, target = userRoom(call.receiver.id)) => {
  io.to(target).emit('call:incoming', { call: { id: call.id, conversationId: call.conversationId, type: call.type, startedAt: call.startedAt }, caller: call.caller });
  if (call.status === 'CALLING') {
    call.status = 'RINGING';
    persist(call, { status: 'RINGING' });
    toSocket(io, call.sockets[call.caller.id], 'call:ringing', { callId: call.id });
  }
};

/** Both sides set up a fresh WebRTC connection (after a refresh, reconnect or network change). */
const renegotiate = (io, call) => {
  call.gen += 1;
  for (const u of [call.caller, call.receiver]) toSocket(io, call.sockets[u.id], 'call:renegotiate', { callId: call.id, gen: call.gen });
};

module.exports = (io, socket) => {
  const me = socket.data.user;

  // This device came online (or reloaded) while someone is calling: let it ring too.
  for (const call of state.ringingFor(me.id)) ring(io, call, socket.id);

  socket.on('call:start', (payload, ack) =>
    startCall(payload, ack).catch((err) => {
      // Never crash the server over one call (e.g. database unreachable).
      logger.warn(`call:start failed for ${me.id}: ${err.message}`);
      const stuck = state.ofUser(me.id);
      if (stuck && stuck.caller.id === me.id && stuck.status === 'CALLING') state.remove(stuck);
      reply(ack, { ok: false, code: 'FAILED' });
    })
  );

  const startCall = async (payload, ack) => {
    const parsed = startSchema.safeParse(payload);
    if (!parsed.success) return reply(ack, { ok: false, code: 'INVALID' });
    const { conversationId, type } = parsed.data;
    if (state.isBusy(me.id)) return reply(ack, { ok: false, code: 'ALREADY_IN_CALL' });

    let partner;
    try {
      partner = await calls.callablePartner(me, conversationId);
    } catch (err) {
      return reply(ack, { ok: false, code: err.statusCode === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: err.message });
    }
    // Checked again after the await, and reserved with no await in between: no double calls.
    if (state.isBusy(me.id)) return reply(ack, { ok: false, code: 'ALREADY_IN_CALL' });
    const caller = calls.toPerson(me);
    const receiver = calls.toPerson(partner);
    const id = crypto.randomUUID();
    const base = { id, conversationId, callerId: me.id, receiverId: partner.id, type };

    if (state.isBusy(partner.id)) {
      calls
        .createCall({ ...base, status: 'BUSY' })
        .then((saved) => calls.saveCall(id, { endReason: 'BUSY' }).then((s) => calls.announceFinished(s || saved, { caller, receiver })))
        .catch((err) => logger.warn(`call ${id}: could not record busy call: ${err.message}`));
      return reply(ack, { ok: false, code: 'BUSY' });
    }

    const call = { id, conversationId, type, caller, receiver, status: 'CALLING', sockets: { [me.id]: socket.id, [partner.id]: null }, startedAt: new Date(), answeredAt: null, gen: 0, restarts: 0, timers: {} };
    state.add(call);
    call.saved = calls.createCall(base);
    try {
      await call.saved;
    } catch (err) {
      logger.warn(`call ${id}: could not be created: ${err.message}`);
      state.remove(call);
      return reply(ack, { ok: false, code: 'FAILED' });
    }
    if (state.get(id) !== call) return reply(ack, { ok: false, code: 'ENDED' }); // hung up meanwhile

    state.setTimer(call, 'ring', config.calls.ringTimeoutMs, () => finish(io, call, 'MISSED', 'NO_ANSWER'));
    if (presence.isOnline(partner.id)) ring(io, call);
    reply(ack, { ok: true, call: publicCall(call, me.id) });
  };

  socket.on('call:accept', (payload, ack) => {
    const parsed = callId.safeParse(payload);
    const call = parsed.success && state.get(parsed.data.callId);
    if (!call || call.receiver.id !== me.id) return reply(ack, { ok: false, code: 'ENDED' });
    if (call.status === 'ACCEPTED') return reply(ack, { ok: false, code: 'ANSWERED_ELSEWHERE' });
    state.clearTimer(call, 'ring');
    call.status = 'ACCEPTED';
    call.answeredAt = new Date();
    call.sockets[me.id] = socket.id;
    persist(call, { status: 'ACCEPTED', answeredAt: call.answeredAt });
    socket.to(userRoom(me.id)).emit('call:answered-elsewhere', { callId: call.id }); // my other tabs stop ringing
    toSocket(io, call.sockets[call.caller.id], 'call:accepted', { callId: call.id, gen: call.gen, answeredAt: call.answeredAt });
    reply(ack, { ok: true, call: publicCall(call, me.id) });
  });

  socket.on('call:reject', (payload, ack) => {
    const parsed = callId.safeParse(payload);
    const call = parsed.success && state.get(parsed.data.callId);
    if (call && call.receiver.id === me.id && call.status !== 'ACCEPTED') finish(io, call, 'REJECTED', 'DECLINED');
    reply(ack, { ok: true });
  });

  socket.on('call:hangup', (payload, ack) => {
    const parsed = callId.safeParse(payload);
    const call = parsed.success && state.get(parsed.data.callId);
    if (call && state.isParty(call, me.id)) {
      if (call.status === 'ACCEPTED') finish(io, call, 'ENDED', 'HANGUP');
      else if (call.caller.id === me.id) finish(io, call, 'CANCELLED', 'CANCELLED');
      else finish(io, call, 'REJECTED', 'DECLINED');
    }
    reply(ack, { ok: true });
  });

  socket.on('call:signal', (payload) => {
    const parsed = signalSchema.safeParse(payload);
    if (!parsed.success) return;
    const { callId: id, gen, data } = parsed.data;
    const call = state.get(id);
    // Only the tab that joined the call, only for the current connection attempt.
    if (!call || call.status !== 'ACCEPTED' || call.sockets[me.id] !== socket.id || gen !== call.gen) return;
    const other = state.otherOf(call, me.id);
    toSocket(io, call.sockets[other.id], 'call:signal', { callId: id, gen, data });
  });

  socket.on('call:restart', (payload) => {
    const parsed = callId.safeParse(payload);
    const call = parsed.success && state.get(parsed.data.callId);
    if (!call || call.status !== 'ACCEPTED' || call.sockets[me.id] !== socket.id) return;
    call.restarts += 1;
    if (call.restarts > MAX_RESTARTS) return finish(io, call, 'ENDED', 'FAILED');
    renegotiate(io, call);
  });

  socket.on('call:rejoin', (payload, ack) => {
    const parsed = callId.safeParse(payload);
    const call = parsed.success && state.get(parsed.data.callId);
    if (!call || !state.isParty(call, me.id)) return reply(ack, { ok: false, code: 'ENDED' });
    const isCaller = call.caller.id === me.id;
    if (call.status !== 'ACCEPTED') {
      // The receiver's tabs are rung again by the connection handler above.
      if (!isCaller) return reply(ack, { ok: false, code: 'RINGING' });
      call.sockets[me.id] = socket.id;
      state.clearTimer(call, `grace:${me.id}`);
      return reply(ack, { ok: true, call: publicCall(call, me.id) });
    }
    // A reloaded tab (or a reconnected one) takes the call over; the old connection is dropped.
    const previous = call.sockets[me.id];
    if (previous && previous !== socket.id) toSocket(io, previous, 'call:moved', { callId: call.id });
    call.sockets[me.id] = socket.id;
    state.clearTimer(call, `grace:${me.id}`);
    reply(ack, { ok: true, call: publicCall(call, me.id) });
    renegotiate(io, call);
  });

  socket.on('disconnect', () => {
    const call = state.ofUser(me.id);
    if (!call || call.sockets[me.id] !== socket.id) return;
    // Refresh, closed laptop lid, lost signal…: wait a little for this person to come back.
    call.sockets[me.id] = null;
    const other = state.otherOf(call, me.id);
    if (call.status === 'ACCEPTED') toSocket(io, call.sockets[other.id], 'call:peer-reconnecting', { callId: call.id });
    state.setTimer(call, `grace:${me.id}`, config.calls.reconnectGraceMs, () => {
      if (call.status === 'ACCEPTED') finish(io, call, 'ENDED', 'DISCONNECTED');
      else finish(io, call, 'CANCELLED', 'DISCONNECTED');
    });
  });
};