const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  SHOPKEEPER: 'SHOPKEEPER',
  FARMER: 'FARMER',
  MANDI_OWNER: 'MANDI_OWNER',
  DRIVER: 'DRIVER',
});

const SELF_REGISTER_ROLES = [ROLES.SHOPKEEPER, ROLES.FARMER, ROLES.MANDI_OWNER, ROLES.DRIVER];

const ROLE_LABELS = Object.freeze({
  ADMIN: 'Admin',
  SHOPKEEPER: 'Shopkeeper',
  FARMER: 'Farmer',
  MANDI_OWNER: 'Market Mandi Owner',
  DRIVER: 'Driver',
});

/**
 * Order lifecycle. Each transition lists which party may perform it.
 *  PLACED → ACCEPTED | REJECTED (seller) | CANCELLED (buyer)
 *  ACCEPTED → PREPARING (seller) | CANCELLED (buyer or seller, with reason)
 *  PREPARING → READY (seller) | CANCELLED (seller, with reason)
 *  READY → DISPATCHED (seller, or automatically when a linked trip is picked up)
 *  DISPATCHED → DELIVERED (seller, or automatically when a linked trip is delivered)
 *  DELIVERED → RECEIVED (buyer confirms received quantities; stock & settlement are created)
 */
const ORDER_TRANSITIONS = Object.freeze({
  PLACED: { ACCEPTED: ['SELLER'], REJECTED: ['SELLER'], CANCELLED: ['BUYER'] },
  ACCEPTED: { PREPARING: ['SELLER'], CANCELLED: ['BUYER', 'SELLER'] },
  PREPARING: { READY: ['SELLER'], CANCELLED: ['SELLER'] },
  READY: { DISPATCHED: ['SELLER'] },
  DISPATCHED: { DELIVERED: ['SELLER'] },
  DELIVERED: { RECEIVED: ['BUYER'] },
  REJECTED: {},
  CANCELLED: {},
  RECEIVED: {},
});

const ORDER_RELEASES_STOCK = ['REJECTED', 'CANCELLED'];

/**
 * Trip lifecycle: ASSIGNED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED
 * Side branches: REJECTED (driver, from ASSIGNED), CANCELLED (assigner/requester/admin before pickup),
 * FAILED (driver, from PICKED_UP or IN_TRANSIT). Reasons are mandatory for side branches.
 */
const TRIP_TRANSITIONS = Object.freeze({
  ASSIGNED: { ACCEPTED: ['DRIVER'], REJECTED: ['DRIVER'], CANCELLED: ['MANAGER'] },
  ACCEPTED: { PICKED_UP: ['DRIVER'], CANCELLED: ['MANAGER', 'DRIVER'] },
  PICKED_UP: { IN_TRANSIT: ['DRIVER'], FAILED: ['DRIVER'] },
  IN_TRANSIT: { DELIVERED: ['DRIVER'], FAILED: ['DRIVER'] },
  DELIVERED: {},
  REJECTED: {},
  FAILED: {},
  CANCELLED: {},
});

const TRIP_REASON_REQUIRED = ['REJECTED', 'CANCELLED', 'FAILED'];
const TRIP_TRACKABLE_STATUSES = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
const TRIP_ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
const TRIP_TERMINAL_STATUSES = ['DELIVERED', 'REJECTED', 'FAILED', 'CANCELLED'];

const DEFAULT_SETTINGS = Object.freeze({
  'platform.name': { value: 'KisanVani', isPublic: true, description: 'Platform display name' },
  'platform.supportEmail': { value: 'info.kisanvani@gmail.com', isPublic: true, description: 'Support e-mail shown to users' },
  'platform.supportPhone': { value: '+91 91879 23213', isPublic: true, description: 'Support phone shown to users' },
  'auth.approvalRequiredRoles': {
    value: ['MANDI_OWNER', 'DRIVER'],
    isPublic: false,
    description: 'Self-registered roles that need admin approval before login',
  },
  'billing.maxDiscountPercent': { value: 10, isPublic: true, description: 'Maximum discount a shop may give on a bill (%)' },
  'billing.weighingScale': {
    value: { enabled: false, baudRate: 9600 },
    isPublic: true,
    description: 'Optional Web Serial weighing scale integration on the POS',
  },
  'tracking.locationIntervalSec': { value: 15, isPublic: true, description: 'How often drivers share GPS during active trips' },
  'tracking.staleAfterSec': { value: 120, isPublic: true, description: 'After this many seconds a driver location is shown as stale' },
  'map.tileUrl': {
    value: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    isPublic: true,
    description: 'Leaflet tile URL template',
  },
  'map.attribution': {
    value: '&copy; OpenStreetMap contributors',
    isPublic: true,
    description: 'Attribution required by the tile provider',
  },
  'orders.platformFeePercent': { value: 0, isPublic: true, description: 'Platform service fee deducted from seller settlements (%)' },
});

module.exports = {
  ROLES,
  ROLE_LABELS,
  SELF_REGISTER_ROLES,
  ORDER_TRANSITIONS,
  ORDER_RELEASES_STOCK,
  TRIP_TRANSITIONS,
  TRIP_REASON_REQUIRED,
  TRIP_TRACKABLE_STATUSES,
  TRIP_ACTIVE_STATUSES,
  TRIP_TERMINAL_STATUSES,
  DEFAULT_SETTINGS,
};
