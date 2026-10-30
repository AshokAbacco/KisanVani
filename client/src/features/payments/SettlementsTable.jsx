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
import { formatINR, formatDate, humanize } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

/** Settlements (one per received order) with running totals. `as` = 'payer' | 'payee' | undefined. */
const SettlementsTable = ({ as, base, showTotals = true }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const list = useList((p) => settlementsApi.list(p), { initialFilters: { as, status: '' } });
  const totals = list.meta?.totals;

  const columns = [
    { key: 'settlementNumber', header: t('orderDetail.settlement'), render: (s) => <span className="num whitespace-nowrap font-semibold">{s.settlementNumber}</span> },
    {
      key: 'order',
      header: t('enums.ORDER'),
      render: (s) => (
        <Link className="link num" to={`${base}/orders/${s.order.id}`} onClick={(e) => e.stopPropagation()}>
          {s.order.orderNumber}
        </Link>
      ),
    },
    { key: 'party', header: t(user.role === 'ADMIN' ? 'settlements.payerPayee' : 'orders.with'), render: (s) => (user.role === 'ADMIN' ? `${s.payer.name} → ${s.payee.name}` : s.payerId === user.id ? t('mandiDash.toName', '', { name: s.payee.name }) : t('mandiDash.fromName', '', { name: s.payer.name })) },
    { key: 'grossAmount', header: t('settlements.gross'), align: 'right', render: (s) => formatINR(s.grossAmount) },
    { key: 'commissionAmount', header: t('userDetail.commission'), align: 'right', render: (s) => (Number(s.commissionAmount) ? formatINR(s.commissionAmount) : '—') },
    { key: 'netAmount', header: t('settlements.net'), align: 'right', sortable: true, render: (s) => <span className="font-semibold">{formatINR(s.netAmount)}</span> },
    { key: 'paidAmount', header: t('purchases.paid'), align: 'right', render: (s) => formatINR(s.paidAmount) },
    { key: 'status', header: t('common.status'), sortable: true, render: (s) => <StatusBadge status={s.status} /> },
    { key: 'createdAt', header: t('common.date'), sortable: true, render: (s) => formatDate(s.createdAt) },
  ];

  return (
    <div className="space-y-4">
      {showTotals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t('settlements.grossValue')} value={formatINR(totals?.gross)} loading={!totals} />
          <StatCard label={t('settlements.commissionFees')} value={formatINR(totals?.commission)} loading={!totals} tone="amber" />
          <StatCard label={t('purchases.paid')} value={formatINR(totals?.paid)} loading={!totals} tone="green" />
          <StatCard label={t('settlements.outstanding')} value={formatINR(totals?.outstanding)} loading={!totals} tone="red" />
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
                { value: '', label: t('common.all') },
                { value: 'PENDING', label: humanize('PENDING') },
                { value: 'PARTIAL', label: t('settlements.partPaid') },
                { value: 'PAID', label: humanize('PAID') },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('settlements.searchPlaceholder')} className="sm:w-60" />
          </>
        }
        empty={<EmptyState icon={FileText} title={t('settlements.emptyTitle')} description={t('settlements.emptyBody')} />}
      />
    </div>
  );
};

export default SettlementsTable;
