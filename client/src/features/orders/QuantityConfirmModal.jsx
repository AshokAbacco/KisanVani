import { useEffect, useState } from 'react';
import Modal from '../../components/modals/Modal';
import Button from '../../components/common/Button';
import { formatKg } from '../../utils/format';

/**
 * Per-item quantity confirmation used for "mark delivered" (seller) and "confirm receipt" (buyer).
 * Each quantity defaults to the previous step and may not exceed `cap(item)`.
 */
const QuantityConfirmModal = ({ open, onClose, title, description, items, cap, defaultQty, field, confirmLabel, onConfirm }) => {
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setValues(Object.fromEntries(items.map((i) => [i.id, String(Number(defaultQty(i)))])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const invalid = items.find((i) => {
    const v = values[i.id];
    return v === '' || v === undefined || !/^\d+(\.\d{1,3})?$/.test(v) || Number(v) > Number(cap(i));
  });

  const submit = async () => {
    setBusy(true);
    try {
      await onConfirm(items.map((i) => ({ itemId: i.id, [field]: values[i.id] })));
      onClose();
    } catch {
      /* the caller shows the error; keep the dialog open so the user can correct it */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!!invalid} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <ul className="divide-y divide-soil-200">
        {items.map((i) => {
          const bad = values[i.id] !== undefined && (Number(values[i.id]) > Number(cap(i)) || !/^\d+(\.\d{1,3})?$/.test(values[i.id] || ''));
          return (
            <li key={i.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {i.product?.emoji} {i.itemName}
                </p>
                <p className="text-xs text-soil-500">Up to {formatKg(cap(i), { grams: false })}</p>
              </div>
              <label className="w-36 shrink-0">
                <span className="sr-only">Quantity for {i.itemName}</span>
                <div className="relative">
                  <input className={`input num pr-9 text-right ${bad ? 'input-error' : ''}`} inputMode="decimal" value={values[i.id] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [i.id]: e.target.value }))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-soil-400">kg</span>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
};

export default QuantityConfirmModal;
