import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Store, Warehouse, Truck, Car, ClipboardList, IndianRupee, Route, UserCheck, ShieldAlert } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Section from '../../components/common/Section';
import Alert from '../../components/feedback/Alert';
import Button from '../../components/common/Button';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import ErrorState from '../../components/feedback/ErrorState';
import { AdminCharts } from '../../features/reports/ReportsPage';
import ActiveTripsMap from '../../features/tracking/ActiveTripsMap';
import useAsync from '../../hooks/useAsync';
import { adminApi } from '../../services';
import { formatINR, formatNumber, formatDateTime, humanize, toDateInput } from '../../utils/format';

const AdminDashboard = () => {
  const [range, setRange] = useState({ from: toDateInput(new Date(Date.now() - 29 * 86400000)), to: toDateInput(new Date()) });
  const { data, loading, error, reload } = useAsync(() => adminApi.dashboard({ from: range.from || undefined, to: range.to || undefined }), [range.from, range.to]);
  const c = data?.cards;

  return (
    <>
      <PageHeader title="Platform overview" description="Everything happening on KisanVani." actions={<DateRangeFilter value={range} onChange={setRange} />} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          {(c?.pendingApprovals > 0 || c?.pendingVehicles > 0) && (
            <div className="grid gap-3 md:grid-cols-2">
              {c.pendingApprovals > 0 && (
                <Alert tone="warning" title={`${c.pendingApprovals} account${c.pendingApprovals > 1 ? 's' : ''} waiting for approval`} action={<Button size="sm" to="/admin/users?status=PENDING_APPROVAL" icon={UserCheck}>Review</Button>} />
              )}
              {c.pendingVehicles > 0 && <Alert tone="warning" title={`${c.pendingVehicles} vehicle${c.pendingVehicles > 1 ? 's' : ''} to verify`} action={<Button size="sm" to="/admin/vehicles?verificationStatus=PENDING" icon={ShieldAlert}>Verify</Button>} />}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Farmers" value={formatNumber(c?.farmers)} icon={Sprout} loading={loading} to="/admin/farmers" />
            <StatCard label="Shopkeepers" value={formatNumber(c?.shopkeepers)} icon={Store} loading={loading} to="/admin/shopkeepers" />
            <StatCard label="Market Mandi Owners" value={formatNumber(c?.mandiOwners)} icon={Warehouse} tone="amber" loading={loading} to="/admin/mandi-owners" />
            <StatCard label="Drivers" value={formatNumber(c?.drivers)} icon={Truck} tone="blue" loading={loading} to="/admin/drivers" />
            <StatCard label="Registered vehicles" value={formatNumber(c?.vehicles)} hint={c && `${c.verifiedVehicles} verified`} icon={Car} tone="blue" loading={loading} to="/admin/vehicles" />
            <StatCard label="Total orders" value={formatNumber(c?.orders)} icon={ClipboardList} loading={loading} to="/admin/orders" />
            <StatCard label="Trade value" value={formatINR(c?.tradeValue, { whole: true })} hint={c && `POS sales ${formatINR(c.posSales, { whole: true })}`} icon={IndianRupee} tone="green" loading={loading} to="/admin/reports" />
            <StatCard label="Active trips" value={formatNumber(c?.activeTrips)} icon={Route} tone="blue" loading={loading} to="/admin/transport" />
          </div>
          {data?.charts && <AdminCharts d={data.charts} />}
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <ActiveTripsMap base="/admin" />
            <Section title="Recent activity" actions={<Link to="/admin/audit-logs" className="link text-sm">Audit log</Link>} bodyClass="p-0">
              <ul className="divide-y divide-soil-100">
                {(data?.recentAudit || []).map((a) => (
                  <li key={a.id} className="px-5 py-3 text-sm">
                    <p className="font-medium">{humanize(a.action)}</p>
                    <p className="text-xs text-soil-500">
                      {a.actor?.name || 'System'} — {a.entityType} — {formatDateTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
