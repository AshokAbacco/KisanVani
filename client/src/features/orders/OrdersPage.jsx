import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import SearchInput from '../../components/common/SearchInput';
import Tabs from '../../components/common/Tabs';
import StatusBadge from '../../components/common/StatusBadge';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import useList from '../../hooks/useList';
import { ordersApi, reportsApi } from '../../services';
import { formatINR, formatDateTime, formatKg } from '../../utils/format';
import { ORDER_TYPE_LABELS } from '../../constants/status';
import { roleLabel } from '../../constants/roles';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, Download } from 'lucide-react';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PLACED', label: 'New' },
  { value: 'ACCEPTED,PREPARING,READY', label: 'In progress' },
  { value: 'DISPATCHED,DELIVERED', label: 'On the way' },
  { value: 'RECEIVED', label: 'Completed' },
  { value: 'REJECTED,CANCELLED', label: 'Closed' },
];

/**
 * Order list shared by every role. `as` limits to buyer/seller side, `type` to one order type.
 */
const OrdersPage = ({ title = 'Orders', description, as, type, base, emptyAction, initialStatus = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const list = useList((p) => ordersApi.list(p), { initialFilters: { as, type, status: initialStatus, from: '', to: '' } });

  const counterparty = (o) => (o.buyer.id === user.id ? { label: 'Seller', p: o.seller } : { label: 'Buyer', p: o.buyer });

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      sortable: false,
      render: (o) => (
        <div>
          <p className="num whitespace-nowrap font-semibold">{o.orderNumber}</p>
          <p className="text-xs text-soil-500">{ORDER_TYPE_LABELS[o.type]}</p>
        </div>
      ),
    },
    {
      key: 'party',
      header: user.role === 'ADMIN' ? 'Buyer → Seller' : 'With',
      render: (o) =>
        user.role === 'ADMIN' ? (
          <span>
            {o.buyer.name} <span className="text-soil-400">from</span> {o.seller.name}
          </span>
        ) : (
          <div>
            <p className="font-medium">{counterparty(o).p.name}</p>
            <p className="text-xs text-soil-500">{roleLabel(counterparty(o).p.role)}</p>
          </div>
        ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (o) => (
        <span className="text-soil-600">
          {o.items
            .map((i) => `${i.product?.emoji || ''} ${i.itemName.split(' · ')[0]} ${formatKg(i.quantityKg)}`)
            .join(', ')}
        </span>
      ),
    },
    { key: 'total', header: 'Value', align: 'right', sortable: true, render: (o) => formatINR(o.total) },
    { key: 'status', header: 'Status', sortable: true, render: (o) => <StatusBadge status={o.status} /> },
    { key: 'createdAt', header: 'Placed', sortable: true, render: (o) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(o.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button variant="secondary" icon={Download} onClick={() => reportsApi.export({ dataset: 'orders', from: list.filters.from || undefined, to: list.filters.to || undefined })}>
            Export CSV
          </Button>
        }
      />
      <DataTable
        list={list}
        columns={columns}
        onRowClick={(o) => navigate(`${base}/orders/${o.id}`)}
        toolbar={
          <>
            <Tabs tabs={STATUS_TABS} value={list.filters.status} onChange={(status) => list.setFilters({ status })} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DateRangeFilter value={{ from: list.filters.from, to: list.filters.to }} onChange={(r) => list.setFilters(r)} />
              <SearchInput value={list.search} onChange={list.setSearch} placeholder="Order no., name or crop" className="sm:w-60" />
            </div>
          </>
        }
        empty={<EmptyState icon={ClipboardList} title="No orders match" description="Orders appear here as soon as they are placed." action={emptyAction} />}
      />
    </>
  );
};

export default OrdersPage;
