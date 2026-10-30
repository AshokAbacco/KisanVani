import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/modals/Modal';
import Button from '../../components/common/Button';
import { Input, Select } from '../../components/forms/Field';
import Alert from '../../components/feedback/Alert';
import { transportApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatKg, humanize, plural } from '../../utils/format';
import { useI18n } from '../../i18n';

/** Assigns an available, verified driver + vehicle to an open transport request. */
const AssignTripModal = ({ open, onClose, request, onAssigned }) => {
  const { t } = useI18n();
  const toast = useToast();
  const [drivers, setDrivers] = useState(null);
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [charge, setCharge] = useState('');
  const [eta, setEta] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !request) return;
    setDrivers(null);
    setDriverId('');
    setVehicleId('');
    setCharge(request.offeredCharge ? String(Number(request.offeredCharge)) : '');
    setEta('');
    transportApi
      .availableDrivers({ minCapacityKg: request.expectedQuantityKg })
      .then(setDrivers)
      .catch((e) => {
        setDrivers([]);
        toast.error(e);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request?.id]);

  const driver = useMemo(() => drivers?.find((d) => d.id === driverId), [drivers, driverId]);
  useEffect(() => {
    if (driver?.vehicles.length === 1) setVehicleId(driver.vehicles[0].id);
  }, [driver]);

  const valid = driverId && vehicleId && /^\d+(\.\d{1,2})?$/.test(charge);

  const submit = async () => {
    setBusy(true);
    try {
      const trip = await transportApi.assign({ transportRequestId: request.id, driverId, vehicleId, transportCharge: charge, estimatedArrivalAt: eta ? new Date(eta).toISOString() : null });
      toast.success(t('assignTrip.assignedToast', '', { number: trip.tripNumber, name: trip.driver.name }));
      onAssigned?.(trip);
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('assignTrip.title', '', { number: request?.requestNumber || '' })}
      description={request ? t('assignTrip.subtitle', '', { load: request.commodity, qty: formatKg(request.expectedQuantityKg), from: request.pickupAddress, to: request.dropAddress }) : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!valid} loading={busy}>
            {t('assignTrip.assign')}
          </Button>
        </>
      }
    >
      {drivers && drivers.length === 0 ? (
        <Alert tone="warning">{t('assignTrip.noDriver')}</Alert>
      ) : (
        <div className="space-y-4">
          <Select
            label={t('roleNames.DRIVER')}
            placeholder={drivers ? t('assignTrip.chooseDriver') : t('assignTrip.loadingDrivers')}
            value={driverId}
            onChange={(e) => {
              setDriverId(e.target.value);
              setVehicleId('');
            }}
            options={(drivers || []).map((d) => ({
              value: d.id,
              label: `${d.name} — ${d.mobile}${d.driverProfile?.address?.district ? `, ${d.driverProfile.address.district}` : ''}${d.activeTrips ? ` (${plural(d.activeTrips, 'activeTrip')})` : ''}`,
            }))}
          />
          <Select
            label={t('dnav.items.vehicle')}
            placeholder={t('assignTrip.chooseVehicle')}
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={!driver}
            options={(driver?.vehicles || []).map((v) => ({ value: v.id, label: t('assignTrip.vehicleOption', '', { reg: v.registrationNumber, type: humanize(v.type), qty: formatKg(v.capacityKg) }) }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('assignTrip.charge')} suffix="₹" inputMode="decimal" value={charge} onChange={(e) => setCharge(e.target.value)} error={charge && !/^\d+(\.\d{1,2})?$/.test(charge) ? t('assignTrip.validAmount') : undefined} />
            <Input label={t('driverTrip.eta')} type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AssignTripModal;
