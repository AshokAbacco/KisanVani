/**
 * Who may chat with whom. This is the single source of truth for the API and the socket layer;
 * the client only mirrors it for display.
 *
 *   ADMIN        → everyone
 *   MANDI_OWNER  → FARMER, DRIVER
 *   SHOPKEEPER   → FARMER, DRIVER
 *   FARMER       → SHOPKEEPER, MANDI_OWNER, DRIVER
 *   DRIVER       → SHOPKEEPER, MANDI_OWNER, FARMER
 *
 * Non-admins cannot start a chat with an admin, but they can reply in a conversation an admin opened.
 */
const CHAT_CONTACTS = Object.freeze({
  ADMIN: ['ADMIN', 'FARMER', 'SHOPKEEPER', 'MANDI_OWNER', 'DRIVER'],
  MANDI_OWNER: ['FARMER', 'DRIVER'],
  SHOPKEEPER: ['FARMER', 'DRIVER'],
  FARMER: ['SHOPKEEPER', 'MANDI_OWNER', 'DRIVER'],
  DRIVER: ['SHOPKEEPER', 'MANDI_OWNER', 'FARMER'],
});

/** Roles this user may find in "New chat" and start a conversation with. */
const contactRoles = (role) => CHAT_CONTACTS[role] || [];

/** May `me` open a new conversation with `other`? */
const canStartChat = (me, other) => !!other && other.id !== me.id && other.status === 'ACTIVE' && contactRoles(me.role).includes(other.role);

/** May `me` send a message to `other` inside an existing conversation? */
const canSendTo = (me, other) =>
  !!other && other.id !== me.id && other.status === 'ACTIVE' && (contactRoles(me.role).includes(other.role) || me.role === 'ADMIN' || other.role === 'ADMIN');

module.exports = { CHAT_CONTACTS, contactRoles, canStartChat, canSendTo };
