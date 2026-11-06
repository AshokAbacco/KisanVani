import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, EllipsisVertical, Eraser, Lock, Pencil, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, SendHorizontal, Trash2, Video, X } from 'lucide-react';
import { PresenceAvatar } from './ConversationList';
import MessageTicks from './MessageTicks';
import { dayLabel, presenceText, sameDay } from './chatFormat';
import { formatTime } from '../../utils/format';
import { formatDuration } from '../calls/callUi';
import { useI18n } from '../../i18n';

const MAX_LENGTH = 4000;

/** Closes a popup menu on outside click or Escape. */
const useDismiss = (open, setOpen) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);
  return ref;
};

const HeaderMenu = ({ onClear, onDelete }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, setOpen);
  const item = 'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-soil-50';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-full text-soil-600 hover:bg-soil-200"
        aria-label={t('chat.menu', 'Chat options')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <EllipsisVertical className="h-5 w-5" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-soil-200 bg-white py-1 shadow-lift">
          <button role="menuitem" type="button" className={item} onClick={() => (setOpen(false), onClear())}>
            <Eraser className="h-4 w-4 text-soil-500" aria-hidden /> {t('chat.clearChat', 'Clear chat')}
          </button>
          <button role="menuitem" type="button" className={`${item} text-red-700 hover:bg-red-50`} onClick={() => (setOpen(false), onDelete())}>
            <Trash2 className="h-4 w-4" aria-hidden /> {t('chat.deleteChat', 'Delete chat')}
          </button>
        </div>
      )}
    </div>
  );
};

