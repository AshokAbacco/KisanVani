import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Truck,
  Wallet,
  Settings,
  Scale,
  Boxes,
  ShoppingCart,
  HandCoins,
  Wheat,
  Route,
  Navigation,
  Car,
  MapPin,
} from 'lucide-react';
import { translate } from '../i18n';

/**
 * Sidebar navigation per role: a short, flat list (5–6 items).
 * Each item can carry `tabs` — related screens shown as a tab strip at the top of the page,
 * so every existing screen stays reachable without crowding the sidebar.
 * The first tab's `to` is where the sidebar item links. `end` = exact-match only.
 * `key` identifies an item/tab; the visible label is translated (dnav.items.<key>, dnav.tabs.<key>).
 */
const RAW_NAV = {
  ADMIN: [
    {
      key: 'dashboard', label: 'Dashboard',
      icon: LayoutDashboard,
      tabs: [
        { to: '/admin', key: 'overview', label: 'Overview', end: true },
        { to: '/admin/reports', key: 'reports', label: 'Reports' },
      ],
    },
    {
      key: 'users', label: 'Users',
      icon: Users,
      tabs: [
        { to: '/admin/users', key: 'allUsers', label: 'All users' },
        { to: '/admin/farmers', key: 'farmers', label: 'Farmers' },
        { to: '/admin/shopkeepers', key: 'shopkeepers', label: 'Shopkeepers' },
        { to: '/admin/mandi-owners', key: 'mandiOwners', label: 'Mandi owners' },
        { to: '/admin/drivers', key: 'drivers', label: 'Drivers' },
      ],
    },
    { key: 'orders', label: 'Orders', icon: ClipboardList, tabs: [{ to: '/admin/orders', key: 'orders', label: 'Orders' }] },
    {
      key: 'transport', label: 'Transport',
      icon: Truck,
      tabs: [
        { to: '/admin/transport', key: 'trips', label: 'Trips' },
        { to: '/admin/vehicles', key: 'vehicles', label: 'Vehicles' },
      ],
    },
    { key: 'payments', label: 'Payments', icon: Wallet, tabs: [{ to: '/admin/payments', key: 'payments', label: 'Payments' }] },
    {
      key: 'platform', label: 'Platform',
      icon: Settings,
      tabs: [
        { to: '/admin/catalog', key: 'productsCategories', label: 'Products & categories' },
        { to: '/admin/settings', key: 'platformSettings', label: 'Platform settings' },
        { to: '/admin/notifications', key: 'broadcast', label: 'Broadcast' },
      ],
    },
  ],
  SHOPKEEPER: [
    {
      key: 'dashboard', label: 'Dashboard',
      icon: LayoutDashboard,
      tabs: [
        { to: '/shop', key: 'overview', label: 'Overview', end: true },
        { to: '/shop/reports', key: 'reports', label: 'Reports' },
      ],
    },
    {
      key: 'billing', label: 'Billing',
      icon: Scale,
      tabs: [
        { to: '/shop/pos', key: 'newBill', label: 'New bill' },
        { to: '/shop/sales', key: 'salesHistory', label: 'Sales history' },
      ],
    },
    {
      key: 'stock', label: 'Stock',
      icon: Boxes,
      tabs: [
        { to: '/shop/stock', key: 'stockRates', label: 'Stock & rates' },
        { to: '/shop/inventory', key: 'inventory', label: 'Inventory' },
        { to: '/shop/purchases', key: 'purchases', label: 'Purchases' },
        { to: '/shop/suppliers', key: 'suppliers', label: 'Suppliers' },
      ],
    },
    {
      key: 'orders', label: 'Orders',
      icon: ShoppingCart,
      tabs: [
        { to: '/shop/orders', key: 'myOrders', label: 'My orders' },
        { to: '/shop/order-farmers', key: 'buyFromFarmers', label: 'Buy from farmers' },
        { to: '/shop/order-mandi', key: 'buyFromMandi', label: 'Buy from mandi' },
        { to: '/shop/transport', key: 'deliveries', label: 'Deliveries' },
      ],
    },
    {
      key: 'khata', label: 'Khata',
      icon: HandCoins,
      tabs: [
        { to: '/shop/credit', key: 'udharKhata', label: 'Udhar / Khata' },
        { to: '/shop/customers', key: 'customers', label: 'Customers' },
        { to: '/shop/payments', key: 'payments', label: 'Payments' },
      ],
    },
  ],
  FARMER: [
    {
      key: 'dashboard', label: 'Dashboard',
      icon: LayoutDashboard,
      tabs: [
        { to: '/farmer', key: 'overview', label: 'Overview', end: true },
        { to: '/farmer/reports', key: 'reports', label: 'Reports' },
      ],
    },
    {
      key: 'myHarvest', label: 'My Harvest',
      icon: Wheat,
      tabs: [
        { to: '/farmer/listings', key: 'listings', label: 'Listings' },
        { to: '/farmer/listings/new', key: 'postNewHarvest', label: 'Post new harvest' },
        { to: '/farmer/crops', key: 'myCrops', label: 'My crops' },
      ],
    },
    {
      key: 'orders', label: 'Orders',
      icon: ClipboardList,
      tabs: [
        { to: '/farmer/orders', key: 'fromShops', label: 'From shops' },
        { to: '/farmer/mandi-orders', key: 'fromMandis', label: 'From mandis' },
        { to: '/farmer/sales', key: 'salesHistory', label: 'Sales history' },
      ],
    },
    { key: 'transport', label: 'Transport', icon: Truck, tabs: [{ to: '/farmer/transport', key: 'transport', label: 'Transport' }] },
    { key: 'earnings', label: 'Earnings', icon: Wallet, tabs: [{ to: '/farmer/earnings', key: 'earnings', label: 'Earnings' }] },
  ],
  MANDI_OWNER: [
    {
      key: 'dashboard', label: 'Dashboard',
      icon: LayoutDashboard,
      tabs: [
        { to: '/mandi', key: 'overview', label: 'Overview', end: true },
        { to: '/mandi/reports', key: 'reports', label: 'Reports' },
      ],
    },
    {
      key: 'lots', label: 'Lots',
      icon: Boxes,
      tabs: [
        { to: '/mandi/lots', key: 'mandiLots', label: 'Mandi lots' },
        { to: '/mandi/lots/new', key: 'createLot', label: 'Create lot' },
        { to: '/mandi/products', key: 'wholesaleProducts', label: 'Wholesale products' },
      ],
    },
    {
      key: 'orders', label: 'Orders',
      icon: ClipboardList,
      tabs: [
        { to: '/mandi/incoming', key: 'shopOrders', label: 'Shop orders' },
        { to: '/mandi/orders', key: 'allOrders', label: 'All orders' },
        { to: '/mandi/procurement', key: 'buyFromFarmers', label: 'Buy from farmers' },
        { to: '/mandi/partners', key: 'partners', label: 'Partners' },
      ],
    },
    {
      key: 'transport', label: 'Transport',
      icon: Truck,
      tabs: [
        { to: '/mandi/transport', key: 'transport', label: 'Transport' },
        { to: '/mandi/assignments', key: 'vehicleAssignments', label: 'Vehicle assignments' },
      ],
    },
    {
      key: 'payments', label: 'Payments',
      icon: Wallet,
      tabs: [
        { to: '/mandi/payments', key: 'payments', label: 'Payments' },
        { to: '/mandi/settlements', key: 'settlements', label: 'Settlements' },
      ],
    },
  ],
  DRIVER: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tabs: [{ to: '/driver', key: 'overview', label: 'Overview', end: true }] },
    {
      key: 'myTrips', label: 'My Trips',
      icon: Route,
      tabs: [
        { to: '/driver/trips', key: 'allTrips', label: 'All trips' },
        { to: '/driver/assignments', key: 'newAssignments', label: 'New assignments' },
        { to: '/driver/pickups', key: 'pickups', label: 'Pickups' },
        { to: '/driver/deliveries', key: 'deliveries', label: 'Deliveries' },
        { to: '/driver/history', key: 'history', label: 'History' },
      ],
    },
    { key: 'liveTracking', label: 'Live Tracking', icon: Navigation, tabs: [{ to: '/driver/tracking', key: 'liveTracking', label: 'Live tracking' }] },
    {
      key: 'vehicle', label: 'Vehicle',
      icon: Car,
      tabs: [
        { to: '/driver/vehicles', key: 'vehicleDetails', label: 'Vehicle details' },
        { to: '/driver/documents', key: 'documents', label: 'Documents' },
      ],
    },
    { key: 'earnings', label: 'Earnings', icon: Wallet, tabs: [{ to: '/driver/earnings', key: 'earnings', label: 'Earnings' }] },
  ],
};

