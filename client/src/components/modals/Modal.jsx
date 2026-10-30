import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { translate } from '../../i18n';

/** Accessible dialog: focus moves in, Escape closes, focus returns to the opener. */
const Modal = ({ open, onClose, title, description, children, footer, size = 'md' }) => {
  const panel = useRef(null);
  const opener = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    const t = setTimeout(() => {
      const focusable = panel.current?.querySelector('input, select, textarea, button:not([data-close])');
      (focusable || panel.current)?.focus();
    }, 20);
    const onKey = (e) => e.key === 'Escape' && closeRef.current?.();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-soil/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} className={`flex max-h-[92vh] w-full ${width} flex-col rounded-t-2xl bg-white shadow-lift sm:rounded-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-soil-200 px-5 py-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-soil-500">{description}</p>}
          </div>
          <button data-close onClick={onClose} className="rounded-md p-1 text-soil-400 hover:bg-soil-100 hover:text-soil" aria-label={translate('common.close', 'Close')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-soil-200 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
