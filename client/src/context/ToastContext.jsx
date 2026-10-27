import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { errorMessage } from '../utils/errors';

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: CheckCircle2, cls: 'border-field-200 bg-field-50 text-field-900' },
  error: { icon: XCircle, cls: 'border-red-200 bg-red-50 text-red-900' },
  info: { icon: Info, cls: 'border-river-100 bg-river-50 text-river-700' },
  warning: { icon: AlertTriangle, cls: 'border-turmeric-100 bg-turmeric-50 text-turmeric-700' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message, timeout = type === 'error' ? 7000 : 4000) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-3), { id, type, message }]);
      if (timeout) setTimeout(() => dismiss(id), timeout);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      info: (m) => push('info', m),
      warning: (m) => push('warning', m),
      error: (m) => push('error', typeof m === 'string' ? m : errorMessage(m)),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6" aria-live="polite" role="status">
        {toasts.map((t) => {
          const { icon: Icon, cls } = STYLES[t.type];
          return (
            <div key={t.id} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lift ${cls}`}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p className="flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="rounded p-0.5 opacity-60 hover:opacity-100" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
