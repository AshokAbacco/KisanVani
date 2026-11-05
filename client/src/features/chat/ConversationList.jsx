import { useMemo, useState } from 'react';
import { MessagesSquare, Plus, Search, X } from 'lucide-react';
import Avatar from '../../components/common/Avatar';
import MessageTicks from './MessageTicks';
import { listTime } from './chatFormat';
import { useI18n } from '../../i18n';

/** Avatar with a green dot while the person is online. */
export const PresenceAvatar = ({ person, size = 'h-12 w-12' }) => (
  <span className="relative shrink-0">
    <Avatar name={person.name} src={person.avatarUrl} size={size} />
    {person.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" aria-hidden />}
  </span>
);

/** Left pane: search, "+" for a new chat, and every conversation with its last message and unread count. */
const ConversationList = ({ me, conversations, loading, activeId, typing, onSelect, onNew }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.partner.name.toLowerCase().includes(q) || (c.partner.mobile || '').includes(q.replace(/\D/g, '') || '§') || t(`roleNames.${c.partner.role}`).toLowerCase().includes(q)
    );
  }, [conversations, query, t]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-soil-200 bg-soil-50 px-4">
        <h1 className="font-display text-xl font-bold text-soil">{t('chat.title', 'Chats')}</h1>
        <button
          type="button"
          onClick={onNew}
          className="grid h-10 w-10 place-items-center rounded-full bg-green-700 text-white shadow-sm transition hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          aria-label={t('chat.newChat', 'New chat')}
          title={t('chat.newChat', 'New chat')}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      <div className="shrink-0 border-b border-soil-100 bg-white px-3 py-2">
        <label className="relative block">
          <span className="sr-only">{t('chat.searchChats', 'Search chats')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soil-400" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('chat.searchChats', 'Search chats')}
            className="h-9 w-full rounded-lg bg-soil-100 pl-9 pr-8 text-sm outline-none ring-green-600/30 placeholder:text-soil-400 focus:bg-white focus:ring-2"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-soil-400 hover:text-soil" aria-label={t('components.search.clear')}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </label>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto bg-white" aria-label={t('chat.title', 'Chats')}>
        {loading && !conversations.length && (
          <li className="space-y-3 p-4" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <span className="h-12 w-12 rounded-full bg-soil-100" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3 w-1/2 rounded bg-soil-100" />
                  <span className="block h-3 w-3/4 rounded bg-soil-100" />
                </span>
              </div>
            ))}
          </li>
        )}

        {!loading && !conversations.length && (
          <li className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-green-50 text-green-700">
              <MessagesSquare className="h-7 w-7" aria-hidden />
            </span>
            <p className="mt-3 font-semibold text-soil">{t('chat.noChats', 'No chats yet')}</p>
            <p className="mt-1 text-sm text-soil-500">{t('chat.noChatsBody', 'Tap + to start a conversation.')}</p>
            <button type="button" onClick={onNew} className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
              {t('chat.startChat', 'Start a chat')}
            </button>
          </li>
        )}

        {conversations.length > 0 && !shown.length && <li className="px-6 py-10 text-center text-sm text-soil-500">{t('chat.noMatches', 'No chats match your search.')}</li>}

        {shown.map((c) => {
          const unread = c.unread > 0;
          const mine = c.lastMessage?.senderId === me.id;
          const isActive = c.id === activeId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${isActive ? 'bg-soil-100' : unread ? 'bg-green-50/60 hover:bg-green-50' : 'hover:bg-soil-50'}`}
              >
                <PresenceAvatar person={c.partner} />
                <span className="min-w-0 flex-1 border-b border-soil-100 pb-2.5 pt-0.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-[15px] ${unread ? 'font-bold text-soil' : 'font-medium text-soil'}`}>{c.partner.name}</span>
                    <span className={`num shrink-0 text-xs ${unread ? 'font-semibold text-green-700' : 'text-soil-400'}`}>{listTime(c.lastMessageAt)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span className="shrink-0 rounded bg-soil-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-soil-500">{t(`roleNames.${c.partner.role}`)}</span>
                    {typing[c.id] ? (
                      <span className="truncate text-sm font-medium text-green-700">{t('chat.typing', 'typing…')}</span>
                    ) : c.lastMessage ? (
                      <>
                        {mine && <MessageTicks status={c.lastMessage.status} />}
                        <span className={`truncate text-sm ${unread ? 'font-semibold text-soil' : 'text-soil-500'}`}>{c.lastMessage.body}</span>
                      </>
                    ) : (
                      <span className="truncate text-sm italic text-soil-400">{t('chat.noMessagesYet', 'No messages yet')}</span>
                    )}
                    {unread && (
                      <span className="num ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-green-600 px-1.5 text-[11px] font-bold text-white" aria-label={t('chat.unreadCount', '{n} unread', { n: c.unread })}>
                        {c.unread > 99 ? '99+' : c.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ConversationList;
