import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section from '../../components/common/Section';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/tables/DataTable';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { BarsChart } from '../../components/charts/Charts';
import useAsync from '../../hooks/useAsync';
import { driverApi } from '../../services';
import { formatINR, formatDate, modeLabel } from '../../utils/format';

const EarningsPage = () => {
  const { data, loading, error, reload } = useAsync(() => driverApi.earnings(), []);
  const t = data?.totals;
  return (
    <>
      <PageHeader title="Earnings" description="Transport charges for delivered trips and the payments you have received." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Earned" value={formatINR(t?.earned)} icon={Wallet} loading={loading} />
        <StatCard label="Received" value={formatINR(t?.received)} tone="green" loading={loading} />
        <StatCard label="Still to be paid" value={formatINR(t?.pending)} tone="red" loading={loading} />
        <StatCard label="Delivered trips" value={t?.trips} tone="blue" loading={loading} />
      </div>
      <div className="space-y-6">
        <Section title="By month">
          <BarsChart data={[...(data?.monthly || [])].reverse()} x="month" series={[{ key: 'earned', label: 'Earned' }, { key: 'received', label: 'Received' }]} />
        </Section>
        <Section title="Delivered trips" bodyClass="p-0">
          <DataTable
            list={{ items: data?.trips || [], loading, error, reload, meta: null }}
            columns={[
              { key: 'tripNumber', header: 'Trip', render: (tr) => <Link to={`/driver/trips/${tr.id}`} className="link num">{tr.tripNumber}</Link> },
              { key: 'commodity', header: 'Load' },
              { key: 'deliveredAt', header: 'Delivered', render: (tr) => formatDate(tr.deliveredAt) },
              { key: 'transportCharge', header: 'Charge', align: 'right', render: (tr) => formatINR(tr.transportCharge) },
              { key: 'amountPaid', header: 'Received', align: 'right', render: (tr) => formatINR(tr.amountPaid) },
              {
                key: 'state',
                header: 'Payment',
                render: (tr) => {
                  const due = Number(tr.transportCharge) - Number(tr.amountPaid);
                  return <StatusBadge status={due <= 0.004 ? 'PAID' : Number(tr.amountPaid) > 0 ? 'PARTIAL' : 'UNPAID'} />;
                },
              },
            ]}
            empty={<EmptyState icon={Wallet} compact title="No delivered trips yet" />}
          />
        </Section>
        <Section title="Payments received" bodyClass="p-0">
          <ul className="divide-y divide-soil-100">
            {(data?.payments || []).map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  <span className="num whitespace-nowrap font-semibold">{p.paymentNumber}</span> from {p.payer?.name} for {p.trip?.tripNumber}
                  <span className="block text-xs text-soil-500">
                    {formatDate(p.createdAt)} by {modeLabel(p.mode)}
                  </span>
                </span>
                <span className="num whitespace-nowrap font-semibold">{formatINR(p.amount)}</span>
              </li>
            ))}
            {!loading && !data?.payments?.length && <li className="px-5 py-8 text-center text-sm text-soil-500">No payments yet.</li>}
          </ul>
        </Section>
      </div>
    </>
  );
};

export default EarningsPage;
