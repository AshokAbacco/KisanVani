import { translate } from '../i18n';
import { humanize } from '../utils/format';

// Tone per status, used by <StatusBadge>. Tones map to colour classes in the badge component.
export const STATUS_TONES = {
  // users
  ACTIVE: 'green',
  PENDING_APPROVAL: 'amber',
  SUSPENDED: 'red',
  DEACTIVATED: 'grey',
  // listings & lots
  DRAFT: 'grey',
  AVAILABLE: 'green',
  PAUSED: 'amber',
  SOLD_OUT: 'blue',
  COMPLETED: 'grey',
  CLOSED: 'grey',
  // orders
  PLACED: 'amber',
  ACCEPTED: 'blue',
  REJECTED: 'red',
  PREPARING: 'blue',
  READY: 'blue',
  DISPATCHED: 'violet',
  DELIVERED: 'green',
  RECEIVED: 'green',
  CANCELLED: 'red',
  // trips
  ASSIGNED: 'amber',
  PICKED_UP: 'violet',
  IN_TRANSIT: 'violet',
  FAILED: 'red',
  // requests
  OPEN: 'amber',
  // payments / settlements / verification
  UNPAID: 'red',
  PARTIAL: 'amber',
  PAID: 'green',
  PENDING: 'amber',
  VERIFIED: 'green',
  REFUNDED: 'grey',
  ORDERED: 'amber',
};

export const ORDER_STEPS = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'RECEIVED'];
export const TRIP_STEPS = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
export const TRIP_ACTIVE = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
export const TRIP_TRACKABLE = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];

/**
 * Objects whose values are read in the active language at the moment they are used.
 * Object.entries / spread / property access all go through the getters.
 */
const labelMap = (ns, english) =>
  Object.defineProperties(
    {},
    Object.fromEntries(Object.entries(english).map(([k, en]) => [k, { enumerable: true, get: () => translate(`${ns}.${k}`, en) }]))
  );
const labelOptions = (ns, english) =>
  Object.entries(english).map(([value, en]) => ({
    value,
    get label() {
      return translate(`${ns}.${value}`, en);
    },
  }));

export const ORDER_TYPE_LABELS = labelMap('orderType', {
  SHOP_FROM_FARMER: 'Shop ← Farmer',
  SHOP_FROM_MANDI: 'Shop ← Market Mandi',
  MANDI_FROM_FARMER: 'Market Mandi ← Farmer',
});

export const VEHICLE_TYPES = labelOptions('enums', {
  TRACTOR: 'Tractor',
  MINI_TRUCK: 'Mini truck',
  TEMPO: 'Tempo',
  PICKUP: 'Pickup',
  TRUCK: 'Truck',
  OTHER: 'Other',
});

export const CATEGORY_TYPES = labelOptions('categoryType', {
  VEGETABLE: 'Vegetables',
  FRUIT: 'Fruits',
  LEAFY_GREEN: 'Leafy greens',
  GRAIN: 'Grains',
  PULSE: 'Pulses',
  SPICE: 'Spices',
  OTHER: 'Other',
});

export const PAYMENT_PURPOSES = labelMap('paymentPurpose', {
  SALE_INVOICE: 'POS sale',
  CREDIT_COLLECTION: 'Udhar collection',
  ORDER: 'Order payment',
  SUPPLIER_PURCHASE: 'Supplier purchase',
  TRANSPORT: 'Transport charge',
});

/** Status / enum code in the active language: "IN_TRANSIT" → "In transit" / "रास्ते में" … */
export const statusLabel = (code) => humanize(code);