/** Extra links in the top-right profile menu (besides Profile, Settings, Sign out). */
const RAW_PROFILE_LINKS = {
  SHOPKEEPER: [{ to: '/shop/gps', key: 'shopGPSLocation', label: 'Shop GPS location', icon: MapPin }],
};

/* Labels are getters, so they always come back in the active language (dnav.items.* / dnav.tabs.*). */
const localized = (ns, { label: english, ...rest }, extra = {}) =>
  Object.defineProperty({ ...rest, ...extra }, 'label', { enumerable: true, get: () => translate(`dnav.${ns}.${rest.key}`, english) });

export const NAV = Object.fromEntries(
  Object.entries(RAW_NAV).map(([r, items]) => [r, items.map((it) => localized('items', it, { tabs: it.tabs.map((tb) => localized('tabs', tb)) }))])
);
export const PROFILE_LINKS = Object.fromEntries(Object.entries(RAW_PROFILE_LINKS).map(([r, links]) => [r, links.map((l) => localized('tabs', l))]));

/** Mobile bottom bar: four sidebar items per role (by key). */
export const QUICK_NAV = {
  ADMIN: ['dashboard', 'users', 'orders', 'transport'],
  SHOPKEEPER: ['dashboard', 'billing', 'stock', 'orders'],
  FARMER: ['dashboard', 'myHarvest', 'orders', 'earnings'],
  MANDI_OWNER: ['dashboard', 'lots', 'orders', 'transport'],
  DRIVER: ['dashboard', 'myTrips', 'liveTracking', 'earnings'],
};

const pathMatches = (tab, pathname) => pathname === tab.to || (!tab.end && pathname.startsWith(`${tab.to}/`));

/**
 * Finds the sidebar item and tab for the current URL. The longest matching tab path wins,
 * so "/farmer/listings/new" picks "Post new harvest" rather than "Listings",
 * and detail pages ("/shop/orders/123") highlight their parent item.
 */
export const findActive = (role, pathname) => {
  let best = null;
  for (const item of NAV[role] || []) {
    for (const tab of item.tabs) {
      if (pathMatches(tab, pathname) && (!best || tab.to.length > best.tab.to.length)) best = { item, tab };
    }
  }
  return best;
};
