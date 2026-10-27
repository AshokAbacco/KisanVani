import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HandCoins } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import SearchInput from '../../components/common/SearchInput';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import RecordPaymentModal from '../../features/payments/RecordPaymentModal';
import useList from '../../hooks/useList';
import { customersApi } from '../../services';
import { formatINR } from '../../utils/format';

/** Udhar / khata overview: every customer who owes money, largest first. */
const CreditPage = () => {
  const navigate = useNavigate();
  const [collecting, setCollecting] = useState(null);
  const list = useList((p) => customersApi.list(p), { initialFilters: { withCredit: 'true' }, sortBy: 'creditBalance', sortOrder: 'desc' });

  return (
    <>
      <PageHeader title="Udhar / Khata" description="Money customers owe the shop from credit bills." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total outstanding" value={formatINR(list.meta?.totalOutstanding)} tone="red" loading={!list.meta} icon={HandCoins} />
        <StatCard label="Customers with udhar" value={list.meta?.total} loading={!list.meta} />
      </div>
      <DataTable
        list={list}
        onRowClick={(c) => navigate(`/shop/customers/${c.id}`)}
        columns={[
          { key: 'name', header: 'Customer', sortable: true, render: (c) => <span className="font-medium">{c.name}</span> },
          { key: 'mobile', header: 'Mobile', render: (c) => <a className="link num" href={`tel:${c.mobile}`} onClick={(e) => e.stopPropagation()}>{c.mobile}</a> },
          { key: 'creditBalance', header: 'Due', align: 'right', sortable: true, render: (c) => <span className="font-semibold text-chilli-600">{formatINR(c.creditBalance)}</span> },
          {
            key: 'used',
            header: 'Of limit',
            render: (c) => {
              const pct = Math.min(100, (Number(c.creditBalance) / Math.max(1, Number(c.creditLimit))) * 100);
              return (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-soil-100">
                    <div className={`h-full ${pct > 80 ? 'bg-chilli-500' : 'bg-turmeric-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="num text-xs text-soil-500">{pct.toFixed(0)}%</span>
                </div>
              );
            },
          },
          {
            key: 'collect',
            header: '',
            render: (c) => (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollecting(c);
                }}
              >
                Collect
              </Button>
            ),
          },
        ]}
        toolbar={<SearchInput value={list.search} onChange={list.setSearch} placeholder="Name or mobile" className="sm:w-72" />}
        empty={<EmptyState icon={HandCoins} title="No udhar outstanding" description="Credit bills from the billing screen appear here until they are collected." />}
      />
      <RecordPaymentModal open={!!collecting} onClose={() => setCollecting(null)} title={`Collect from ${collecting?.name || ''}`} due={Number(collecting?.creditBalance || 0)} modes={['CASH', 'UPI', 'BANK_TRANSFER']} onSubmit={(body) => customersApi.collect(collecting.id, body).then(list.reload)} />
    </>
  );
};

export default CreditPage;