const Bubble = ({ message, mine, onEdit }) => {
  const { t } = useI18n();
  const [menu, setMenu] = useState(false);
  const ref = useDismiss(menu, setMenu);
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group relative max-w-[85%] rounded-lg px-2.5 pb-1.5 pt-1.5 text-[15px] leading-snug shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] sm:max-w-[70%] ${
          mine ? 'rounded-tr-none bg-[#d9fdd3] text-soil' : 'rounded-tl-none bg-white text-soil'
        }`}
      >
        <p className="whitespace-pre-wrap break-words pr-1">
          {message.body}
          {/* Spacer so the time never overlaps the last line of text */}
          <span className={`inline-block ${mine ? 'w-[86px]' : 'w-[62px]'} ${message.editedAt ? 'sm:w-[118px]' : ''}`} aria-hidden />
        </p>
        <span className="absolute bottom-1 right-2 flex items-center gap-1 text-[11px] text-soil-500">
          {message.editedAt && <span className="italic">{t('chat.edited', 'edited')}</span>}
          <time className="num" dateTime={message.createdAt}>
            {formatTime(message.createdAt)}
          </time>
          {mine && <MessageTicks status={message.status} />}
        </span>

        {mine && !message.pending && (
          <div className="absolute right-1 top-1" ref={ref}>
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              className={`grid h-6 w-6 place-items-center rounded-full bg-[#d9fdd3] text-soil-500 transition hover:text-soil focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-70 ${menu ? 'opacity-100' : 'opacity-0'}`}
              aria-label={t('chat.messageOptions', 'Message options')}
              aria-haspopup="menu"
              aria-expanded={menu}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-soil-200 bg-white py-1 shadow-lift">
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    onEdit(message);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-soil-50"
                >
                  <Pencil className="h-4 w-4 text-soil-500" aria-hidden /> {t('chat.edit', 'Edit')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/** What a call entry in the conversation says, from my point of view. */
const callSummary = (call, t) => {
  const video = call.type === 'VIDEO';
  const out = call.direction === 'OUTGOING';
  if (call.status === 'ENDED') return { text: video ? t('calls.log.video', 'Video call') : t('calls.log.voice', 'Voice call'), detail: formatDuration(call.duration), missed: false };
  if (!out && ['MISSED', 'CANCELLED', 'BUSY'].includes(call.status))
    return { text: video ? t('calls.log.missedVideo', 'Missed video call') : t('calls.log.missedVoice', 'Missed voice call'), missed: true };
  const key = { CANCELLED: 'cancelled', REJECTED: out ? 'declinedByThem' : 'declinedByMe', MISSED: 'noAnswer', BUSY: 'busy' }[call.status] || 'cancelled';
  const fallback = { cancelled: 'Cancelled call', declinedByThem: 'Call declined', declinedByMe: 'You declined', noAnswer: 'No answer', busy: 'Busy' }[key];
  return { text: t(`calls.log.${key}`, fallback), detail: video ? t('calls.log.video', 'Video call') : t('calls.log.voice', 'Voice call'), missed: false };
};

/** A call in the conversation (like WhatsApp/Instagram): tap to call back. */
const CallBubble = ({ call, mine, onCall, canCall }) => {
  const { t } = useI18n();
  const { text, detail, missed } = callSummary(call, t);
  const Icon = missed ? PhoneMissed : call.type === 'VIDEO' ? Video : mine ? PhoneOutgoing : PhoneIncoming;
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <button
        type="button"
        onClick={() => canCall && onCall(call.type)}
        disabled={!canCall}
        className={`flex min-w-[200px] max-w-[85%] items-center gap-3 rounded-lg px-3 py-2 text-left shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition enabled:hover:brightness-[0.98] sm:max-w-[70%] ${
          mine ? 'rounded-tr-none bg-[#d9fdd3]' : 'rounded-tl-none bg-white'
        }`}
        aria-label={`${text}. ${canCall ? t('calls.callBack', 'Call back') : ''}`}
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${missed ? 'bg-red-100 text-red-600' : 'bg-soil-100 text-soil-600'}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] font-medium ${missed ? 'text-red-700' : 'text-soil'}`}>{text}</span>
          <span className="block truncate text-xs text-soil-500">
            {detail && <span className="num">{detail} · </span>}
            <time className="num" dateTime={call.createdAt}>{formatTime(call.createdAt)}</time>
          </span>
        </span>
      </button>
    </div>
  );
};

/** Right pane: header with presence, the message history and the composer. */
const ChatWindow = ({ me, conversation, messages, calls = [], hasMore, loading, typing, onBack, onLoadOlder, onSend, onEdit, onTyping, onClear, onDelete, onCall, inCall = false }) => {
  const { t } = useI18n();
  const partner = conversation.partner;
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scroller = useRef(null);
  const input = useRef(null);
  const stickToBottom = useRef(true);
  const olderAnchor = useRef(null);
  const lastTyping = useRef(0);

  // New conversation: reset the composer and jump to the newest message.
  useEffect(() => {
    setText('');
    setEditing(null);
    setError(null);
    stickToBottom.current = true;
    input.current?.focus();
  }, [conversation.id]);

  // Keep the view pinned to the bottom when new messages arrive (unless the user scrolled up to read),
  // and keep the reading position when older messages are prepended.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (olderAnchor.current != null) {
      el.scrollTop = el.scrollHeight - olderAnchor.current;
      olderAnchor.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, calls]);

  // Messages and calls, in time order. Calls older than the oldest loaded message wait until
  // "load earlier" brings that part of the conversation in.
  const timeline = useMemo(() => {
    const from = hasMore && messages.length ? new Date(messages[0].createdAt) : null;
    const callItems = calls
      .filter((c) => !from || new Date(c.createdAt) >= from)
      .map((c) => ({ ...c, kind: 'call', senderId: c.direction === 'OUTGOING' ? me.id : partner.id }));
    return [...messages, ...callItems].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, calls, hasMore, me.id, partner.id]);
  const canCall = conversation.canMessage !== false && !!onCall && !inCall;

  const onScroll = () => {
    const el = scroller.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60 && hasMore && !loading) {
      olderAnchor.current = el.scrollHeight - el.scrollTop;
      onLoadOlder();
    }
  };

  // Auto-grow the textarea up to ~6 lines.
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    // + border, so one line fits exactly; a scrollbar only appears past the maximum height.
    const full = el.scrollHeight + (el.offsetHeight - el.clientHeight);
    el.style.height = `${Math.min(full, 140)}px`;
    el.style.overflowY = full > 140 ? 'auto' : 'hidden';
  }, [text]);

  const startEdit = (m) => {
    setEditing(m);
    setText(m.body);
    setTimeout(() => input.current?.focus(), 0);
  };
  const cancelEdit = () => {
    setEditing(null);
    setText('');
  };

  const submit = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError(null);
    if (!editing) {
      // Like WhatsApp: the box clears at once and the message appears with a clock until the server
      // confirms it, so you can keep typing and send the next one straight away.
      stickToBottom.current = true;
      setText('');
      input.current?.focus();
      try {
        await onSend(body);
      } catch (err) {
        setError(err.message);
        setText((current) => current || body); // give the text back so it can be sent again
      }
      return;
    }
    if (sending) return;
    setSending(true);
    try {
      await onEdit(editing.id, body);
      setEditing(null);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      input.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
    else if (e.key === 'Escape' && editing) cancelEdit();
  };

  const onChange = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (!editing && now - lastTyping.current > 2500) {
      lastTyping.current = now;
      onTyping();
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={partner.name}>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-1 border-b border-soil-200 bg-soil-50 px-2 sm:gap-2 sm:px-4">
        <button type="button" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full text-soil-600 hover:bg-soil-200 md:hidden" aria-label={t('chat.back', 'Back to chats')}>
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <PresenceAvatar person={partner} size="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-soil">
            {partner.name}
            <span className="ml-2 rounded bg-soil-200/70 px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-soil-600">{t(`roleNames.${partner.role}`)}</span>
          </p>
          <p className={`truncate text-xs ${typing || partner.online ? 'text-green-700' : 'text-soil-500'}`}>{presenceText(partner, typing)}</p>
        </div>
        {/* In-app voice & video calls (WebRTC) — never the phone's dialer */}
        {onCall && conversation.canMessage !== false && (
          <>
            <button
              type="button"
              onClick={() => onCall('VOICE')}
              disabled={inCall}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-soil-600 transition hover:bg-soil-200 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
              aria-label={t('calls.voiceCallWith', 'Voice call {name}', { name: partner.name })}
              title={t('calls.voiceCall', 'Voice call')}
            >
              <Phone className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onCall('VIDEO')}
              disabled={inCall}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-soil-600 transition hover:bg-soil-200 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
              aria-label={t('calls.videoCallWith', 'Video call {name}', { name: partner.name })}
              title={t('calls.videoCall', 'Video call')}
            >
              <Video className="h-5 w-5" aria-hidden />
            </button>
          </>
        )}
        <HeaderMenu onClear={onClear} onDelete={onDelete} />
      </header>

      {/* Messages */}
      <div
        ref={scroller}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-[#efeae2] px-3 py-3 sm:px-[6%]"
        style={{ backgroundImage: 'radial-gradient(rgba(31,111,61,0.06) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="mx-auto mb-3 flex max-w-md items-start gap-2 rounded-lg bg-[#fff5c4] px-3 py-2 text-center text-xs text-soil-600 shadow-sm">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{t('chat.privacyNote', 'Messages are visible only to you and {name}. Keep conversations about your trade.', { name: partner.name })}</span>
        </div>

        {hasMore && (
          <div className="mb-2 text-center">
            <button
              type="button"
              onClick={() => {
                olderAnchor.current = scroller.current.scrollHeight - scroller.current.scrollTop;
                onLoadOlder();
              }}
              className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-soil-600 shadow-sm hover:bg-white"
            >
              {loading ? t('common.loading') : t('chat.loadEarlier', 'Load earlier messages')}
            </button>
          </div>
        )}

        {loading && !messages.length && <p className="py-10 text-center text-sm text-soil-500">{t('common.loading')}</p>}

        {!loading && !timeline.length && (
          <p className="mx-auto mt-10 max-w-xs rounded-lg bg-white/80 px-4 py-3 text-center text-sm text-soil-500 shadow-sm">{t('chat.sayHello', 'Say hello to {name} 👋', { name: partner.name })}</p>
        )}

        <div className="space-y-1">
          {timeline.map((m, i) => {
            const prev = timeline[i - 1];
            const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
            const mine = m.senderId === me.id;
            const gap = prev && !newDay && prev.senderId !== m.senderId;
            return (
              <Fragment key={m.kind === 'call' ? `call-${m.id}` : m.id}>
                {newDay && (
                  <div className="sticky top-0 z-10 flex justify-center py-2">
                    <span className="rounded-lg bg-white/95 px-3 py-1 text-xs font-medium text-soil-600 shadow-sm">{dayLabel(m.createdAt)}</span>
                  </div>
                )}
                <div className={gap ? 'pt-2' : ''}>
                  {m.kind === 'call' ? <CallBubble call={m} mine={mine} onCall={onCall} canCall={canCall} /> : <Bubble message={m} mine={mine} onEdit={startEdit} />}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      {conversation.canMessage === false ? (
        <div className="shrink-0 border-t border-soil-200 bg-soil-50 px-4 py-4 text-center text-sm text-soil-500">{t('chat.cannotMessage', 'You can no longer send messages to this user.')}</div>
      ) : (
        <form onSubmit={submit} className="shrink-0 border-t border-soil-200 bg-soil-50 px-2 py-2 sm:px-4">
          {editing && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border-l-4 border-green-600 bg-white px-3 py-1.5 text-sm">
              <Pencil className="h-4 w-4 shrink-0 text-green-700" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-green-700">{t('chat.editingMessage', 'Edit message')}</span>
                <span className="block truncate text-soil-500">{editing.body}</span>
              </span>
              <button type="button" onClick={cancelEdit} className="rounded-full p-1 text-soil-500 hover:bg-soil-100" aria-label={t('common.cancel')}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
          {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">{error}</p>}
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t('chat.typeMessage', 'Type a message')}</span>
              <textarea
                ref={input}
                rows={1}
                value={text}
                maxLength={MAX_LENGTH}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={t('chat.typeMessage', 'Type a message')}
                className="block max-h-[140px] w-full resize-none rounded-xl border border-soil-200 bg-white px-4 py-2.5 text-[15px] leading-snug outline-none ring-green-600/25 placeholder:text-soil-400 focus:border-green-600 focus:ring-4"
              />
            </label>
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green-700 text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-soil-300"
              aria-label={editing ? t('chat.saveEdit', 'Save') : t('chat.send', 'Send')}
            >
              <SendHorizontal className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default ChatWindow;