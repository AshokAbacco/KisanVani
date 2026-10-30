import { useState } from 'react';
import { Sprout, Store, Warehouse, Truck, Car, ClipboardList, IndianRupee, Route, UserCheck, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Alert from '../../components/feedback/Alert';
import Button from '../../components/common/Button';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import ErrorState from '../../components/feedback/ErrorState';
import { AdminCharts } from '../../features/reports/ReportsPage';
import ActiveTripsMap from '../../features/tracking/ActiveTripsMap';
import useAsync from '../../hooks/useAsync';
import { adminApi } from '../../services';
import { formatINR, formatNumber, toDateInput, plural } from '../../utils/format';
import { useI18n } from '../../i18n';

const AdminDashboard = () => {
  const { t } = useI18n();
  const [range, setRange] = useState({ from: toDateInput(new Date(Date.now() - 29 * 86400000)), to: toDateInput(new Date()) });
  const { data, loading, error, reload } = useAsync(() => adminApi.dashboard({ from: range.from || undefined, to: range.to || undefined }), [range.from, range.to]);
  const c = data?.cards;

  return (
    <>
      <PageHeader title={t('adminDash.title')} description={t('adminDash.intro')} actions={<DateRangeFilter value={range} onChange={setRange} />} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          {(c?.pendingApprovals > 0 || c?.pendingVehicles > 0) && (
            <div className="grid gap-3 md:grid-cols-2">
              {c.pendingApprovals > 0 && (
                <Alert tone="warning" title={plural(c.pendingApprovals, 'accountWaiting')} action={<Button size="sm" to="/admin/users?status=PENDING_APPROVAL" icon={UserCheck}>{t('assignments.review')}</Button>} />
              )}
              {c.pendingVehicles > 0 && <Alert tone="warning" title={plural(c.pendingVehicles, 'vehicleToVerify')} action={<Button size="sm" to="/admin/vehicles?verificationStatus=PENDING" icon={ShieldAlert}>{t('adminDash.verify')}</Button>} />}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('dnav.tabs.farmers')} value={formatNumber(c?.farmers)} icon={Sprout} loading={loading} to="/admin/farmers" />
            <StatCard label={t('dnav.tabs.shopkeepers')} value={formatNumber(c?.shopkeepers)} icon={Store} loading={loading} to="/admin/shopkeepers" />
            <StatCard label={t('adminDash.mandiOwners')} value={formatNumber(c?.mandiOwners)} icon={Warehouse} tone="amber" loading={loading} to="/admin/mandi-owners" />
            <StatCard label={t('dnav.tabs.drivers')} value={formatNumber(c?.drivers)} icon={Truck} tone="blue" loading={loading} to="/admin/drivers" />
            <StatCard label={t('adminDash.registeredVehicles')} value={formatNumber(c?.vehicles)} hint={c && t('adminDash.verifiedCount', '', { n: c.verifiedVehicles })} icon={Car} tone="blue" loading={loading} to="/admin/vehicles" />
            <StatCard label={t('adminDash.totalOrders')} value={formatNumber(c?.orders)} icon={ClipboardList} loading={loading} to="/admin/orders" />
            <StatCard label={t('mandiDash.tradeValue')} value={formatINR(c?.tradeValue, { whole: true })} hint={c && t('adminDash.posSales', '', { amount: formatINR(c.posSales, { whole: true }) })} icon={IndianRupee} tone="green" loading={loading} to="/admin/reports" />
            <StatCard label={t('adminDash.activeTrips')} value={formatNumber(c?.activeTrips)} icon={Route} tone="blue" loading={loading} to="/admin/transport" />
          </div>
          {data?.charts && <AdminCharts d={data.charts} />}
          <ActiveTripsMap base="/admin" />
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
