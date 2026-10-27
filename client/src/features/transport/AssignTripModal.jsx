import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/modals/Modal';
import Button from '../../components/common/Button';
import { Input, Select } from '../../components/forms/Field';
import Alert from '../../components/feedback/Alert';
import { transportApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatKg, humanize } from '../../utils/format';

/** Assigns an available, verified driver + vehicle to an open transport request. */
const AssignTripModal = ({ open, onClose, request, onAssigned }) => {
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
      toast.success(`Trip ${trip.tripNumber} assigned to ${trip.driver.name}`);
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
      title={`Assign vehicle — ${request?.requestNumber || ''}`}
      description={request ? `${request.commodity}, ${formatKg(request.expectedQuantityKg)}: ${request.pickupAddress} to ${request.dropAddress}` : ''}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid} loading={busy}>
            Assign trip
          </Button>
        </>
      }
    >
      {drivers && drivers.length === 0 ? (
        <Alert tone="warning">No available driver has a verified vehicle large enough for this load. Drivers can also take open loads themselves from their dashboard.</Alert>
      ) : (
        <div className="space-y-4">
          <Select
            label="Driver"
            placeholder={drivers ? 'Choose a driver' : 'Loading drivers…'}
            value={driverId}
            onChange={(e) => {
              setDriverId(e.target.value);
              setVehicleId('');
            }}
            options={(drivers || []).map((d) => ({
              value: d.id,
              label: `${d.name} — ${d.mobile}${d.driverProfile?.address?.district ? `, ${d.driverProfile.address.district}` : ''}${d.activeTrips ? ` (${d.activeTrips} active trip${d.activeTrips > 1 ? 's' : ''})` : ''}`,
            }))}
          />
          <Select
            label="Vehicle"
            placeholder="Choose a vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={!driver}
            options={(driver?.vehicles || []).map((v) => ({ value: v.id, label: `${v.registrationNumber} — ${humanize(v.type)}, ${formatKg(v.capacityKg)} capacity` }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Transport charge" suffix="₹" inputMode="decimal" value={charge} onChange={(e) => setCharge(e.target.value)} error={charge && !/^\d+(\.\d{1,2})?$/.test(charge) ? 'Enter a valid amount' : undefined} />
            <Input label="Estimated arrival" type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AssignTripModal;
