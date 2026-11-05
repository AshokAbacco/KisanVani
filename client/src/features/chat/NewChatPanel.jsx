import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, UserRoundSearch } from 'lucide-react';
import { chatApi } from '../../services';
import { useDebounce } from '../../hooks/useDebounce';
import { PresenceAvatar } from './ConversationList';
import { errorMessage } from '../../utils/errors';
import { useI18n } from '../../i18n';

/**
 * "+" panel: everyone this user is allowed to chat with (the server decides who that is),
 * searchable by name, role or phone number. Picking someone opens the existing chat or starts one.
 */
const NewChatPanel = ({ onBack, onPick }) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const term = useDebounce(search, 250);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // Role names are searched in the user's language on the client too, so "किसान" finds farmers.
    chatApi
      .contacts(term ? { search: term } : {})
      .then((list) => alive && (setPeople(list), setError(null)))
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [term]);

  // Server results plus a local pass so translated role names ("ಚಾಲಕ", "ड्राइवर") also match.
  const [all, setAll] = useState([]);
  useEffect(() => {
    chatApi.contacts().then(setAll).catch(() => {});
  }, []);
  const shown = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return people;
    const byRole = all.filter((p) => t(`roleNames.${p.role}`).toLowerCase().includes(q));
    const ids = new Set(people.map((p) => p.id));
    return [...people, ...byRole.filter((p) => !ids.has(p.id))];
  }, [people, all, term, t]);

  const pick = async (person) => {
    setOpening(person.id);
    try {
      await onPick(person);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center gap-3 bg-green-700 px-4 text-white">
        <button type="button" onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15" aria-label={t('common.close')}>
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h2 className="font-display text-lg font-semibold text-white">{t('chat.newChat', 'New chat')}</h2>
      </div>

      <div className="shrink-0 border-b border-soil-100 px-3 py-2">
        <label className="relative block">
          <span className="sr-only">{t('chat.searchPeople', 'Search name, role or phone')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soil-400" aria-hidden />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('chat.searchPeople', 'Search name, role or phone')}
            className="h-9 w-full rounded-lg bg-soil-100 pl-9 pr-3 text-sm outline-none ring-green-600/30 placeholder:text-soil-400 focus:bg-white focus:ring-2"
          />
        </label>
      </div>

      <p className="shrink-0 px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-green-700">{t('chat.contacts', 'People you can chat with')}</p>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {error && <li className="mx-4 my-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</li>}
        {loading && !shown.length && <li className="px-4 py-8 text-center text-sm text-soil-500">{t('common.loading')}</li>}
        {!loading && !shown.length && (
          <li className="flex flex-col items-center px-6 py-12 text-center text-sm text-soil-500">
            <UserRoundSearch className="mb-2 h-8 w-8 text-soil-300" aria-hidden />
            {t('chat.noContacts', 'Nobody found.')}
          </li>
        )}
        {shown.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => pick(p)}
              disabled={opening === p.id}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-soil-50 disabled:opacity-60"
            >
              <PresenceAvatar person={p} size="h-11 w-11" />
              <span className="min-w-0 flex-1 border-b border-soil-100 pb-2.5 pt-0.5">
                <span className="block truncate font-medium text-soil">{p.name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-soil-500">
                  <span className="shrink-0 rounded bg-green-50 px-1.5 py-px text-[11px] font-semibold text-green-800">{t(`roleNames.${p.role}`)}</span>
                  <span className="num truncate">{p.mobile}</span>
                  {p.conversationId && <span className="ml-auto shrink-0 text-xs text-green-700">{t('chat.existingChat', 'Open chat')}</span>}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NewChatPanel;
