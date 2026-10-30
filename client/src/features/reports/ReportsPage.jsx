import { useState } from 'react';
import { Download } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section from '../../components/common/Section';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';
import { TrendChart, BarsChart } from '../../components/charts/Charts';
import useAsync from '../../hooks/useAsync';
import { reportsApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, formatNumber, humanize, toDateInput, modeLabel, plural } from '../../utils/format';
import { roleLabel } from '../../constants/roles';
import { useI18n } from '../../i18n';

/* CSV downloads per role: [dataset, label key under reports.exports]. */
const EXPORTS = {
  SHOPKEEPER: [
    ['sales', 'sales'],
    ['stock', 'stock'],
    ['credit', 'credit'],
    ['orders', 'purchaseOrders'],
    ['payments', 'payments'],
  ],
  FARMER: [
    ['orders', 'orders'],
    ['settlements', 'settlements'],
    ['payments', 'payments'],
  ],
  MANDI_OWNER: [
    ['orders', 'orders'],
    ['settlements', 'settlements'],
    ['trips', 'trips'],
    ['payments', 'payments'],
  ],
  DRIVER: [
    ['trips', 'trips'],
    ['payments', 'payments'],
  ],
  ADMIN: [
    ['users', 'users'],
    ['orders', 'orders'],
    ['trips', 'trips'],
    ['payments', 'payments'],
    ['settlements', 'settlements'],
    ['sales', 'posSales'],
  ],
};

const Shop = ({ d }) => {
  const { t } = useI18n();
  return (
  <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('shopDash.salesSeries')} value={formatINR(d.totals.sales)} hint={plural(d.totals.bills, 'bill')} />
      <StatCard label={t('reports.averageBill')} value={formatINR(d.totals.averageBill)} />
      <StatCard label={t('reports.givenOnUdhar')} value={formatINR(d.totals.creditGiven)} tone="amber" hint={t('reports.discounts', '', { amount: formatINR(d.totals.discount) })} />
      <StatCard label={t('reports.boughtOnKv')} value={formatINR(d.totals.platformPurchases)} tone="blue" hint={t('reports.ordersReceived', '', { orders: plural(d.totals.platformPurchaseOrders, 'order') })} />
    </div>
    <Section title={t('reports.dailySales')}>
      <TrendChart data={d.daily} series={[{ key: 'amount', label: t('shopDash.salesSeries') }]} />
    </Section>
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title={t('reports.topProductsValue')}>
        <BarsChart data={d.topProducts} layout="vertical" series={[{ key: 'amount', label: t('shopDash.salesSeries') }]} />
      </Section>
      <Section title={t('reports.byPaymentMode')}>
        <BarsChart data={d.byPaymentMode.map((m) => ({ ...m, name: modeLabel(m.mode) }))} series={[{ key: 'amount', label: t('shopDash.salesSeries') }]} />
      </Section>
    </div>
  </>
  );
};

const Seller = ({ d, mandi }) => {
  const { t } = useI18n();
  return (
  <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('reports.settledGross')} value={formatINR(d.totals.gross)} />
      <StatCard label={t('reports.netReceivable')} value={formatINR(d.totals.net)} hint={Number(d.totals.commission) ? t('reports.afterFees', '', { amount: formatINR(d.totals.commission) }) : undefined} />
      <StatCard label={t('purchases.received')} value={formatINR(d.totals.received)} tone="green" />
      <StatCard label={t('settlements.outstanding')} value={formatINR(d.totals.outstanding)} tone="red" />
    </div>
    {mandi && (
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label={t('reports.boughtFromFarmers')} value={formatINR(d.procurement.amount)} hint={plural(d.procurement.orders, 'order')} tone="blue" />
        <StatCard label={t('mandiDash.commissionEarned')} value={formatINR(d.commissionEarned)} tone="amber" />
      </div>
    )}
    <Section title={t('reports.ordersPerDay')}>
      <TrendChart data={d.daily} series={[{ key: 'amount', label: t('mandiDash.orderValue') }]} />
    </Section>
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title={t('reports.topProducts')}>
        <BarsChart data={d.topProducts} layout="vertical" series={[{ key: 'amount', label: t('orders.value') }]} />
      </Section>
      <Section title={t('reports.topBuyers')}>
        <BarsChart data={d.topBuyers.map((b) => ({ ...b, name: `${b.name} (${roleLabel(b.role)})` }))} layout="vertical" series={[{ key: 'amount', label: t('orders.value') }]} />
      </Section>
    </div>
    <Section title={t('reports.ordersByStatus')}>
      <BarsChart data={d.orderStatus.map((s) => ({ name: humanize(s.status), count: s.count }))} kind="count" series={[{ key: 'count', label: t('dnav.items.orders') }]} height={220} />
    </Section>
  </>
  );
};

