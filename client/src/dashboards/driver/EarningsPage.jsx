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
import { formatINR, formatDate, modeLabel, humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

const EarningsPage = () => {
  const { t } = useI18n();
  const { data, loading, error, reload } = useAsync(() => driverApi.earnings(), []);
  const totals = data?.totals;
  return (
    <>
      <PageHeader title={t('dnav.items.earnings')} description={t('earnings.intro')} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('earnings.earned')} value={formatINR(totals?.earned)} icon={Wallet} loading={loading} />
        <StatCard label={t('purchases.received')} value={formatINR(totals?.received)} tone="green" loading={loading} />
        <StatCard label={t('earnings.stillToBePaid')} value={formatINR(totals?.pending)} tone="red" loading={loading} />
        <StatCard label={t('earnings.deliveredTrips')} value={totals?.trips} tone="blue" loading={loading} />
      </div>
      <div className="space-y-6">
        <Section title={t('earnings.byMonth')}>
          <BarsChart data={[...(data?.monthly || [])].reverse()} x="month" series={[{ key: 'earned', label: t('earnings.earned') }, { key: 'received', label: t('purchases.received') }]} />
        </Section>
        <Section title={t('earnings.deliveredTrips')} bodyClass="p-0">
          <DataTable
            list={{ items: data?.trips || [], loading, error, reload, meta: null }}
            columns={[
              { key: 'tripNumber', header: t('trips.trip'), render: (tr) => <Link to={`/driver/trips/${tr.id}`} className="link num">{tr.tripNumber}</Link> },
              { key: 'commodity', header: t('trips.load') },
              { key: 'deliveredAt', header: humanize('DELIVERED'), render: (tr) => formatDate(tr.deliveredAt) },
              { key: 'transportCharge', header: t('trips.charge'), align: 'right', render: (tr) => formatINR(tr.transportCharge) },
              { key: 'amountPaid', header: t('purchases.received'), align: 'right', render: (tr) => formatINR(tr.amountPaid) },
              {
                key: 'state',
                header: t('earnings.payment'),
                render: (tr) => {
                  const due = Number(tr.transportCharge) - Number(tr.amountPaid);
                  return <StatusBadge status={due <= 0.004 ? 'PAID' : Number(tr.amountPaid) > 0 ? 'PARTIAL' : 'UNPAID'} />;
                },
              },
            ]}
            empty={<EmptyState icon={Wallet} compact title={t('earnings.noDelivered')} />}
          />
        </Section>
        <Section title={t('earnings.paymentsReceived')} bodyClass="p-0">
          <ul className="divide-y divide-soil-100">
            {(data?.payments || []).map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>
                  <span className="num whitespace-nowrap font-semibold">{p.paymentNumber}</span> {t('earnings.fromFor', '', { payer: p.payer?.name || '', trip: p.trip?.tripNumber || '' })}
                  <span className="block text-xs text-soil-500">
                    {t('earnings.dateBy', '', { date: formatDate(p.createdAt), mode: modeLabel(p.mode) })}
                  </span>
                </span>
                <span className="num whitespace-nowrap font-semibold">{formatINR(p.amount)}</span>
              </li>
            ))}
            {!loading && !data?.payments?.length && <li className="px-5 py-8 text-center text-sm text-soil-500">{t('earnings.noPayments')}</li>}
          </ul>
        </Section>
      </div>
    </>
  );
};

export default EarningsPage;
