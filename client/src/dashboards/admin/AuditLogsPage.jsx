import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import SearchInput from '../../components/common/SearchInput';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/modals/Modal';
import useList from '../../hooks/useList';
import { adminApi } from '../../services';
import { roleLabel } from '../../constants/roles';
import { formatDateTime, humanize } from '../../utils/format';

/** Read-only audit trail. Entries cannot be edited or deleted from the application. */
const AuditLogsPage = () => {
  const [detail, setDetail] = useState(null);
  const list = useList((p) => adminApi.auditLogs(p), { initialFilters: { entityType: '', from: '', to: '' }, pageSize: 30 });
  return (
    <>
      <PageHeader title="Audit logs" description="Sign-ins, approvals, rate changes, cancellations, payments and settings changes — who did what, and when." />
      <DataTable
        list={list}
        dense
        onRowClick={setDetail}
        columns={[
          { key: 'createdAt', header: 'When', render: (a) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(a.createdAt)}</span> },
          { key: 'action', header: 'Action', render: (a) => <span className="font-medium">{humanize(a.action)}</span> },
          { key: 'actor', header: 'By', render: (a) => (a.actor ? `${a.actor.name} (${roleLabel(a.actor.role)})` : 'System') },
          { key: 'entity', header: 'Record', render: (a) => <span className="text-soil-600">{a.entityType}{a.entityId ? ` — ${String(a.entityId).slice(0, 8)}` : ''}</span> },
          { key: 'ip', header: 'IP', render: (a) => <span className="num text-xs text-soil-400">{a.ipAddress || '—'}</span> },
        ]}
        toolbar={
          <>
            <div className="flex flex-wrap gap-2">
              <select className="input h-9 w-auto py-1" value={list.filters.entityType} onChange={(e) => list.setFilters({ entityType: e.target.value })} aria-label="Record type">
                <option value="">All record types</option>
                {(list.meta?.entityTypes || []).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <DateRangeFilter value={{ from: list.filters.from, to: list.filters.to }} onChange={(r) => list.setFilters(r)} />
            </div>
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Action or person" className="sm:w-60" />
          </>
        }
        empty={<EmptyState icon={ScrollText} title="No entries" />}
      />
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? humanize(detail.action) : ''} description={detail ? formatDateTime(detail.createdAt) : ''}>
        {detail && <pre className="max-h-96 overflow-auto rounded-lg bg-soil-100 p-3 text-xs">{JSON.stringify({ actor: detail.actor?.name, entityType: detail.entityType, entityId: detail.entityId, ip: detail.ipAddress, details: detail.metadata }, null, 2)}</pre>}
      </Modal>
    </>
  );
};

export default AuditLogsPage;
