import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil, HandCoins, Phone } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section, { DetailList } from '../../components/common/Section';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';
import RecordPaymentModal from '../../features/payments/RecordPaymentModal';
import { CustomerForm } from './CustomersPage';
import useAsync from '../../hooks/useAsync';
import { customersApi } from '../../services';
import { formatINR, formatDateTime, modeLabel } from '../../utils/format';

/** Customer khata: credit sales and collections in date order, with a collect-payment action. */
const CustomerDetailPage = () => {
  const { id } = useParams();
  const { data: c, loading, error, reload } = useAsync(() => customersApi.get(id), [id]);
  const [editing, setEditing] = useState(false);
  const [collecting, setCollecting] = useState(false);

  if (loading && !c) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const due = Number(c.creditBalance);

  return (
    <>
      <PageHeader
        back={{ to: '/shop/customers', label: 'Customers' }}
        title={c.name}
        description={`Customer since ${formatDateTime(c.createdAt)}`}
        actions={
          <>
            <Button variant="ghost" icon={Phone} href={`tel:${c.mobile}`}>
              {c.mobile}
            </Button>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button icon={HandCoins} onClick={() => setCollecting(true)} disabled={due <= 0}>
              Collect udhar
            </Button>
          </>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Udhar due" value={formatINR(due)} tone={due > 0 ? 'red' : 'green'} />
        <StatCard label="Credit limit" value={formatINR(c.creditLimit)} hint={`${formatINR(Math.max(0, Number(c.creditLimit) - due))} available`} />
        <StatCard label="Bills" value={c.invoices.length} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Section title="Khata" description="Credit given and payments collected" bodyClass="p-0">
          <DataTable
            rows={c.ledger.map((l, i) => ({ ...l, id: `${l.reference}-${i}` }))}
            columns={[
              { key: 'date', header: 'Date', render: (l) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(l.date)}</span> },
              { key: 'type', header: 'Entry', render: (l) => ({ CREDIT_SALE: 'Credit bill', CREDIT_REVERSED: 'Bill cancelled', COLLECTION: `Collected (${modeLabel(l.mode)})` })[l.type] },
              { key: 'reference', header: 'Reference', render: (l) => <span className="num">{l.reference}</span> },
              { key: 'debit', header: 'Credit given', align: 'right', render: (l) => (Number(l.debit) ? formatINR(l.debit) : '') },
              { key: 'credit', header: 'Collected', align: 'right', render: (l) => (Number(l.credit) ? formatINR(l.credit) : '') },
            ]}
          />
        </Section>
        <div className="space-y-6">
          <Section title="Details">
            <DetailList cols={1} items={[['Mobile', c.mobile], ['Address', c.address], ['Notes', c.notes]]} />
          </Section>
          <Section title="Recent bills" bodyClass="p-0">
            <ul className="divide-y divide-soil-100">
              {c.invoices.slice(0, 10).map((i) => (
                <li key={i.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>
                    <Link to={`/shop/invoices/${i.id}/print`} className="link num">
                      {i.invoiceNumber}
                    </Link>
                    <span className="block text-xs text-soil-500">{formatDateTime(i.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {i.status === 'CANCELLED' && <StatusBadge status="CANCELLED" />}
                    <span className="num whitespace-nowrap font-semibold">{formatINR(i.total)}</span>
                  </span>
                </li>
              ))}
              {!c.invoices.length && <li className="px-5 py-8 text-center text-sm text-soil-500">No bills yet.</li>}
            </ul>
          </Section>
        </div>
      </div>
      {editing && <CustomerForm customer={c} onClose={() => setEditing(false)} onSaved={reload} />}
      <RecordPaymentModal open={collecting} onClose={() => setCollecting(false)} title="Collect udhar" due={due} payeeName={undefined} modes={['CASH', 'UPI', 'BANK_TRANSFER']} onSubmit={(body) => customersApi.collect(c.id, body).then(reload)} />
    </>
  );
};

export default CustomerDetailPage;
