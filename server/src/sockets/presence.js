/**
 * In-memory online presence: how many sockets each user has open, and when they were last seen.
 * Good for a single API instance; with several instances behind a load balancer this would move
 * to a shared store (e.g. Redis) together with a Socket.IO adapter.
 */
const connections = new Map(); // userId → open socket count
const lastSeen = new Map(); // userId → Date of last disconnect

/** Returns true when this is the user's first open connection (they just came online). */
const connect = (userId) => {
  const n = (connections.get(userId) || 0) + 1;
  connections.set(userId, n);
  return n === 1;
};

/** Returns true when the user's last connection closed (they just went offline). */
const disconnect = (userId) => {
  const n = (connections.get(userId) || 1) - 1;
  if (n > 0) {
    connections.set(userId, n);
    return false;
  }
  connections.delete(userId);
  lastSeen.set(userId, new Date());
  return true;
};

const isOnline = (userId) => connections.has(userId);
const presenceOf = (userId) => ({ online: isOnline(userId), lastSeenAt: lastSeen.get(userId) || null });

module.exports = { connect, disconnect, isOnline, presenceOf };