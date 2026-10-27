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

export const ORDER_TYPE_LABELS = {
  SHOP_FROM_FARMER: 'Shop ← Farmer',
  SHOP_FROM_MANDI: 'Shop ← Market Mandi',
  MANDI_FROM_FARMER: 'Market Mandi ← Farmer',
};

export const VEHICLE_TYPES = [
  { value: 'TRACTOR', label: 'Tractor' },
  { value: 'MINI_TRUCK', label: 'Mini truck' },
  { value: 'TEMPO', label: 'Tempo' },
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'TRUCK', label: 'Truck' },
  { value: 'OTHER', label: 'Other' },
];

export const CATEGORY_TYPES = [
  { value: 'VEGETABLE', label: 'Vegetables' },
  { value: 'FRUIT', label: 'Fruits' },
  { value: 'LEAFY_GREEN', label: 'Leafy greens' },
  { value: 'GRAIN', label: 'Grains' },
  { value: 'PULSE', label: 'Pulses' },
  { value: 'SPICE', label: 'Spices' },
  { value: 'OTHER', label: 'Other' },
];

export const PAYMENT_PURPOSES = {
  SALE_INVOICE: 'POS sale',
  CREDIT_COLLECTION: 'Udhar collection',
  ORDER: 'Order payment',
  SUPPLIER_PURCHASE: 'Supplier purchase',
  TRANSPORT: 'Transport charge',
};
