import { Link } from 'react-router-dom';
import { Package, ClipboardList, IndianRupee, Truck, PlusCircle, Wallet } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import ErrorState from '../../components/feedback/ErrorState';
import { BarsChart } from '../../components/charts/Charts';
import useAsync from '../../hooks/useAsync';
import { farmerApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import { formatINR, formatKg, timeAgo } from '../../utils/format';
import { roleLabel } from '../../constants/roles';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => farmerApi.dashboard(), []);
  const c = data?.cards;

  return (
    <>
      <PageHeader
        title={t('dashboard.greeting', 'Namaste, {name}', { name: user.name.split(' ')[0] })}
        description={user.farmerProfile?.farmName || 'Your farm at a glance'}
        actions={
          <Button to="/farmer/listings/new" icon={PlusCircle}>
            Post new harvest
          </Button>
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active harvest listings" value={c?.activeListings} icon={Package} loading={loading} to="/farmer/listings" />
            <StatCard label="Orders received" value={c?.ordersReceived} hint={c?.pendingOrders ? `${c.pendingOrders} waiting for you` : 'None waiting'} icon={ClipboardList} tone={c?.pendingOrders ? 'amber' : 'green'} loading={loading} to="/farmer/orders" />
            <StatCard label="Total harvest value" value={formatINR(c?.totalHarvestValue, { whole: true })} hint={c && `${formatINR(c.availableHarvestValue, { whole: true })} still on sale`} icon={IndianRupee} loading={loading} />
            <StatCard label="Pending transport requests" value={c?.pendingTransportRequests} icon={Truck} tone="blue" loading={loading} to="/farmer/transport" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Section title="Recent orders" actions={<Link className="link text-sm" to="/farmer/orders">All orders</Link>} bodyClass="p-0">
              <ul className="divide-y divide-soil-100">
                {(data?.recentOrders || []).map((o) => (
                  <li key={o.id}>
                    <Link to={`/farmer/orders/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-leafwhite">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {o.buyer.name} <span className="font-normal text-soil-500">({roleLabel(o.buyer.role)})</span>
                        </p>
                        <p className="truncate text-sm text-soil-500">
                          {o.items.map((i) => `${i.itemName.split(' · ')[0]} ${formatKg(i.quantityKg)}`).join(', ')} — {timeAgo(o.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={o.status} />
                        <span className="num hidden w-24 text-right font-semibold sm:block">{formatINR(o.total)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
                {!loading && !data?.recentOrders?.length && (
                  <li className="px-5 py-10 text-center text-sm text-soil-500">
                    No orders yet. <Link to="/farmer/listings/new" className="link">Post a harvest</Link> so shops and mandis can find it.
                  </li>
                )}
              </ul>
            </Section>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Total earnings" value={formatINR(c?.totalEarnings, { whole: true })} icon={Wallet} tone="green" loading={loading} to="/farmer/earnings" />
                <StatCard label="Payments pending" value={formatINR(c?.pendingPayments, { whole: true })} tone="red" loading={loading} to="/farmer/earnings" />
              </div>
              <Section title="Earnings by month">
                <BarsChart data={data?.monthlyEarnings || []} x="month" series={[{ key: 'amount', label: 'Settled' }]} height={220} />
              </Section>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FarmerDashboard;
