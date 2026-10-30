import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import Modal from '../../components/modals/Modal';
import Button from '../../components/common/Button';
import { Input, Select, Textarea } from '../../components/forms/Field';
import LocationPicker from '../../components/maps/LocationPicker';
import { transportApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { VEHICLE_TYPES } from '../../constants/status';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';
import { useI18n } from '../../i18n';

const blank = {
  commodity: '',
  expectedQuantityKg: '',
  pickupAddress: '',
  pickupContactName: '',
  pickupContactPhone: '',
  dropAddress: '',
  dropContactName: '',
  dropContactPhone: '',
  preferredVehicleType: '',
  preferredPickupAt: '',
  offeredCharge: '',
  notes: '',
};

/** Creates a transport request (a "load") — optionally tied to an order. `defaults` pre-fills the form. */
const RequestTransportModal = ({ open, onClose, onCreated, orderId, defaults = {} }) => {
  const { t } = useI18n();
  const toast = useToast();
  const [pickup, setPickup] = useState({ lat: null, lng: null });
  const [drop, setDrop] = useState({ lat: null, lng: null });
  const [mapFor, setMapFor] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: blank });

  useEffect(() => {
    if (!open) return;
    reset({ ...blank, ...defaults });
    setPickup({ lat: defaults.pickupLat ?? null, lng: defaults.pickupLng ?? null });
    setDrop({ lat: defaults.dropLat ?? null, lng: defaults.dropLng ?? null });
    setMapFor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (v) => {
    try {
      const body = {
        ...v,
        orderId: orderId || null,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
        preferredVehicleType: v.preferredVehicleType || null,
        preferredPickupAt: v.preferredPickupAt ? new Date(v.preferredPickupAt).toISOString() : null,
        offeredCharge: v.offeredCharge || null,
        dropContactPhone: v.dropContactPhone || null,
      };
      const r = await transportApi.createRequest(body);
      toast.success(t('requestTransport.postedToast', '', { number: r.requestNumber }));
      onCreated?.(r);
      onClose();
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };

  const coordLabel = (c) => (c.lat != null ? t('requestTransport.gpsSet', '', { coords: `${Number(c.lat).toFixed(4)}, ${Number(c.lng).toFixed(4)}` }) : t('requestTransport.addGps'));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('orderDetail.requestTransport')}
      description={t('requestTransport.intro')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {t('requestTransport.post')}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input className="sm:col-span-2" label={t('requestTransport.what')} required placeholder={t('requestTransport.whatPlaceholder')} error={errors.commodity?.message} {...register('commodity', { required: t('requestTransport.describeLoad'), minLength: { value: 2, message: t('validation.tooShort') } })} />
          <Input label={t('pos.weight')} required suffix="kg" inputMode="decimal" error={errors.expectedQuantityKg?.message} {...register('expectedQuantityKg', rules.positive(t('pos.weight')))} />
        </div>

        <fieldset className="space-y-3 rounded-xl border border-soil-200 p-4">
          <legend className="px-1 text-sm font-semibold">{t('components.tripMap.pickup')}</legend>
          <Textarea label={t('requestTransport.pickupAddress')} required rows={2} error={errors.pickupAddress?.message} {...register('pickupAddress', { required: t('validation.required', '', { label: t('requestTransport.pickupAddress') }), minLength: { value: 3, message: t('validation.tooShort') } })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('requestTransport.contactName')} required error={errors.pickupContactName?.message} {...register('pickupContactName', rules.name)} />
            <Input label={t('requestTransport.contactPhone')} required inputMode="tel" error={errors.pickupContactPhone?.message} {...register('pickupContactPhone', rules.mobile)} />
          </div>
          <Button size="sm" variant="ghost" icon={MapPin} onClick={() => setMapFor(mapFor === 'pickup' ? null : 'pickup')}>
            {coordLabel(pickup)}
          </Button>
          {mapFor === 'pickup' && <LocationPicker value={pickup} onChange={setPickup} height={220} />}
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-soil-200 p-4">
          <legend className="px-1 text-sm font-semibold">{t('components.tripMap.destination')}</legend>
          <Textarea label={t('requestTransport.dropAddress')} required rows={2} error={errors.dropAddress?.message} {...register('dropAddress', { required: t('validation.required', '', { label: t('requestTransport.dropAddress') }), minLength: { value: 3, message: t('validation.tooShort') } })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('requestTransport.receiverName')} {...register('dropContactName')} />
            <Input label={t('requestTransport.receiverPhone')} inputMode="tel" error={errors.dropContactPhone?.message} {...register('dropContactPhone', rules.optionalMobile)} />
          </div>
          <Button size="sm" variant="ghost" icon={MapPin} onClick={() => setMapFor(mapFor === 'drop' ? null : 'drop')}>
            {coordLabel(drop)}
          </Button>
          {mapFor === 'drop' && <LocationPicker value={drop} onChange={setDrop} height={220} />}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select label={t('vehicles.vehicleType')} placeholder={t('requestTransport.any')} options={VEHICLE_TYPES} {...register('preferredVehicleType')} />
          <Input label={t('requestTransport.pickupTime')} type="datetime-local" {...register('preferredPickupAt')} />
          <Input label={t('requestTransport.offeredCharge')} suffix="₹" inputMode="decimal" hint={t('requestTransport.offeredHint')} error={errors.offeredCharge?.message} {...register('offeredCharge', { validate: (v) => !v || rules.money(t('trips.charge'), { allowZero: true }).validate(v) })} />
        </div>
        <Textarea label={t('requestTransport.notes')} rows={2} {...register('notes')} />
      </form>
    </Modal>
  );
};

export default RequestTransportModal;