const Driver = ({ d }) => {
  const { t } = useI18n();
  return (
  <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label={t('reports.tripsDelivered')} value={formatNumber(d.totals.trips)} />
      <StatCard label={t('earnings.earned')} value={formatINR(d.totals.earned)} />
      <StatCard label={t('purchases.received')} value={formatINR(d.totals.received)} tone="green" hint={t('reports.pendingAmount', '', { amount: formatINR(d.totals.pending) })} />
      <StatCard label={t('reports.weightDelivered')} value={formatKg(d.totals.deliveredKg, { grams: false })} tone="blue" />
    </div>
    <Section title={t('reports.earningsByDay')}>
      <BarsChart data={d.daily} x="day" series={[{ key: 'amount', label: t('dnav.items.earnings') }]} />
    </Section>
    <Section title={t('reports.tripsByStatus')}>
      <BarsChart data={d.tripStatus.map((s) => ({ name: humanize(s.status), count: s.count }))} kind="count" series={[{ key: 'count', label: t('dnav.tabs.trips') }]} height={220} />
    </Section>
  </>
  );
};

export const AdminCharts = ({ d }) => {
  const { t } = useI18n();
  return (
  <>
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title={t('reports.orderVolume')}>
        <BarsChart data={d.orders} x="day" kind="count" series={[{ key: 'orders', label: t('dnav.items.orders') }]} />
      </Section>
      <Section title={t('mandiDash.tradeValue')}>
        <TrendChart data={d.orders} series={[{ key: 'value', label: t('mandiDash.orderValue') }]} />
      </Section>
      <Section title={t('reports.registrations')}>
        <BarsChart
          data={d.registrations}
          x="day"
          kind="count"
          stacked
          series={[
            { key: 'FARMER', label: t('dnav.tabs.farmers') },
            { key: 'SHOPKEEPER', label: t('dnav.tabs.shopkeepers') },
            { key: 'MANDI_OWNER', label: t('roles.MANDI_OWNER') },
            { key: 'DRIVER', label: t('dnav.tabs.drivers') },
          ]}
        />
      </Section>
      <Section title={t('driverDash.completedTrips')}>
        <BarsChart data={d.completedTrips} x="day" kind="count" series={[{ key: 'trips', label: t('reports.tripsDelivered') }]} />
      </Section>
    </div>
    <Section title={t('reports.posAcrossShops')}>
      <TrendChart data={d.posSales} series={[{ key: 'amount', label: t('userDetail.activity.totalSales') }]} />
    </Section>
  </>
  );
};

const ReportsPage = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const [range, setRange] = useState({ from: toDateInput(new Date(Date.now() - 29 * 86400000)), to: toDateInput(new Date()) });
  const params = { from: range.from || undefined, to: range.to || undefined };
  const { data, loading, error, reload } = useAsync(() => reportsApi.summary(params), [range.from, range.to]);

  const exportCsv = async (dataset) => {
    try {
      await reportsApi.export({ dataset, ...params });
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader title={t(user.role === 'ADMIN' ? 'reports.titleAdmin' : 'dnav.tabs.reports')} description={t('reports.intro')} actions={<DateRangeFilter value={range} onChange={setRange} />} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <PageLoader />
      ) : (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          {user.role === 'SHOPKEEPER' && <Shop d={data} />}
          {user.role === 'FARMER' && <Seller d={data} />}
          {user.role === 'MANDI_OWNER' && <Seller d={data} mandi />}
          {user.role === 'DRIVER' && <Driver d={data} />}
          {user.role === 'ADMIN' && <AdminCharts d={data} />}
          <Section title={t('reports.download')} description={t('reports.downloadIntro')}>
            <div className="flex flex-wrap gap-2">
              {EXPORTS[user.role].map(([ds, labelKey]) => (
                <Button key={ds} variant="secondary" icon={Download} onClick={() => exportCsv(ds)}>
                  {t(`reports.exports.${labelKey}`)}
                </Button>
              ))}
            </div>
          </Section>
        </div>
      )}
    </>
  );
};

export default ReportsPage;
