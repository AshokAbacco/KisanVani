import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import StatCard from '../../components/common/StatCard';
import useList from '../../hooks/useList';
import { settlementsApi } from '../../services';
import { formatINR, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

/** Settlements (one per received order) with running totals. `as` = 'payer' | 'payee' | undefined. */
const SettlementsTable = ({ as, base, showTotals = true }) => {
  const { user } = useAuth();
  const list = useList((p) => settlementsApi.list(p), { initialFilters: { as, status: '' } });
  const t = list.meta?.totals;

  const columns = [
    { key: 'settlementNumber', header: 'Settlement', render: (s) => <span className="num whitespace-nowrap font-semibold">{s.settlementNumber}</span> },
    {
      key: 'order',
      header: 'Order',
      render: (s) => (
        <Link className="link num" to={`${base}/orders/${s.order.id}`} onClick={(e) => e.stopPropagation()}>
          {s.order.orderNumber}
        </Link>
      ),
    },
    { key: 'party', header: user.role === 'ADMIN' ? 'Payer → payee' : 'With', render: (s) => (user.role === 'ADMIN' ? `${s.payer.name} → ${s.payee.name}` : s.payerId === user.id ? `To ${s.payee.name}` : `From ${s.payer.name}`) },
    { key: 'grossAmount', header: 'Gross', align: 'right', render: (s) => formatINR(s.grossAmount) },
    { key: 'commissionAmount', header: 'Commission', align: 'right', render: (s) => (Number(s.commissionAmount) ? formatINR(s.commissionAmount) : '—') },
    { key: 'netAmount', header: 'Net', align: 'right', sortable: true, render: (s) => <span className="font-semibold">{formatINR(s.netAmount)}</span> },
    { key: 'paidAmount', header: 'Paid', align: 'right', render: (s) => formatINR(s.paidAmount) },
    { key: 'status', header: 'Status', sortable: true, render: (s) => <StatusBadge status={s.status} /> },
    { key: 'createdAt', header: 'Date', sortable: true, render: (s) => formatDate(s.createdAt) },
  ];

  return (
    <div className="space-y-4">
      {showTotals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Gross value" value={formatINR(t?.gross)} loading={!t} />
          <StatCard label="Commission & fees" value={formatINR(t?.commission)} loading={!t} tone="amber" />
          <StatCard label="Paid" value={formatINR(t?.paid)} loading={!t} tone="green" />
          <StatCard label="Outstanding" value={formatINR(t?.outstanding)} loading={!t} tone="red" />
        </div>
      )}
      <DataTable
        list={list}
        columns={columns}
        toolbar={
          <>
            <Tabs
              value={list.filters.status}
              onChange={(status) => list.setFilters({ status })}
              tabs={[
                { value: '', label: 'All' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'PARTIAL', label: 'Part paid' },
                { value: 'PAID', label: 'Paid' },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Settlement or order no." className="sm:w-60" />
          </>
        }
        empty={<EmptyState icon={FileText} title="No settlements yet" description="A settlement is created when the buyer confirms receipt of an order." />}
      />
    </div>
  );
};

export default SettlementsTable;
