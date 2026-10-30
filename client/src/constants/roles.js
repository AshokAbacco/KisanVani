import { ShieldCheck, Store, Sprout, Warehouse, Truck } from 'lucide-react';
import { translate } from '../i18n';

/**
 * Role metadata. `label`, `shortLabel` and `tagline` are getters, so they always come back in
 * the active language (roleNames / roles / roleTaglines in the locale files) wherever they are shown.
 */
const role = (key, base, icon, english) => ({
  key,
  base,
  icon,
  get label() {
    return translate(`roleNames.${key}`, english.label);
  },
  get shortLabel() {
    return translate(`roles.${key}`, english.shortLabel || english.label);
  },
  get tagline() {
    return translate(`roleTaglines.${key}`, english.tagline);
  },
});

export const ROLES = {
  ADMIN: role('ADMIN', '/admin', ShieldCheck, { label: 'Admin', tagline: 'Run the platform' }),
  SHOPKEEPER: role('SHOPKEEPER', '/shop', Store, { label: 'Shopkeeper', tagline: 'Bill, stock and buy fresh' }),
  FARMER: role('FARMER', '/farmer', Sprout, { label: 'Farmer', tagline: 'Sell your harvest directly' }),
  MANDI_OWNER: role('MANDI_OWNER', '/mandi', Warehouse, { label: 'Market Mandi Owner', shortLabel: 'Market Mandi', tagline: 'Trade wholesale lots' }),
  DRIVER: role('DRIVER', '/driver', Truck, { label: 'Driver', tagline: 'Carry loads, get paid' }),
};

/** Roles shown on the login screen, in the order a visitor most likely is. */
export const LOGIN_ROLES = ['FARMER', 'SHOPKEEPER', 'MANDI_OWNER', 'DRIVER', 'ADMIN'];
export const REGISTER_ROLES = ['FARMER', 'SHOPKEEPER', 'MANDI_OWNER', 'DRIVER'];

export const roleBase = (r) => ROLES[r]?.base || '/';
export const roleLabel = (r) => ROLES[r]?.label || r;
