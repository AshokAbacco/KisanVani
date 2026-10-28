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

/**
 * Sidebar navigation per role: a short, flat list (5–6 items).
 * Each item can carry `tabs` — related screens shown as a tab strip at the top of the page,
 * so every existing screen stays reachable without crowding the sidebar.
 * The first tab's `to` is where the sidebar item links. `end` = exact-match only.
 */
export const NAV = {
  ADMIN: [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      tabs: [
        { to: '/admin', label: 'Overview', end: true },
        { to: '/admin/reports', label: 'Reports' },
      ],
    },
    {
      label: 'Users',
      icon: Users,
      tabs: [
        { to: '/admin/users', label: 'All users' },
        { to: '/admin/farmers', label: 'Farmers' },
        { to: '/admin/shopkeepers', label: 'Shopkeepers' },
        { to: '/admin/mandi-owners', label: 'Mandi owners' },
        { to: '/admin/drivers', label: 'Drivers' },
      ],
    },
    { label: 'Orders', icon: ClipboardList, tabs: [{ to: '/admin/orders', label: 'Orders' }] },
    {
      label: 'Transport',
      icon: Truck,
      tabs: [
        { to: '/admin/transport', label: 'Trips' },
        { to: '/admin/vehicles', label: 'Vehicles' },
      ],
    },
    { label: 'Payments', icon: Wallet, tabs: [{ to: '/admin/payments', label: 'Payments' }] },
    {
      label: 'Platform',
      icon: Settings,
      tabs: [
        { to: '/admin/catalog', label: 'Products & categories' },
        { to: '/admin/settings', label: 'Platform settings' },
        { to: '/admin/notifications', label: 'Broadcast' },
      ],
    },
  ],
  SHOPKEEPER: [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      tabs: [
        { to: '/shop', label: 'Overview', end: true },
        { to: '/shop/reports', label: 'Reports' },
      ],
    },
    {
      label: 'Billing',
      icon: Scale,
      tabs: [
        { to: '/shop/pos', label: 'New bill' },
        { to: '/shop/sales', label: 'Sales history' },
      ],
    },
    {
      label: 'Stock',
      icon: Boxes,
      tabs: [
        { to: '/shop/stock', label: 'Stock & rates' },
        { to: '/shop/inventory', label: 'Inventory' },
        { to: '/shop/purchases', label: 'Purchases' },
        { to: '/shop/suppliers', label: 'Suppliers' },
      ],
    },
    {
      label: 'Orders',
      icon: ShoppingCart,
      tabs: [
        { to: '/shop/orders', label: 'My orders' },
        { to: '/shop/order-farmers', label: 'Buy from farmers' },
        { to: '/shop/order-mandi', label: 'Buy from mandi' },
        { to: '/shop/transport', label: 'Deliveries' },
      ],
    },
    {
      label: 'Khata',
      icon: HandCoins,
      tabs: [
        { to: '/shop/credit', label: 'Udhar / Khata' },
        { to: '/shop/customers', label: 'Customers' },
        { to: '/shop/payments', label: 'Payments' },
      ],
    },
  ],
  FARMER: [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      tabs: [
        { to: '/farmer', label: 'Overview', end: true },
        { to: '/farmer/reports', label: 'Reports' },
      ],
    },
    {
      label: 'My Harvest',
      icon: Wheat,
      tabs: [
        { to: '/farmer/listings', label: 'Listings' },
        { to: '/farmer/listings/new', label: 'Post new harvest' },
        { to: '/farmer/crops', label: 'My crops' },
      ],
    },
    {
      label: 'Orders',
      icon: ClipboardList,
      tabs: [
        { to: '/farmer/orders', label: 'From shops' },
        { to: '/farmer/mandi-orders', label: 'From mandis' },
        { to: '/farmer/sales', label: 'Sales history' },
      ],
    },
    { label: 'Transport', icon: Truck, tabs: [{ to: '/farmer/transport', label: 'Transport' }] },
    { label: 'Earnings', icon: Wallet, tabs: [{ to: '/farmer/earnings', label: 'Earnings' }] },
  ],
  MANDI_OWNER: [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      tabs: [
        { to: '/mandi', label: 'Overview', end: true },
        { to: '/mandi/reports', label: 'Reports' },
      ],
    },
    {
      label: 'Lots',
      icon: Boxes,
      tabs: [
        { to: '/mandi/lots', label: 'Mandi lots' },
        { to: '/mandi/lots/new', label: 'Create lot' },
        { to: '/mandi/products', label: 'Wholesale products' },
      ],
    },
    {
      label: 'Orders',
      icon: ClipboardList,
      tabs: [
        { to: '/mandi/incoming', label: 'Shop orders' },
        { to: '/mandi/orders', label: 'All orders' },
        { to: '/mandi/procurement', label: 'Buy from farmers' },
        { to: '/mandi/partners', label: 'Partners' },
      ],
    },
    {
      label: 'Transport',
      icon: Truck,
      tabs: [
        { to: '/mandi/transport', label: 'Transport' },
        { to: '/mandi/assignments', label: 'Vehicle assignments' },
      ],
    },
    {
      label: 'Payments',
      icon: Wallet,
      tabs: [
        { to: '/mandi/payments', label: 'Payments' },
        { to: '/mandi/settlements', label: 'Settlements' },
      ],
    },
  ],
  DRIVER: [
    { label: 'Dashboard', icon: LayoutDashboard, tabs: [{ to: '/driver', label: 'Overview', end: true }] },
    {
      label: 'My Trips',
      icon: Route,
      tabs: [
        { to: '/driver/trips', label: 'All trips' },
        { to: '/driver/assignments', label: 'New assignments' },
        { to: '/driver/pickups', label: 'Pickups' },
        { to: '/driver/deliveries', label: 'Deliveries' },
        { to: '/driver/history', label: 'History' },
      ],
    },
    { label: 'Live Tracking', icon: Navigation, tabs: [{ to: '/driver/tracking', label: 'Live tracking' }] },
    {
      label: 'Vehicle',
      icon: Car,
      tabs: [
        { to: '/driver/vehicles', label: 'Vehicle details' },
        { to: '/driver/documents', label: 'Documents' },
      ],
    },
    { label: 'Earnings', icon: Wallet, tabs: [{ to: '/driver/earnings', label: 'Earnings' }] },
  ],
};

/** Extra links in the top-right profile menu (besides Profile, Settings, Sign out). */
export const PROFILE_LINKS = {
  SHOPKEEPER: [{ to: '/shop/gps', label: 'Shop GPS location', icon: MapPin }],
};

/** Mobile bottom bar: four sidebar items per role (by label). */
export const QUICK_NAV = {
  ADMIN: ['Dashboard', 'Users', 'Orders', 'Transport'],
  SHOPKEEPER: ['Dashboard', 'Billing', 'Stock', 'Orders'],
  FARMER: ['Dashboard', 'My Harvest', 'Orders', 'Earnings'],
  MANDI_OWNER: ['Dashboard', 'Lots', 'Orders', 'Transport'],
  DRIVER: ['Dashboard', 'My Trips', 'Live Tracking', 'Earnings'],
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
