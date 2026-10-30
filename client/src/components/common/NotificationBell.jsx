import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notificationsApi } from '../../services';
import { getSocket } from '../../services/socket';
import { timeAgo } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';

/** Bell with unread count; new notifications arrive over Socket.IO and show as a toast. */
const NotificationBell = ({ allLink }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();

  const load = () =>
    notificationsApi
      .list({ limit: 8 })
      .then(({ data, meta }) => {
        setItems(data);
        setUnread(meta.unread);
      })
      .catch(() => {});

  useEffect(() => {
    load();
    const s = getSocket();
    const onNew = (n) => {
      setUnread((u) => u + 1);
      setItems((list) => [{ ...n, id: n.id || `live-${Date.now()}` }, ...list].slice(0, 8));
      toast.info(n.title);
    };
    s.on('notification:new', onNew);
    return () => s.off('notification:new', onNew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.readAt && !String(n.id).startsWith('live-')) {
      notificationsApi.markRead(n.id).then((r) => setUnread(r.unread)).catch(() => {});
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setUnread(0);
    setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-soil-600 hover:bg-soil-100" aria-label={t('components.notifications.bellLabel', '', { n: unread })} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="num absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-chilli-500 px-1 text-[11px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-xl border border-soil-200 bg-white shadow-lift">
          <div className="flex items-center justify-between border-b border-soil-200 px-4 py-2.5">
            <p className="font-semibold">{t('common.notifications')}</p>
            {unread > 0 && (
              <button className="text-sm text-soil-500 hover:text-soil" onClick={markAll}>
                {t('components.notifications.markAllRead')}
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-soil-100 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-soil-500">{t('components.notifications.caughtUp')}</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => openItem(n)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-leafwhite ${n.readAt ? '' : 'bg-field-50/50'}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'accent-bg'}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{n.title}</span>
                    <span className="line-clamp-2 block text-sm text-soil-500">{n.message}</span>
                    <span className="mt-0.5 block text-xs text-soil-400">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link to={allLink} onClick={() => setOpen(false)} className="block border-t border-soil-200 px-4 py-2.5 text-center text-sm font-medium accent-text hover:bg-leafwhite">
            {t('components.notifications.seeAll')}
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
