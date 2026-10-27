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
import { formatINR, formatDateTime, modeLabel } from '../../utils/format';
import { PAYMENT_PURPOSES } from '../../constants/status';
import { useAuth } from '../../context/AuthContext';

const PURPOSE_TABS = [{ value: '', label: 'All' }, ...Object.entries(PAYMENT_PURPOSES).map(([value, label]) => ({ value, label }))];

/** Payments ledger (+ settlements tab for trading roles). */
const PaymentsPage = ({ title = 'Payments', description = 'Money recorded in and out of your account.', base, withSettlements = true, purposes }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('payments');
  const summary = useAsync(() => paymentsApi.summary(), []);
  const list = useList((p) => paymentsApi.list(p), { initialFilters: { purpose: '', from: '', to: '' } });

  const relation = (p) => {
    if (user.role === 'ADMIN') return `${p.payer?.name || p.customer?.name || 'Walk-in'} → ${p.payee?.name || '—'}`;
    if (p.payeeId === user.id) return { dir: 'in', who: p.payer?.name || p.customer?.name || 'Walk-in customer' };
    return { dir: 'out', who: p.payee?.name || p.purchaseOrder?.poNumber || 'Supplier' };
  };

  const columns = [
    { key: 'paymentNumber', header: 'Payment', render: (p) => <span className="num whitespace-nowrap font-semibold">{p.paymentNumber}</span> },
    { key: 'purpose', header: 'For', render: (p) => PAYMENT_PURPOSES[p.purpose] },
    {
      key: 'party',
      header: user.role === 'ADMIN' ? 'From → to' : 'With',
      render: (p) => {
        const r = relation(p);
        if (typeof r === 'string') return r;
        return (
          <span className="inline-flex items-center gap-1.5">
            {r.dir === 'in' ? <ArrowDownLeft className="h-4 w-4 text-field-600" aria-label="Received" /> : <ArrowUpRight className="h-4 w-4 text-chilli-500" aria-label="Paid" />}
            {r.who}
          </span>
        );
      },
    },
    {
      key: 'ref',
      header: 'Reference',
      render: (p) => <span className="text-soil-500">{p.order?.orderNumber || p.invoice?.invoiceNumber || p.trip?.tripNumber || p.purchaseOrder?.poNumber || p.reference || '—'}</span>,
    },
    { key: 'mode', header: 'Mode', render: (p) => modeLabel(p.mode) },
    { key: 'amount', header: 'Amount', align: 'right', sortable: true, render: (p) => <span className="font-semibold">{formatINR(p.amount)}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status === 'COMPLETED' ? 'PAID' : p.status}>{p.status === 'COMPLETED' ? 'Completed' : undefined}</StatusBadge> },
    { key: 'createdAt', header: 'Date', sortable: true, render: (p) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(p.createdAt)}</span> },
  ];

  const total = (rows) => rows?.reduce((a, r) => a + Number(r.amount), 0) || 0;

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="secondary" icon={Download} onClick={() => reportsApi.export({ dataset: 'payments', from: list.filters.from || undefined, to: list.filters.to || undefined })}>
            Export CSV
          </Button>
        }
      />
      {user.role !== 'ADMIN' && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {[
            ['Received in the last 30 days', summary.data?.inflow, 'text-field-700'],
            ['Paid in the last 30 days', summary.data?.outflow, 'text-chilli-600'],
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
            { value: 'payments', label: 'Payments' },
            { value: 'settlements', label: 'Settlements' },
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
              <Tabs tabs={purposes ? PURPOSE_TABS.filter((t) => !t.value || purposes.includes(t.value)) : PURPOSE_TABS} value={list.filters.purpose} onChange={(purpose) => list.setFilters({ purpose })} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DateRangeFilter value={{ from: list.filters.from, to: list.filters.to }} onChange={(r) => list.setFilters(r)} />
                <SearchInput value={list.search} onChange={list.setSearch} placeholder="Payment no. or reference" className="sm:w-56" />
              </div>
            </>
          }
          empty={<EmptyState icon={Wallet} title="No payments recorded" description="Payments appear here when bills are paid, orders are settled or transport is paid for." />}
        />
      )}
    </>
  );
};

export default PaymentsPage;
