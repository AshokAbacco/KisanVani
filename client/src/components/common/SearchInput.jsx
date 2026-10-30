import { Search, X } from 'lucide-react';
import { useI18n } from '../../i18n';

const SearchInput = ({ value, onChange, placeholder: placeholderProp, className = '', autoFocus }) => {
  const { t } = useI18n();
  const placeholder = placeholderProp ?? t('common.search');
  return (
  <label className={`relative block ${className}`}>
    <span className="sr-only">{placeholder}</span>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soil-400" aria-hidden />
    <input type="search" className="input pl-9 pr-8" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
    {value && (
      <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-soil-400 hover:text-soil" aria-label={t('components.search.clear')}>
        <X className="h-4 w-4" />
      </button>
    )}
  </label>
  );
};

export default SearchInput;
