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

const EXPORTS = {
  SHOPKEEPER: [
    ['sales', 'Sales bills'],
    ['stock', 'Stock levels'],
    ['credit', 'Udhar balances'],
    ['orders', 'Purchase orders'],
    ['payments', 'Payments'],
  ],
  FARMER: [
    ['orders', 'Orders'],
    ['settlements', 'Settlements'],
    ['payments', 'Payments'],
  ],
  MANDI_OWNER: [
    ['orders', 'Orders'],
    ['settlements', 'Settlements'],
    ['trips', 'Trips'],
    ['payments', 'Payments'],
  ],
  DRIVER: [
    ['trips', 'Trips'],
    ['payments', 'Payments'],
  ],
  ADMIN: [
    ['users', 'Users'],
    ['orders', 'Orders'],
    ['trips', 'Trips'],
    ['payments', 'Payments'],
    ['settlements', 'Settlements'],
    ['sales', 'POS sales'],
  ],
};

const Shop = ({ d }) => (
  <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Sales" value={formatINR(d.totals.sales)} hint={plural(d.totals.bills, 'bill')} />
      <StatCard label="Average bill" value={formatINR(d.totals.averageBill)} />
      <StatCard label="Given on udhar" value={formatINR(d.totals.creditGiven)} tone="amber" hint={`Discounts ${formatINR(d.totals.discount)}`} />
      <StatCard label="Bought on KisanVani" value={formatINR(d.totals.platformPurchases)} tone="blue" hint={`${plural(d.totals.platformPurchaseOrders, 'order')} received`} />
    </div>
    <Section title="Daily sales">
      <TrendChart data={d.daily} series={[{ key: 'amount', label: 'Sales' }]} />
    </Section>
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Top products by value">
        <BarsChart data={d.topProducts} layout="vertical" series={[{ key: 'amount', label: 'Sales' }]} />
      </Section>
      <Section title="By payment mode">
        <BarsChart data={d.byPaymentMode.map((m) => ({ ...m, name: modeLabel(m.mode) }))} series={[{ key: 'amount', label: 'Sales' }]} />
      </Section>
    </div>
  </>
);

const Seller = ({ d, mandi }) => (
  <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Settled value (gross)" value={formatINR(d.totals.gross)} />
      <StatCard label="Net receivable" value={formatINR(d.totals.net)} hint={Number(d.totals.commission) ? `After ${formatINR(d.totals.commission)} fees` : undefined} />
      <StatCard label="Received" value={formatINR(d.totals.received)} tone="green" />
      <StatCard label="Outstanding" value={formatINR(d.totals.outstanding)} tone="red" />
    </div>
    {mandi && (
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Bought from farmers" value={formatINR(d.procurement.amount)} hint={plural(d.procurement.orders, 'order')} tone="blue" />
        <StatCard label="Commission earned" value={formatINR(d.commissionEarned)} tone="amber" />
      </div>
    )}
    <Section title="Orders received per day">
      <TrendChart data={d.daily} series={[{ key: 'amount', label: 'Order value' }]} />
    </Section>
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Top products">
        <BarsChart data={d.topProducts} layout="vertical" series={[{ key: 'amount', label: 'Value' }]} />
      </Section>
      <Section title="Top buyers">
        <BarsChart data={d.topBuyers.map((b) => ({ ...b, name: `${b.name} (${roleLabel(b.role)})` }))} layout="vertical" series={[{ key: 'amount', label: 'Value' }]} />
      </Section>
    </div>
    <Section title="Orders by status">
      <BarsChart data={d.orderStatus.map((s) => ({ name: humanize(s.status), count: s.count }))} kind="count" series={[{ key: 'count', label: 'Orders' }]} height={220} />
    </Section>
  </>
);

const Driver = ({ d }) => (
  <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Trips delivered" value={formatNumber(d.totals.trips)} />
      <StatCard label="Earned" value={formatINR(d.totals.earned)} />
      <StatCard label="Received" value={formatINR(d.totals.received)} tone="green" hint={`Pending ${formatINR(d.totals.pending)}`} />
      <StatCard label="Weight delivered" value={formatKg(d.totals.deliveredKg, { grams: false })} tone="blue" />
    </div>
    <Section title="Earnings by day">
      <BarsChart data={d.daily} x="day" series={[{ key: 'amount', label: 'Earnings' }]} />
    </Section>
    <Section title="Trips by status">
      <BarsChart data={d.tripStatus.map((s) => ({ name: humanize(s.status), count: s.count }))} kind="count" series={[{ key: 'count', label: 'Trips' }]} height={220} />
    </Section>
  </>
);

export const AdminCharts = ({ d }) => (
  <>
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Order volume">
        <BarsChart data={d.orders} x="day" kind="count" series={[{ key: 'orders', label: 'Orders' }]} />
      </Section>
      <Section title="Trade value">
        <TrendChart data={d.orders} series={[{ key: 'value', label: 'Order value' }]} />
      </Section>
      <Section title="Registrations by role">
        <BarsChart
          data={d.registrations}
          x="day"
          kind="count"
          stacked
          series={[
            { key: 'FARMER', label: 'Farmers' },
            { key: 'SHOPKEEPER', label: 'Shopkeepers' },
            { key: 'MANDI_OWNER', label: 'Market Mandi' },
            { key: 'DRIVER', label: 'Drivers' },
          ]}
        />
      </Section>
      <Section title="Completed trips">
        <BarsChart data={d.completedTrips} x="day" kind="count" series={[{ key: 'trips', label: 'Trips delivered' }]} />
      </Section>
    </div>
    <Section title="POS sales across shops">
      <TrendChart data={d.posSales} series={[{ key: 'amount', label: 'POS sales' }]} />
    </Section>
  </>
);

const ReportsPage = () => {
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
      <PageHeader title={user.role === 'ADMIN' ? 'Reports & analytics' : 'Reports'} description="Figures for the selected period. Dates follow Indian Standard Time." actions={<DateRangeFilter value={range} onChange={setRange} />} />
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
          <Section title="Download data" description="CSV files open in Excel or Google Sheets. Rupee amounts are plain numbers.">
            <div className="flex flex-wrap gap-2">
              {EXPORTS[user.role].map(([ds, label]) => (
                <Button key={ds} variant="secondary" icon={Download} onClick={() => exportCsv(ds)}>
                  {label}
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
