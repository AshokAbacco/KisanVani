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
import { formatINR, formatDateTime, formatKg, humanize } from '../../utils/format';
import { ORDER_TYPE_LABELS } from '../../constants/status';
import { roleLabel } from '../../constants/roles';
import { useAuth } from '../../context/AuthContext';
import { ClipboardList, Download } from 'lucide-react';
import { useI18n } from '../../i18n';

/* Filter groups; labels come from orders.tabs.<id>. */
const STATUS_TABS = [
  ['all', ''],
  ['new', 'PLACED'],
  ['inProgress', 'ACCEPTED,PREPARING,READY'],
  ['onTheWay', 'DISPATCHED,DELIVERED'],
  ['completed', 'RECEIVED'],
  ['closed', 'REJECTED,CANCELLED'],
];

/**
 * Order list shared by every role. `as` limits to buyer/seller side, `type` to one order type.
 * `copy` is the locale key holding this screen's title/description (routes.<screen>).
 */
const OrdersPage = ({ copy, as, type, base, emptyAction, initialStatus = '' }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const list = useList((p) => ordersApi.list(p), { initialFilters: { as, type, status: initialStatus, from: '', to: '' } });

  const counterparty = (o) => (o.buyer.id === user.id ? { p: o.seller } : { p: o.buyer });

  const columns = [
    {
      key: 'orderNumber',
      header: t('enums.ORDER'),
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
      header: t(user.role === 'ADMIN' ? 'orders.buyerSeller' : 'orders.with'),
      render: (o) =>
        user.role === 'ADMIN' ? (
          <span>
            {o.buyer.name} <span className="text-soil-400">{t('orders.from')}</span> {o.seller.name}
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
      header: t('common.items'),
      render: (o) => (
        <span className="text-soil-600">
          {o.items
            .map((i) => `${i.product?.emoji || ''} ${i.itemName.split(' · ')[0]} ${formatKg(i.quantityKg)}`)
            .join(', ')}
        </span>
      ),
    },
    { key: 'total', header: t('orders.value'), align: 'right', sortable: true, render: (o) => formatINR(o.total) },
    { key: 'status', header: t('common.status'), sortable: true, render: (o) => <StatusBadge status={o.status} /> },
    { key: 'createdAt', header: humanize('PLACED'), sortable: true, render: (o) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(o.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title={t(`${copy || 'orders'}.title`)}
        description={copy ? t(`${copy}.description`) : undefined}
        actions={
          <Button variant="secondary" icon={Download} onClick={() => reportsApi.export({ dataset: 'orders', from: list.filters.from || undefined, to: list.filters.to || undefined })}>
            {t('common.export')}
          </Button>
        }
      />
      <DataTable
        list={list}
        columns={columns}
        onRowClick={(o) => navigate(`${base}/orders/${o.id}`)}
        toolbar={
          <>
            <Tabs tabs={STATUS_TABS.map(([id, value]) => ({ value, label: t(`orders.tabs.${id}`) }))} value={list.filters.status} onChange={(status) => list.setFilters({ status })} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DateRangeFilter value={{ from: list.filters.from, to: list.filters.to }} onChange={(r) => list.setFilters(r)} />
              <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('orders.searchPlaceholder')} className="sm:w-60" />
            </div>
          </>
        }
        empty={<EmptyState icon={ClipboardList} title={t('orders.emptyTitle')} description={t('orders.emptyBody')} action={emptyAction} />}
      />
    </>
  );
};

export default OrdersPage;
