import {
  LayoutDashboard,
  Sprout,
  Store,
  Warehouse,
  Truck,
  Car,
  Tags,
  ClipboardList,
  Route,
  Wallet,
  BarChart3,
  Bell,
  Settings,
  UserCog,
  ScrollText,
  Scale,
  Boxes,
  Receipt,
  BookUser,
  HandCoins,
  MapPin,
  ShoppingCart,
  Wheat,
  PlusCircle,
  Handshake,
  FileText,
  Navigation,
  PackageCheck,
  PackageOpen,
  History,
  User,
  Package,
  Container,
  ArrowRightLeft,
  Banknote,
} from 'lucide-react';

/**
 * Sidebar navigation per role. Groups are visual sections; `end` marks exact-match links.
 * Every entry points to a real, implemented screen.
 */
export const NAV = {
  ADMIN: [
    { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
      group: 'People',
      items: [
        { to: '/admin/farmers', label: 'Farmers', icon: Sprout },
        { to: '/admin/shopkeepers', label: 'Shopkeepers', icon: Store },
        { to: '/admin/mandi-owners', label: 'Market Mandi Owners', icon: Warehouse },
        { to: '/admin/drivers', label: 'Drivers', icon: Truck },
        { to: '/admin/vehicles', label: 'Vehicles', icon: Car },
        { to: '/admin/users', label: 'Users & roles', icon: UserCog },
      ],
    },
    {
      group: 'Trade',
      items: [
        { to: '/admin/catalog', label: 'Products & categories', icon: Tags },
        { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
        { to: '/admin/transport', label: 'Transport & trips', icon: Route },
        { to: '/admin/payments', label: 'Payments & settlements', icon: Wallet },
      ],
    },
    {
      group: 'Platform',
      items: [
        { to: '/admin/reports', label: 'Reports & analytics', icon: BarChart3 },
        { to: '/admin/notifications', label: 'Notifications', icon: Bell },
        { to: '/admin/settings', label: 'Platform settings', icon: Settings },
        { to: '/admin/audit-logs', label: 'Audit logs', icon: ScrollText },
      ],
    },
  ],
  SHOPKEEPER: [
    {
      group: 'Shop',
      items: [
        { to: '/shop', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/shop/pos', label: 'Billing & weighing', icon: Scale },
        { to: '/shop/sales', label: 'Sales history', icon: Receipt },
        { to: '/shop/credit', label: 'Udhar / Khata', icon: HandCoins },
        { to: '/shop/customers', label: 'Customers', icon: BookUser },
      ],
    },
    {
      group: 'Stock',
      items: [
        { to: '/shop/stock', label: 'Stock & rates master', icon: Tags },
        { to: '/shop/inventory', label: 'Inventory', icon: Boxes },
        { to: '/shop/purchases', label: 'Purchases', icon: PackageOpen },
        { to: '/shop/suppliers', label: 'Suppliers', icon: Container },
      ],
    },
    {
      group: 'Buy fresh',
      items: [
        { to: '/shop/order-farmers', label: 'Order from farmers', icon: Sprout },
        { to: '/shop/order-mandi', label: 'Order from Market Mandi', icon: Warehouse },
        { to: '/shop/orders', label: 'My orders', icon: ShoppingCart },
        { to: '/shop/transport', label: 'Deliveries', icon: Truck },
      ],
    },
    {
      group: 'Accounts',
      items: [
        { to: '/shop/payments', label: 'Payments', icon: Wallet },
        { to: '/shop/reports', label: 'Reports', icon: BarChart3 },
        { to: '/shop/gps', label: 'Shop GPS profile', icon: MapPin },
        { to: '/shop/settings', label: 'Settings', icon: Settings },
      ],
    },
  ],
  FARMER: [
    {
      group: 'Farm',
      items: [
        { to: '/farmer', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/farmer/crops', label: 'My crops', icon: Wheat },
        { to: '/farmer/listings', label: 'Harvest listings', icon: Package, end: true },
        { to: '/farmer/listings/new', label: 'Post new harvest', icon: PlusCircle },
      ],
    },
    {
      group: 'Sales',
      items: [
        { to: '/farmer/orders', label: 'Orders from shops', icon: Store },
        { to: '/farmer/mandi-orders', label: 'Orders from mandis', icon: Warehouse },
        { to: '/farmer/transport', label: 'Transport requests', icon: Truck },
        { to: '/farmer/earnings', label: 'Payments & earnings', icon: Wallet },
        { to: '/farmer/sales', label: 'Sales history', icon: History },
        { to: '/farmer/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      group: 'Account',
      items: [
        { to: '/farmer/profile', label: 'Farmer profile', icon: User },
        { to: '/farmer/settings', label: 'Settings', icon: Settings },
      ],
    },
  ],
  MANDI_OWNER: [
    {
      group: 'Market Mandi',
      items: [
        { to: '/mandi', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/mandi/lots', label: 'Mandi lots', icon: Boxes, end: true },
        { to: '/mandi/lots/new', label: 'Create new lot', icon: PlusCircle },
        { to: '/mandi/products', label: 'Wholesale products', icon: Tags },
      ],
    },
    {
      group: 'Trade',
      items: [
        { to: '/mandi/incoming', label: 'Incoming shop orders', icon: PackageCheck },
        { to: '/mandi/orders', label: 'Order management', icon: ClipboardList },
        { to: '/mandi/procurement', label: 'Farmer procurement', icon: Sprout },
        { to: '/mandi/partners', label: 'Partners', icon: Handshake },
      ],
    },
    {
      group: 'Logistics',
      items: [
        { to: '/mandi/transport', label: 'Transport & logistics', icon: Truck },
        { to: '/mandi/assignments', label: 'Vehicle assignments', icon: ArrowRightLeft },
      ],
    },
    {
      group: 'Money',
      items: [
        { to: '/mandi/settlements', label: 'Settlements', icon: FileText },
        { to: '/mandi/payments', label: 'Payments', icon: Banknote },
        { to: '/mandi/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      group: 'Account',
      items: [
        { to: '/mandi/profile', label: 'Mandi profile', icon: Warehouse },
        { to: '/mandi/settings', label: 'Settings', icon: Settings },
      ],
    },
  ],
  DRIVER: [
    {
      group: 'Trips',
      items: [
        { to: '/driver', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/driver/trips', label: 'My trips', icon: Route },
        { to: '/driver/assignments', label: 'Transport assignments', icon: ClipboardList },
        { to: '/driver/tracking', label: 'Live tracking', icon: Navigation },
        { to: '/driver/pickups', label: 'Pickup confirmation', icon: PackageOpen },
        { to: '/driver/deliveries', label: 'Delivery confirmation', icon: PackageCheck },
        { to: '/driver/history', label: 'Trip history', icon: History },
      ],
    },
    {
      group: 'Vehicle',
      items: [
        { to: '/driver/vehicles', label: 'Vehicle details', icon: Car },
        { to: '/driver/documents', label: 'Vehicle documents', icon: FileText },
      ],
    },
    {
      group: 'Account',
      items: [
        { to: '/driver/earnings', label: 'Earnings', icon: Wallet },
        { to: '/driver/notifications', label: 'Notifications', icon: Bell },
        { to: '/driver/profile', label: 'Driver profile', icon: User },
        { to: '/driver/settings', label: 'Settings', icon: Settings },
      ],
    },
  ],
};

/** Mobile bottom bar: the four most-used destinations per role. */
export const QUICK_NAV = {
  ADMIN: ['/admin', '/admin/users', '/admin/orders', '/admin/transport'],
  SHOPKEEPER: ['/shop', '/shop/pos', '/shop/stock', '/shop/orders'],
  FARMER: ['/farmer', '/farmer/listings', '/farmer/orders', '/farmer/earnings'],
  MANDI_OWNER: ['/mandi', '/mandi/lots', '/mandi/incoming', '/mandi/transport'],
  DRIVER: ['/driver', '/driver/trips', '/driver/tracking', '/driver/earnings'],
};

export const findNavItem = (role, to) => NAV[role]?.flatMap((g) => g.items).find((i) => i.to === to);
