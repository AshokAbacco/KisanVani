import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import PublicLayout from '../layouts/PublicLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import PrintLayout from '../layouts/PrintLayout';
import { PageLoader } from '../components/common/Spinner';
import { useAuth } from '../context/AuthContext';
import { roleBase } from '../constants/roles';

// Public & auth pages
import HomePage from '../pages/home/HomePage';
import Login from '../auth/Login';
import Register from '../auth/Register';
import ForgotPassword from '../auth/ForgotPassword';
import ResetPassword from '../auth/ResetPassword';
import VerifyOTP from '../auth/VerifyOTP';
import NotFoundPage from '../pages/not-found/NotFoundPage';
const AboutPage = lazy(() => import('../pages/about/AboutPage'));
const FeaturesPage = lazy(() => import('../pages/features/FeaturesPage'));
// const HowItWorksPage = lazy(() => import('../pages/how-it-works/HowItWorksPage'));
const ContactPage = lazy(() => import('../pages/contact/ContactPage'));
const FaqPage = lazy(() => import('../pages/faq/FaqPage'));
const PrivacyPolicyPage = lazy(() => import('../pages/privacy-policy/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('../pages/terms/TermsPage'));

// Shared features
const OrdersPage = lazy(() => import('../features/orders/OrdersPage'));
const OrderDetailPage = lazy(() => import('../features/orders/OrderDetailPage'));
const TransportPage = lazy(() => import('../features/transport/TransportPage'));
const TripDetailPage = lazy(() => import('../features/transport/TripDetailPage'));
const MarketplacePage = lazy(() => import('../features/procurement/MarketplacePage'));
const PaymentsPage = lazy(() => import('../features/payments/PaymentsPage'));
const SettlementsTable = lazy(() => import('../features/payments/SettlementsTable'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const ProfilePage = lazy(() => import('../features/account/ProfilePage'));
const AccountSettingsPage = lazy(() => import('../features/account/AccountSettingsPage'));
const NotificationsPage = lazy(() => import('../features/account/NotificationsPage'));
const InvoicePrintPage = lazy(() => import('../features/billing/InvoicePrintPage'));
import PageHeader from '../components/common/PageHeader';

// Admin
const AdminDashboard = lazy(() => import('../dashboards/admin/AdminDashboard'));
const UsersPage = lazy(() => import('../dashboards/admin/UsersPage'));
const UserDetailPage = lazy(() => import('../dashboards/admin/UserDetailPage'));
const VehiclesAdminPage = lazy(() => import('../dashboards/admin/VehiclesAdminPage'));
const VehicleReviewPage = lazy(() => import('../dashboards/admin/VehicleReviewPage'));
const CatalogPage = lazy(() => import('../dashboards/admin/CatalogPage'));
const BroadcastPanel = lazy(() => import('../dashboards/admin/BroadcastPanel'));
const PlatformSettingsPage = lazy(() => import('../dashboards/admin/PlatformSettingsPage'));

// Shopkeeper
const ShopDashboard = lazy(() => import('../dashboards/shop/ShopDashboard'));
const POSPage = lazy(() => import('../dashboards/shop/POSPage'));
const StockMasterPage = lazy(() => import('../dashboards/shop/StockMasterPage'));
const InventoryPage = lazy(() => import('../dashboards/shop/InventoryPage'));
const CustomersPage = lazy(() => import('../dashboards/shop/CustomersPage'));
const CustomerDetailPage = lazy(() => import('../dashboards/shop/CustomerDetailPage'));
const CreditPage = lazy(() => import('../dashboards/shop/CreditPage'));
const PurchasesPage = lazy(() => import('../dashboards/shop/PurchasesPage'));
const SuppliersPage = lazy(() => import('../dashboards/shop/SuppliersPage'));
const SalesHistoryPage = lazy(() => import('../dashboards/shop/SalesHistoryPage'));
const ShopGpsPage = lazy(() => import('../dashboards/shop/ShopGpsPage'));

// Farmer
const FarmerDashboard = lazy(() => import('../dashboards/farmer/FarmerDashboard'));
const MyCropsPage = lazy(() => import('../dashboards/farmer/MyCropsPage'));
const ListingsPage = lazy(() => import('../dashboards/farmer/ListingsPage'));
const ListingFormPage = lazy(() => import('../dashboards/farmer/ListingFormPage'));

// Market Mandi
const MandiDashboard = lazy(() => import('../dashboards/mandi/MandiDashboard'));
const LotsPage = lazy(() => import('../dashboards/mandi/LotsPage'));
const LotFormPage = lazy(() => import('../dashboards/mandi/LotFormPage'));
const WholesaleProductsPage = lazy(() => import('../dashboards/mandi/WholesaleProductsPage'));
const PartnersPage = lazy(() => import('../dashboards/mandi/PartnersPage'));

// Driver
const DriverDashboard = lazy(() => import('../dashboards/driver/DriverDashboard'));
const MyTripsPage = lazy(() => import('../dashboards/driver/MyTripsPage'));
const DriverTripPage = lazy(() => import('../dashboards/driver/DriverTripPage'));
const AssignmentsPage = lazy(() => import('../dashboards/driver/AssignmentsPage'));
const VehiclesPage = lazy(() => import('../dashboards/driver/VehiclesPage'));
const VehicleDetailPage = lazy(() => import('../dashboards/driver/VehicleDetailPage'));
const LiveTrackingPage = lazy(() => import('../dashboards/driver/LiveTrackingPage'));
const EarningsPage = lazy(() => import('../dashboards/driver/EarningsPage'));

/** Signed-in users who open /login or /register go straight to their dashboard. */
const GuestOnly = ({ children }) => {
  const { status, user } = useAuth();
  if (status === 'loading') return <PageLoader />;
  return status === 'authenticated' ? <Navigate to={roleBase(user.role)} replace /> : children;
};

/** Role-less links (e.g. "/transport" in notifications) resolve to the right dashboard. */
const RoleRedirect = ({ suffix }) => {
  const { user } = useAuth();
  return <Navigate to={`${roleBase(user.role)}${suffix}`} replace />;
};

const SettlementsScreen = ({ base, as }) => (
  <>
    <PageHeader title="Settlements" description="One settlement per received order: gross value, commission and what has been paid." />
    <SettlementsTable base={base} as={as} />
  </>
);

const AppRouter = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="features" element={<FeaturesPage />} />
        {/* <Route path="how-it-works" element={<HowItWorksPage />} /> */}
        <Route path="contact" element={<ContactPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsPage />} />
      </Route>
    <Route path="login" element={<GuestOnly><Login /></GuestOnly>} />
     <Route path="register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<AuthLayout />}>
       
       
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="verify-otp" element={<VerifyOTP />} />
        <Route path="reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="transport" element={<RoleRedirect suffix="/transport" />} />
        <Route path="payments" element={<RoleRedirect suffix="/payments" />} />
        <Route path="dashboard" element={<RoleRedirect suffix="" />} />

        {/* Print view (outside the dashboard chrome) */}
        <Route element={<RoleRoute roles={['SHOPKEEPER']} />}>
          <Route element={<PrintLayout />}>
            <Route path="shop/invoices/:id/print" element={<InvoicePrintPage />} />
          </Route>
        </Route>

        <Route element={<DashboardLayout />}>
          {/* ── Admin ── */}
          <Route path="admin" element={<RoleRoute roles={['ADMIN']} />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage key="all" />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="farmers" element={<UsersPage key="FARMER" role="FARMER" title="Farmer management" description="Farmers on the platform, their listings and earnings." />} />
            <Route path="shopkeepers" element={<UsersPage key="SHOPKEEPER" role="SHOPKEEPER" title="Shopkeeper management" description="Retail shops using billing, stock and procurement." />} />
            <Route path="mandi-owners" element={<UsersPage key="MANDI_OWNER" role="MANDI_OWNER" title="Market Mandi Owner management" description="Wholesale traders, their lots and commission settings." />} />
            <Route path="drivers" element={<UsersPage key="DRIVER" role="DRIVER" title="Driver management" description="Drivers, approvals and their vehicles." />} />
            <Route path="vehicles" element={<VehiclesAdminPage />} />
            <Route path="vehicles/:id" element={<VehicleReviewPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="orders" element={<OrdersPage base="/admin" title="Order management" description="All platform orders. Admins can cancel for moderation; every other step belongs to the buyer or seller." />} />
            <Route path="orders/:id" element={<OrderDetailPage base="/admin" />} />
            <Route path="transport" element={<TransportPage base="/admin" canAssign title="Transport & trips" description="Every load and trip on the platform. Assign verified drivers to open requests." />} />
            <Route path="transport/trips/:id" element={<TripDetailPage base="/admin" />} />
            <Route path="payments" element={<PaymentsPage base="/admin" title="Payments & settlements" description="Every recorded payment and settlement. Records are read-only; corrections happen through the original transaction." />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage><BroadcastPanel /></NotificationsPage>} />
            <Route path="settings" element={<PlatformSettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="account" element={<AccountSettingsPage />} />
          </Route>

          {/* ── Shopkeeper ── */}
          <Route path="shop" element={<RoleRoute roles={['SHOPKEEPER']} />}>
            <Route index element={<ShopDashboard />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="sales" element={<SalesHistoryPage />} />
            <Route path="credit" element={<CreditPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="stock" element={<StockMasterPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="order-farmers" element={<MarketplacePage key="h" source="HARVEST" base="/shop" title="Order from farmers" description="Fresh harvests listed directly by farmers. Prices are per kg at the farm." />} />
            <Route path="order-mandi" element={<MarketplacePage key="m" source="MANDI_LOT" base="/shop" title="Order from Market Mandi" description="Wholesale lots available at Market Mandis, with yard and loading details." />} />
            <Route path="orders" element={<OrdersPage base="/shop" as="buyer" title="My orders" description="Orders you have placed with farmers and Market Mandis." />} />
            <Route path="orders/:id" element={<OrderDetailPage base="/shop" />} />
            <Route path="transport" element={<TransportPage base="/shop" title="Deliveries" description="Vehicles carrying your orders, with live tracking." />} />
            <Route path="transport/trips/:id" element={<TripDetailPage base="/shop" />} />
            <Route path="payments" element={<PaymentsPage base="/shop" />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="gps" element={<ShopGpsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage title="Shop profile" />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>

          {/* ── Farmer ── */}
          <Route path="farmer" element={<RoleRoute roles={['FARMER']} />}>
            <Route index element={<FarmerDashboard />} />
            <Route path="crops" element={<MyCropsPage />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="listings/new" element={<ListingFormPage key="new" />} />
            <Route path="listings/:id/edit" element={<ListingFormPage />} />
            <Route path="orders" element={<OrdersPage key="shops" base="/farmer" as="seller" type="SHOP_FROM_FARMER" title="Orders from shops" description="Accept, prepare and hand over orders placed by shops." />} />
            <Route path="mandi-orders" element={<OrdersPage key="mandis" base="/farmer" as="seller" type="MANDI_FROM_FARMER" title="Orders from Market Mandis" description="Produce bought by Market Mandi Owners. Their commission is shown on the settlement." />} />
            <Route path="sales" element={<OrdersPage key="sales" base="/farmer" as="seller" initialStatus="RECEIVED" title="Sales history" description="Orders the buyer has received, with settled values." />} />
            <Route path="orders/:id" element={<OrderDetailPage base="/farmer" />} />
            <Route path="transport" element={<TransportPage base="/farmer" title="Transport requests" description="Ask for a vehicle from your farm to the buyer or mandi, and follow it live." defaultTab="requests" />} />
            <Route path="transport/trips/:id" element={<TripDetailPage base="/farmer" />} />
            <Route path="earnings" element={<PaymentsPage base="/farmer" title="Payments & earnings" description="Settlements for your sales and the payments recorded against them." />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage title="Farmer profile" />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>

          {/* ── Market Mandi Owner ── */}
          <Route path="mandi" element={<RoleRoute roles={['MANDI_OWNER']} />}>
            <Route index element={<MandiDashboard />} />
            <Route path="lots" element={<LotsPage />} />
            <Route path="lots/new" element={<LotFormPage key="new" />} />
            <Route path="lots/:id/edit" element={<LotFormPage />} />
            <Route path="products" element={<WholesaleProductsPage />} />
            <Route path="incoming" element={<OrdersPage key="incoming" base="/mandi" as="seller" type="SHOP_FROM_MANDI" title="Incoming shop orders" description="Wholesale orders from retail shops. Weight is already reserved on your lots." />} />
            <Route path="orders" element={<OrdersPage key="all" base="/mandi" title="Order management" description="Everything you sell to shops and buy from farmers." />} />
            <Route path="orders/:id" element={<OrderDetailPage base="/mandi" />} />
            <Route path="procurement" element={<MarketplacePage source="HARVEST" base="/mandi" title="Farmer procurement" description="Buy directly from farmers. Your commission is deducted on the farmer’s settlement." />} />
            <Route path="partners" element={<PartnersPage />} />
            <Route path="transport" element={<TransportPage key="t" base="/mandi" canAssign title="Transport & logistics" description="Loads for your orders and the vehicles carrying them." />} />
            <Route path="assignments" element={<TransportPage key="a" base="/mandi" canAssign defaultTab="requests" showMap={false} title="Vehicle assignments" description="Assign verified drivers to loads that are waiting for a vehicle." />} />
            <Route path="transport/trips/:id" element={<TripDetailPage base="/mandi" />} />
            <Route path="settlements" element={<SettlementsScreen base="/mandi" />} />
            <Route path="payments" element={<PaymentsPage base="/mandi" withSettlements={false} />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage title="Mandi profile" />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>

          {/* ── Driver ── */}
          <Route path="driver" element={<RoleRoute roles={['DRIVER']} />}>
            <Route index element={<DriverDashboard />} />
            <Route path="trips" element={<MyTripsPage key="all" preset="all" />} />
            <Route path="trips/:id" element={<DriverTripPage />} />
            <Route path="pickups" element={<MyTripsPage key="pickups" preset="pickups" />} />
            <Route path="deliveries" element={<MyTripsPage key="deliveries" preset="deliveries" />} />
            <Route path="history" element={<MyTripsPage key="history" preset="history" />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="tracking" element={<LiveTrackingPage />} />
            <Route path="vehicles" element={<VehiclesPage key="v" />} />
            <Route path="documents" element={<VehiclesPage key="d" documentsFocus />} />
            <Route path="vehicles/:id" element={<VehicleDetailPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage title="Driver profile" />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </Suspense>
);

export default AppRouter;
