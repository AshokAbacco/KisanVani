import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from './useDebounce';

/**
 * Server-side list state: pagination, sorting, search and arbitrary filters.
 * `fetcher(params)` must resolve to { data, meta } (see services/index.js).
 */
export const useList = (fetcher, { initialFilters = {}, pageSize = 20, sortBy, sortOrder = 'desc' } = {}) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFiltersState] = useState(initialFilters);
  const [sort, setSort] = useState({ sortBy, sortOrder });
  const [state, setState] = useState({ items: [], meta: null, loading: true, error: null });
  const debounced = useDebounce(search, 350);
  const run = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = { page, limit: pageSize, ...(debounced ? { search: debounced } : {}), ...(sort.sortBy ? sort : {}) };
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) params[k] = v;
    });
    try {
      const { data, meta } = await fetcherRef.current(params);
      if (id === run.current) setState({ items: data || [], meta, loading: false, error: null });
    } catch (error) {
      if (id === run.current) setState((s) => ({ ...s, loading: false, error }));
    }
  }, [page, pageSize, debounced, sort, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilters = useCallback((patch) => {
    setPage(1);
    setFiltersState((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));
  }, []);

  const onSearch = useCallback((v) => {
    setPage(1);
    setSearch(v);
  }, []);

  const toggleSort = useCallback((field) => {
    setSort((s) => ({ sortBy: field, sortOrder: s.sortBy === field && s.sortOrder === 'desc' ? 'asc' : 'desc' }));
  }, []);

  const changeSort = useCallback((next) => {
    setPage(1);
    setSort(next);
  }, []);

  return { ...state, page, setPage, search, setSearch: onSearch, filters, setFilters, sort, toggleSort, setSort: changeSort, reload: load };
};

export default useList;
