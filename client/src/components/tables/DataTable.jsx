import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import EmptyState from '../common/EmptyState';
import ErrorState from '../feedback/ErrorState';
import Pagination from './Pagination';
import { useI18n } from '../../i18n';

/**
 * Server-driven table.
 * columns: [{ key, header, render?(row), sortable?, align?, className? }]
 * Pass the object returned by useList() as `list`, or `rows` for static data.
 */
const DataTable = ({ columns, list, rows, rowKey = 'id', onRowClick, empty, toolbar, footer, dense = false }) => {
  const { t } = useI18n();
  const items = list ? list.items : rows || [];
  const loading = list?.loading && !items.length;
  const pad = dense ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className="panel overflow-hidden">
      {toolbar && <div className="flex flex-col gap-3 border-b border-soil-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">{toolbar}</div>}
      {list?.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-soil-100/60 text-left text-xs text-soil-500">
              <tr>
                {columns.map((c) => {
                  const sorted = list?.sort?.sortBy === c.key;
                  const Icon = sorted ? (list.sort.sortOrder === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
                  return (
                    <th key={c.key} scope="col" className={`${pad} whitespace-nowrap font-semibold ${c.align === 'right' ? 'text-right' : ''}`} aria-sort={sorted ? (list.sort.sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {c.sortable && list ? (
                        <button className="inline-flex items-center gap-1 hover:text-soil" onClick={() => list.toggleSort(c.key)}>
                          {c.header}
                          <Icon className={`h-3.5 w-3.5 ${sorted ? 'text-soil' : 'opacity-50'}`} aria-hidden />
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-soil-200">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td key={c.key} className={pad}>
                          <div className="h-4 w-full max-w-[140px] animate-pulse rounded bg-soil-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : items.map((row) => (
                    <tr
                      key={row[rowKey]}
                      className={`${onRowClick ? 'cursor-pointer hover:bg-leafwhite' : ''} ${list?.loading ? 'opacity-60' : ''}`}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                    >
                      {columns.map((c) => (
                        <td key={c.key} className={`${pad} align-middle ${c.align === 'right' ? 'num text-right' : ''} ${c.className || ''}`}>
                          {c.render ? c.render(row) : row[c.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && !items.length && (empty || <EmptyState compact title={t('components.table.emptyTitle')} description={t('components.table.emptyBody')} />)}
        </div>
      )}
      {list && <Pagination meta={list.meta} page={list.page} onPage={list.setPage} />}
      {footer}
    </div>
  );
};

export default DataTable;
