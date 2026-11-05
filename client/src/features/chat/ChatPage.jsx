import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';
import ConversationList from './ConversationList';
import NewChatPanel from './NewChatPanel';
import ChatWindow from './ChatWindow';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import { chatApi } from '../../services';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { roleBase } from '../../constants/roles';
import { errorMessage } from '../../utils/errors';
import { upgradeStatus } from './chatFormat';
import { useI18n } from '../../i18n';

const byLatest = (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0);
const isVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

/**
 * Adds my confirmed message to the list. If it is still shown as "sending" (a temporary copy added the
 * moment Send was pressed), that copy is replaced, so the message never appears twice.
 */
const mergeMine = (list, message) => {
  if (list.some((m) => m.id === message.id)) return list;
  const i = list.findIndex((m) => m.pending && m.senderId === message.senderId && m.body === message.body);
  if (i === -1) return [...list, message];
  const next = [...list];
  next[i] = { ...message, status: upgradeStatus(message.status, list[i].status) }; // keep a "read" that arrived first
  return next;
};

/**
 * WhatsApp-style chat: conversation list on the left, the open conversation on the right
 * (one pane at a time on phones). Who you can talk to is decided by the server.
 * Route: <base>/chat and <base>/chat/:conversationId
 */
const ChatPage = () => {
  const { t } = useI18n();
  const { user: me } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { conversationId: activeId } = useParams();
  const base = `${roleBase(me.role)}/chat`;

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [panel, setPanel] = useState('list'); // list | new
  const [opened, setOpened] = useState(null); // active conversation when it is not (yet) in the list
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [typing, setTyping] = useState({});
  const [confirm, setConfirm] = useState(null); // 'clear' | 'delete'
  const [busy, setBusy] = useState(false);

  const activeRef = useRef(activeId);
  activeRef.current = activeId;
  const typingTimers = useRef({});

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || (opened?.id === activeId ? opened : null), [conversations, activeId, opened]);

  /* ───────── Data loading ───────── */

  const loadList = useCallback(
    () =>
      chatApi
        .conversations()
        .then((list) => setConversations(list.sort(byLatest)))
        .catch((e) => toast.error(errorMessage(e)))
        .finally(() => setListLoading(false)),
    [toast]
  );

  const markRead = useCallback((id) => {
    if (!id || !isVisible()) return;
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    chatApi.markRead(id).catch(() => {});
  }, []);

  const loadMessages = useCallback(
    async (id) => {
      setMsgLoading(true);
      try {
        const { data, meta } = await chatApi.messages(id);
        if (activeRef.current !== id) return;
        setMessages(data);
        setHasMore(!!meta?.hasMore);
        markRead(id);
      } catch (e) {
        toast.error(errorMessage(e));
        navigate(base, { replace: true });
      } finally {
        setMsgLoading(false);
      }
    },
    [base, markRead, navigate, toast]
  );

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Opening a conversation (from the list, "+", or a link).
  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    if (!activeId) return;
    setPanel('list');
    if (!conversations.some((c) => c.id === activeId)) {
      chatApi
        .conversation(activeId)
        .then(setOpened)
        .catch(() => navigate(base, { replace: true }));
    }
    loadMessages(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const loadOlder = async () => {
    if (!activeId || msgLoading || !messages.length) return;
    setMsgLoading(true);
    try {
      const { data, meta } = await chatApi.messages(activeId, { before: messages[0].createdAt });
      setMessages((list) => [...data.filter((m) => !list.some((x) => x.id === m.id)), ...list]);
      setHasMore(!!meta?.hasMore);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setMsgLoading(false);
    }
  };

  /* ───────── Live updates ───────── */

  useEffect(() => {
    const s = getSocket();

    const onMessage = ({ conversationId, message, conversation }) => {
      const open = conversationId === activeRef.current;
      const incoming = message.senderId !== me.id;
      setConversations((list) => {
        const rest = list.filter((c) => c.id !== conversationId);
        const summary = { ...conversation, unread: open && incoming && isVisible() ? 0 : conversation.unread };
        return [summary, ...rest].sort(byLatest);
      });
      if (open) {
        setMessages((list) => (incoming ? (list.some((m) => m.id === message.id) ? list : [...list, message]) : mergeMine(list, message)));
        if (incoming) markRead(conversationId);
      }
      if (incoming) {
        clearTimeout(typingTimers.current[conversationId]);
        setTyping((tp) => ({ ...tp, [conversationId]: false }));
      }
    };

    const onUpdated = ({ conversationId, message }) => {
      if (conversationId === activeRef.current) setMessages((list) => list.map((m) => (m.id === message.id ? { ...m, ...message, status: upgradeStatus(m.status, message.status) } : m)));
      setConversations((list) => list.map((c) => (c.id === conversationId && c.lastMessage?.id === message.id ? { ...c, lastMessage: { ...c.lastMessage, body: message.body, editedAt: message.editedAt } } : c)));
    };

    // The other person received / read my messages up to `upTo`.
    const onStatus = ({ conversationId, status, upTo }) => {
      const reached = (m) => m.senderId === me.id && new Date(m.createdAt) <= new Date(upTo);
      if (conversationId === activeRef.current) setMessages((list) => list.map((m) => (reached(m) ? { ...m, status: upgradeStatus(m.status, status) } : m)));
      setConversations((list) => list.map((c) => (c.id === conversationId && c.lastMessage && reached(c.lastMessage) ? { ...c, lastMessage: { ...c.lastMessage, status: upgradeStatus(c.lastMessage.status, status) } } : c)));
    };

    const onPresence = ({ userId, online, lastSeenAt }) => {
      const patch = (c) => (c.partner.id === userId ? { ...c, partner: { ...c.partner, online, lastSeenAt } } : c);
      setConversations((list) => list.map(patch));
      setOpened((c) => (c ? patch(c) : c));
    };

    const onTyping = ({ conversationId }) => {
      setTyping((tp) => ({ ...tp, [conversationId]: true }));
      clearTimeout(typingTimers.current[conversationId]);
      typingTimers.current[conversationId] = setTimeout(() => setTyping((tp) => ({ ...tp, [conversationId]: false })), 3500);
    };

    // After a reconnect, catch up on anything missed while offline.
    const onReconnect = () => {
      loadList();
      if (activeRef.current) loadMessages(activeRef.current);
    };

    const onVisible = () => isVisible() && activeRef.current && markRead(activeRef.current);

    s.on('chat:message', onMessage);
    s.on('chat:message-updated', onUpdated);
    s.on('chat:status', onStatus);
    s.on('chat:presence', onPresence);
    s.on('chat:typing', onTyping);
    s.io.on('reconnect', onReconnect);
    document.addEventListener('visibilitychange', onVisible);
    const timers = typingTimers.current;
    return () => {
      s.off('chat:message', onMessage);
      s.off('chat:message-updated', onUpdated);
      s.off('chat:status', onStatus);
      s.off('chat:presence', onPresence);
      s.off('chat:typing', onTyping);
      s.io.off('reconnect', onReconnect);
      document.removeEventListener('visibilitychange', onVisible);
      Object.values(timers).forEach(clearTimeout);
    };
  }, [me.id, loadList, loadMessages, markRead]);

  /* ───────── Actions ───────── */

  const select = (id) => navigate(`${base}/${id}`);

  const pickContact = async (person) => {
    const conv = await chatApi.open(person.id); // returns the existing chat if there is one
    setOpened(conv);
    setConversations((list) => (list.some((c) => c.id === conv.id) ? list : [conv, ...list]));
    setPanel('list');
    navigate(`${base}/${conv.id}`);
  };

  // The message shows up at once with a clock icon (like WhatsApp) and gets its ticks when the server confirms.
  const send = async (body) => {
    const conversationId = activeId;
    const temp = { id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`, conversationId, senderId: me.id, body, createdAt: new Date().toISOString(), status: 'PENDING', pending: true };
    const showLast = (message) =>
      setConversations((list) =>
        [...list.filter((c) => c.id !== conversationId), { ...(list.find((c) => c.id === conversationId) || active), lastMessage: message, lastMessageAt: message.createdAt }].sort(byLatest)
      );
    setMessages((list) => [...list, temp]);
    showLast(temp);
    try {
      const message = await chatApi.send(conversationId, body);
      setMessages((list) => {
        if (!list.some((m) => m.id === temp.id)) return list; // another chat is open now
        if (list.some((m) => m.id === message.id)) return list.filter((m) => m.id !== temp.id); // the live update came first
        return list.map((m) => (m.id === temp.id ? { ...message, status: upgradeStatus(message.status, m.status) } : m));
      });
      setConversations((list) => list.map((c) => (c.id === conversationId && (!c.lastMessage || c.lastMessage.id === temp.id) ? { ...c, lastMessage: message, lastMessageAt: message.createdAt } : c)));
    } catch (e) {
      setMessages((list) => list.filter((m) => m.id !== temp.id));
      setConversations((list) => list.map((c) => (c.id === conversationId && c.lastMessage?.id === temp.id ? { ...c, lastMessage: null } : c)));
      throw new Error(errorMessage(e));
    }
  };

  const edit = async (messageId, body) => {
    try {
      const message = await chatApi.edit(messageId, body);
      setMessages((list) => list.map((m) => (m.id === message.id ? { ...m, ...message, status: upgradeStatus(m.status, message.status) } : m)));
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  };

  const typingPing = () => activeId && getSocket().emit('chat:typing', { conversationId: activeId });

  const runConfirm = async () => {
    setBusy(true);
    try {
      if (confirm === 'clear') {
        await chatApi.clear(activeId);
        setMessages([]);
        setHasMore(false);
        setConversations((list) => list.map((c) => (c.id === activeId ? { ...c, lastMessage: null, unread: 0 } : c)));
        toast.success(t('chat.cleared', 'Chat cleared'));
      } else {
        await chatApi.remove(activeId);
        setConversations((list) => list.filter((c) => c.id !== activeId));
        setOpened(null);
        navigate(base, { replace: true });
        toast.success(t('chat.deleted', 'Chat deleted'));
      }
      setConfirm(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /* ───────── Layout ───────── */

  // Fills the space under the header; on phones only one pane is shown at a time.
  return (
    <div className="-mx-4 -mb-24 -mt-6 h-[calc(100dvh-4rem-3.5rem)] overflow-hidden border-soil-200 bg-white sm:-mx-6 lg:mx-0 lg:-mb-4 lg:mt-0 lg:h-[calc(100dvh-4rem-4rem)] lg:rounded-2xl lg:border lg:shadow-sm">
      <div className="grid h-full min-h-0 md:grid-cols-[minmax(300px,380px)_1fr]">
        <aside className={`h-full min-h-0 border-r border-soil-200 ${activeId ? 'hidden md:block' : 'block'}`}>
          {panel === 'new' ? (
            <NewChatPanel onBack={() => setPanel('list')} onPick={pickContact} />
          ) : (
            <ConversationList me={me} conversations={conversations} loading={listLoading} activeId={activeId} typing={typing} onSelect={select} onNew={() => setPanel('new')} />
          )}
        </aside>

        <div className={`h-full min-h-0 ${activeId ? 'block' : 'hidden md:block'}`}>
          {active ? (
            <ChatWindow
              me={me}
              conversation={active}
              messages={messages}
              hasMore={hasMore}
              loading={msgLoading}
              typing={!!typing[active.id]}
              onBack={() => navigate(base)}
              onLoadOlder={loadOlder}
              onSend={send}
              onEdit={edit}
              onTyping={typingPing}
              onClear={() => setConfirm('clear')}
              onDelete={() => setConfirm('delete')}
            />
          ) : (
            <div className="hidden h-full flex-col items-center justify-center border-b-[6px] border-green-600 bg-soil-50 px-8 text-center md:flex">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-green-100 text-green-700">
                <MessagesSquare className="h-10 w-10" aria-hidden />
              </span>
              <h2 className="mt-5 font-display text-2xl font-bold text-soil">{t('chat.emptyTitle', 'KisanVani Chat')}</h2>
              <p className="mt-2 max-w-sm text-sm text-soil-500">{t('chat.emptyBody', 'Pick a conversation, or tap + to message a farmer, shop, mandi or driver you work with.')}</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={runConfirm}
        busy={busy}
        title={confirm === 'clear' ? t('chat.clearTitle', 'Clear this chat?') : t('chat.deleteTitle', 'Delete this chat?')}
        message={
          confirm === 'clear'
            ? t('chat.clearMessage', 'All messages will be removed for you. {name} will still see them.', { name: active?.partner.name || '' })
            : t('chat.deleteMessage', 'The chat and its messages will be removed for you. It comes back if {name} sends a new message.', { name: active?.partner.name || '' })
        }
        confirmLabel={confirm === 'clear' ? t('chat.clearChat', 'Clear chat') : t('chat.deleteChat', 'Delete chat')}
      />
    </div>
  );
};

export default ChatPage;