import { useState } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import SettlementsTable from './SettlementsTable';
import useList from '../../hooks/useList';
import useAsync from '../../hooks/useAsync';
import { paymentsApi, reportsApi } from '../../services';
import { formatINR, formatDateTime, modeLabel, humanize } from '../../utils/format';
import { PAYMENT_PURPOSES } from '../../constants/status';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';


/** Payments ledger (+ settlements tab for trading roles). */
/** `copy` is the locale key holding this screen's title/description (routes.<screen>). */
const PaymentsPage = ({ copy = 'payments', base, withSettlements = true, purposes }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  // Built at render time so the purpose labels follow the active language.
  const purposeTabs = [{ value: '', label: t('common.all') }, ...Object.entries(PAYMENT_PURPOSES).map(([value, label]) => ({ value, label }))];
  const [tab, setTab] = useState('payments');
  const summary = useAsync(() => paymentsApi.summary(), []);
  const list = useList((p) => paymentsApi.list(p), { initialFilters: { purpose: '', from: '', to: '' } });

  const relation = (p) => {
    if (user.role === 'ADMIN') return `${p.payer?.name || p.customer?.name || t('shopDash.walkIn')} → ${p.payee?.name || '—'}`;
    if (p.payeeId === user.id) return { dir: 'in', who: p.payer?.name || p.customer?.name || t('payments.walkInCustomer') };
    return { dir: 'out', who: p.payee?.name || p.purchaseOrder?.poNumber || t('purchases.supplier') };
  };

  const columns = [
    { key: 'paymentNumber', header: t('earnings.payment'), render: (p) => <span className="num whitespace-nowrap font-semibold">{p.paymentNumber}</span> },
    { key: 'purpose', header: t('payments.for'), render: (p) => PAYMENT_PURPOSES[p.purpose] },
    {
      key: 'party',
      header: t(user.role === 'ADMIN' ? 'payments.fromTo' : 'orders.with'),
      render: (p) => {
        const r = relation(p);
        if (typeof r === 'string') return r;
        return (
          <span className="inline-flex items-center gap-1.5">
            {r.dir === 'in' ? <ArrowDownLeft className="h-4 w-4 text-field-600" aria-label={t('purchases.received')} /> : <ArrowUpRight className="h-4 w-4 text-chilli-500" aria-label={t('purchases.paid')} />}
            {r.who}
          </span>
        );
      },
    },
    {
      key: 'ref',
      header: t('common.reference'),
      render: (p) => <span className="text-soil-500">{p.order?.orderNumber || p.invoice?.invoiceNumber || p.trip?.tripNumber || p.purchaseOrder?.poNumber || p.reference || '—'}</span>,
    },
    { key: 'mode', header: t('payments.mode'), render: (p) => modeLabel(p.mode) },
    { key: 'amount', header: t('common.amount'), align: 'right', sortable: true, render: (p) => <span className="font-semibold">{formatINR(p.amount)}</span> },
    { key: 'status', header: t('common.status'), render: (p) => <StatusBadge status={p.status === 'COMPLETED' ? 'PAID' : p.status}>{p.status === 'COMPLETED' ? humanize('COMPLETED') : undefined}</StatusBadge> },
    { key: 'createdAt', header: t('common.date'), sortable: true, render: (p) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(p.createdAt)}</span> },
  ];

  const total = (rows) => rows?.reduce((a, r) => a + Number(r.amount), 0) || 0;

  return (
    <>
      <PageHeader
        title={t(`${copy}.title`)}
        description={t(`${copy}.description`)}
        actions={
          <Button variant="secondary" icon={Download} onClick={() => reportsApi.export({ dataset: 'payments', from: list.filters.from || undefined, to: list.filters.to || undefined })}>
            {t('common.export')}
          </Button>
        }
      />
      {user.role !== 'ADMIN' && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {[
            [t('payments.received30'), summary.data?.inflow, 'text-field-700'],
            [t('payments.paid30'), summary.data?.outflow, 'text-chilli-600'],
          ].map(([label, rows, cls]) => (
            <Section key={label}>
              <p className="text-sm text-soil-500">{label}</p>
              <p className={`num mt-1 font-display text-3xl font-semibold ${cls}`}>{summary.loading ? '…' : formatINR(total(rows))}</p>
              <ul className="mt-3 space-y-1 text-sm text-soil-600">
                {(rows || []).map((r) => (
                  <li key={r.purpose} className="flex justify-between">
                    <span>
                      {PAYMENT_PURPOSES[r.purpose]} ({r.count})
                    </span>
                    <span className="num">{formatINR(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ))}
        </div>
      )}
      {withSettlements && (
        <Tabs
          className="mb-4"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'payments', label: t('dnav.tabs.payments') },
            { value: 'settlements', label: t('dnav.tabs.settlements') },
          ]}
        />
      )}
      {tab === 'settlements' ? (
        <SettlementsTable base={base} />
      ) : (
        <DataTable
          list={list}
          columns={columns}
          toolbar={
            <>
              <Tabs tabs={purposes ? purposeTabs.filter((pt) => !pt.value || purposes.includes(pt.value)) : purposeTabs} value={list.filters.purpose} onChange={(purpose) => list.setFilters({ purpose })} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DateRangeFilter value={{ from: list.filters.from, to: list.filters.to }} onChange={(r) => list.setFilters(r)} />
                <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('payments.searchPlaceholder')} className="sm:w-56" />
              </div>
            </>
          }
          empty={<EmptyState icon={Wallet} title={t('payments.emptyTitle')} description={t('payments.emptyBody')} />}
        />
      )}
    </>
  );
};

export default PaymentsPage;
