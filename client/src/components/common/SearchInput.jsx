import { Search, X } from 'lucide-react';

const SearchInput = ({ value, onChange, placeholder = 'Search', className = '', autoFocus }) => (
  <label className={`relative block ${className}`}>
    <span className="sr-only">{placeholder}</span>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soil-400" aria-hidden />
    <input type="search" className="input pl-9 pr-8" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
    {value && (
      <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-soil-400 hover:text-soil" aria-label="Clear search">
        <X className="h-4 w-4" />
      </button>
    )}
  </label>
);

export default SearchInput;
