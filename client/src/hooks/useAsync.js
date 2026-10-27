import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks { data, loading, error }. Re-runs when deps change; `reload()` re-runs on demand.
 * Stale responses from an earlier run are ignored.
 */
export const useAsync = (loader, deps = [], { immediate = true } = {}) => {
  const [state, setState] = useState({ data: undefined, loading: immediate, error: null });
  const run = useRef(0);

  const reload = useCallback(async () => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loader();
      if (id === run.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (id === run.current) setState((s) => ({ ...s, loading: false, error }));
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) reload();
  }, [reload, immediate]);

  return { ...state, reload, setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
};

export default useAsync;
