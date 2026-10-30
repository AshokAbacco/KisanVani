import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/modals/Modal';
import Button from '../../components/common/Button';
import { Input, Textarea } from '../../components/forms/Field';
import { ordersApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, humanize } from '../../utils/format';
import { newId } from '../../utils/id';
import { errorMessage } from '../../utils/errors';
import { useI18n } from '../../i18n';

/**
 * Places an order on one harvest listing or mandi lot. The idempotency key is created when the dialog opens,
 * so a double tap or a retry after a network blip can never create two orders.
 */
const PlaceOrderModal = ({ open, onClose, item, source, base }) => {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const key = useRef(newId());
  const [qty, setQty] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const min = Number(item?.minOrderKg || 0);
  const available = Number(source === 'HARVEST' ? item?.availableQuantityKg : item?.availableWeightKg) || 0;
  const price = Number(item?.pricePerKg || 0);

  useEffect(() => {
    if (open && item) {
      key.current = newId();
      setQty(String(min));
      setAddress('');
      setDate('');
      setNotes('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  const n = Number(qty);
  const qtyError = !qty
    ? t('placeOrder.enterQty')
    : !/^\d+(\.\d{1,3})?$/.test(qty)
      ? t('placeOrder.numbersOnly')
      : n < min
        ? t('placeOrder.minIs', '', { qty: formatKg(min, { grams: false }) })
        : n > available
          ? t('placeOrder.onlyAvailable', '', { qty: formatKg(available, { grams: false }) })
          : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, meta } = await ordersApi.create({
        idempotencyKey: key.current,
        source,
        items: [{ sourceId: item.id, quantityKg: qty }],
        deliveryAddress: address || null,
        expectedDeliveryAt: date ? new Date(date).toISOString() : null,
        notes: notes || null,
      });
      toast.success(t(meta?.duplicate ? 'placeOrder.duplicate' : 'placeOrder.placed', '', { number: data.orderNumber }));
      onClose();
      navigate(`${base}/orders/${data.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!item) return null;
  const name = source === 'HARVEST' ? item.cropName : item.commodityName;
  const seller = source === 'HARVEST' ? item.farmer?.farmerProfile?.farmName || item.farmer?.name : item.mandiOwner?.mandiProfile?.mandiName || item.mandiOwner?.name;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('placeOrder.title', '', { name })}
      description={t('placeOrder.subtitle', '', { seller, price: formatINR(price) })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!!qtyError} loading={busy}>
            {t('placeOrder.placeFor', '', { amount: qtyError ? '—' : formatINR(n * price) })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-leafwhite p-3 text-center text-sm">
          <div>
            <p className="text-soil-500">{humanize('AVAILABLE')}</p>
            <p className="num whitespace-nowrap font-semibold">{formatKg(available, { grams: false })}</p>
          </div>
          <div>
            <p className="text-soil-500">{t('lotForm.minimum')}</p>
            <p className="num whitespace-nowrap font-semibold">{formatKg(min, { grams: false })}</p>
          </div>
          <div>
            <p className="text-soil-500">{t('orderDetail.rate')}</p>
            <p className="num whitespace-nowrap font-semibold">{t('common.perKg', '', { price: formatINR(price) })}</p>
          </div>
        </div>
        <Input label={t('common.quantity')} suffix="kg" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} error={qty !== '' ? qtyError : undefined} required />
        <Textarea label={t('orderDetail.deliverTo')} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} hint={t('placeOrder.addressHint')} />
        <Input label={t('placeOrder.neededBy')} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        <Textarea label={t('placeOrder.noteToSeller')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      </div>
    </Modal>
  );
};

export default PlaceOrderModal;
