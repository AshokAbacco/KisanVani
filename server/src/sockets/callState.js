/**
 * Calls in progress, kept in memory (like presence.js): who is in a call (busy detection), which
 * browser tab carries each side of the call, and the ring / reconnect timers.
 *
 * Good for a single API instance. With several instances this would move to a shared store
 * (e.g. Redis) together with a Socket.IO adapter.
 *
 * Call shape:
 * {
 *   id, conversationId, type: 'VOICE'|'VIDEO',
 *   caller: { id, name, role, avatarUrl }, receiver: { ... },
 *   status: 'CALLING' (receiver not reached yet) | 'RINGING' | 'ACCEPTED',
 *   sockets: { [userId]: socketId | null },   // the tab that carries each side once it has joined
 *   startedAt: Date, answeredAt: Date | null,
 *   gen: number,                               // bumps on every renegotiation (refresh, network change)
 *   restarts: number,
 *   timers: { ring?: Timeout, [`grace:${userId}`]?: Timeout },
 * }
 */
const calls = new Map(); // callId → call
const userCall = new Map(); // userId → callId (one call per user at a time)

const get = (callId) => calls.get(callId) || null;
const ofUser = (userId) => {
  const id = userCall.get(userId);
  return id ? calls.get(id) || null : null;
};
const isBusy = (userId) => userCall.has(userId);

/** Reserves both people for this call. Call only after checking isBusy() for both, with no await in between. */
const add = (call) => {
  calls.set(call.id, call);
  userCall.set(call.caller.id, call.id);
  userCall.set(call.receiver.id, call.id);
};

const remove = (call) => {
  Object.values(call.timers).forEach(clearTimeout);
  call.timers = {};
  calls.delete(call.id);
  for (const u of [call.caller.id, call.receiver.id]) if (userCall.get(u) === call.id) userCall.delete(u);
};

const clearTimer = (call, key) => {
  clearTimeout(call.timers[key]);
  delete call.timers[key];
};

const setTimer = (call, key, ms, fn) => {
  clearTimer(call, key);
  call.timers[key] = setTimeout(fn, ms);
};

const otherOf = (call, userId) => (call.caller.id === userId ? call.receiver : call.caller);
const isParty = (call, userId) => call.caller.id === userId || call.receiver.id === userId;

/** Every call where `userId` is the receiver and it is still ringing (for devices that come online). */
const ringingFor = (userId) => [...calls.values()].filter((c) => c.receiver.id === userId && c.status !== 'ACCEPTED');

module.exports = { get, ofUser, isBusy, add, remove, setTimer, clearTimer, otherOf, isParty, ringingFor, _calls: calls };