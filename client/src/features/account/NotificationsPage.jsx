import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Tabs from '../../components/common/Tabs';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import Pagination from '../../components/tables/Pagination';
import useList from '../../hooks/useList';
import { notificationsApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, timeAgo } from '../../utils/format';

const NotificationsPage = ({ children }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const list = useList((p) => notificationsApi.list(p), { initialFilters: { unread: '' } });

  const open = async (n) => {
    if (!n.readAt) await notificationsApi.markRead(n.id).catch(() => {});
    if (n.link) navigate(n.link);
    else list.reload();
  };
  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Order updates, trips, payments and messages from the KisanVani team."
        actions={
          <Button variant="secondary" icon={CheckCheck} onClick={markAll} disabled={!list.meta?.unread}>
            Mark all read
          </Button>
        }
      />
      {children}
      <div className="panel overflow-hidden">
        <div className="border-b border-soil-200 p-3">
          <Tabs
            value={list.filters.unread}
            onChange={(unread) => list.setFilters({ unread })}
            tabs={[
              { value: '', label: 'All' },
              { value: 'true', label: 'Unread', count: list.meta?.unread },
            ]}
          />
        </div>
        {list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : !list.loading && !list.items.length ? (
          <EmptyState icon={Bell} title="No notifications" description="You will be notified here when something needs your attention." />
        ) : (
          <ul className="divide-y divide-soil-100">
            {list.items.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={`flex w-full gap-4 px-4 py-4 text-left hover:bg-leafwhite ${n.readAt ? '' : 'bg-field-50/40'}`}>
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-soil-200' : 'accent-bg'}`} aria-label={n.readAt ? 'Read' : 'Unread'} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{n.title}</span>
                    <span className="block text-soil-600">{n.message}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-soil-500" title={formatDateTime(n.createdAt)}>
                    {timeAgo(n.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination meta={list.meta} page={list.page} onPage={list.setPage} />
      </div>
    </>
  );
};

export default NotificationsPage;
