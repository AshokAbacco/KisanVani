import { ShieldCheck, Store, Sprout, Warehouse, Truck } from 'lucide-react';

export const ROLES = {
  ADMIN: { key: 'ADMIN', label: 'Admin', base: '/admin', icon: ShieldCheck, tagline: 'Run the platform' },
  SHOPKEEPER: { key: 'SHOPKEEPER', label: 'Shopkeeper', base: '/shop', icon: Store, tagline: 'Bill, stock and buy fresh' },
  FARMER: { key: 'FARMER', label: 'Farmer', base: '/farmer', icon: Sprout, tagline: 'Sell your harvest directly' },
  MANDI_OWNER: { key: 'MANDI_OWNER', label: 'Market Mandi Owner', shortLabel: 'Market Mandi', base: '/mandi', icon: Warehouse, tagline: 'Trade wholesale lots' },
  DRIVER: { key: 'DRIVER', label: 'Driver', base: '/driver', icon: Truck, tagline: 'Carry loads, get paid' },
};

/** Roles shown on the login screen, in the order a visitor most likely is. */
export const LOGIN_ROLES = ['FARMER', 'SHOPKEEPER', 'MANDI_OWNER', 'DRIVER', 'ADMIN'];
export const REGISTER_ROLES = ['FARMER', 'SHOPKEEPER', 'MANDI_OWNER', 'DRIVER'];

export const roleBase = (role) => ROLES[role]?.base || '/';
export const roleLabel = (role) => ROLES[role]?.label || role;
