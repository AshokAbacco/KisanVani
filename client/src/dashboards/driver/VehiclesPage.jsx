import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Plus, Car } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/modals/Modal';
import { Input, Select } from '../../components/forms/Field';
import useList from '../../hooks/useList';
import { vehiclesApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { VEHICLE_TYPES } from '../../constants/status';
import { formatKg, formatDate, humanize } from '../../utils/format';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';

export const VehicleForm = ({ vehicle, onClose, onSaved }) => {
  const toast = useToast();
  const { user } = useAuth();
  const d = (v) => (v ? String(v).slice(0, 10) : '');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: vehicle
      ? { ...vehicle, capacityKg: String(Number(vehicle.capacityKg)), make: vehicle.make || '', model: vehicle.model || '', ownerMobile: vehicle.ownerMobile || '', insurancePolicyNo: vehicle.insurancePolicyNo || '', permitNumber: vehicle.permitNumber || '', insuranceExpiry: d(vehicle.insuranceExpiry), fitnessExpiry: d(vehicle.fitnessExpiry), permitExpiry: d(vehicle.permitExpiry) }
      : { type: 'MINI_TRUCK', ownerName: user.name },
  });
  const submit = async (v) => {
    const body = {
      registrationNumber: v.registrationNumber,
      type: v.type,
      make: v.make || null,
      model: v.model || null,
      capacityKg: v.capacityKg,
      ownerName: v.ownerName,
      ownerMobile: v.ownerMobile || null,
      insurancePolicyNo: v.insurancePolicyNo || null,
      insuranceExpiry: v.insuranceExpiry || null,
      fitnessExpiry: v.fitnessExpiry || null,
      permitNumber: v.permitNumber || null,
      permitExpiry: v.permitExpiry || null,
    };
    try {
      const saved = vehicle ? await vehiclesApi.update(vehicle.id, body) : await vehiclesApi.create(body);
      toast.success(vehicle ? (saved.verificationStatus === 'PENDING' && vehicle.verificationStatus === 'VERIFIED' ? 'Saved. Changed details need re-verification.' : 'Vehicle updated') : 'Vehicle registered. An admin will verify it.');
      onSaved(saved);
      onClose();
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={vehicle ? `Edit ${vehicle.registrationNumber}` : 'Register a vehicle'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
        <Input label="Registration number" required placeholder="KA 05 AB 1234" error={errors.registrationNumber?.message} {...register('registrationNumber', { required: 'Registration number is required' })} />
        <Select label="Vehicle type" options={VEHICLE_TYPES} {...register('type')} />
        <Input label="Make" placeholder="e.g. Tata" {...register('make')} />
        <Input label="Model" placeholder="e.g. Ace Gold" {...register('model')} />
        <Input label="Capacity" required suffix="kg" inputMode="decimal" error={errors.capacityKg?.message} {...register('capacityKg', rules.positive('Capacity'))} />
        <Input label="Owner name" required error={errors.ownerName?.message} {...register('ownerName', rules.name)} />
        <Input label="Owner mobile" inputMode="tel" error={errors.ownerMobile?.message} {...register('ownerMobile', rules.optionalMobile)} />
        <Input label="Insurance policy no." {...register('insurancePolicyNo')} />
        <Input label="Insurance valid until" type="date" {...register('insuranceExpiry')} />
        <Input label="Fitness certificate valid until" type="date" hint="Where applicable" {...register('fitnessExpiry')} />
        <Input label="Permit number" hint="Where applicable" {...register('permitNumber')} />
        <Input label="Permit valid until" type="date" {...register('permitExpiry')} />
      </form>
    </Modal>
  );
};

const VehiclesPage = ({ documentsFocus = false }) => {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const list = useList((p) => vehiclesApi.list(p));
  return (
    <>
      <PageHeader
        title={documentsFocus ? 'Vehicle documents' : 'Vehicle details'}
        description={documentsFocus ? 'Open a vehicle to upload its RC, insurance, fitness certificate and permit.' : 'Vehicles must be verified by an admin before they can take trips.'}
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)}>
            Register vehicle
          </Button>
        }
      />
      <DataTable
        list={list}
        onRowClick={(v) => navigate(`/driver/vehicles/${v.id}`)}
        columns={[
          { key: 'registrationNumber', header: 'Registration', render: (v) => <span className="num whitespace-nowrap font-semibold">{v.registrationNumber}</span> },
          { key: 'type', header: 'Type', render: (v) => `${humanize(v.type)}${v.make ? ` — ${v.make} ${v.model || ''}` : ''}` },
          { key: 'capacityKg', header: 'Capacity', align: 'right', render: (v) => formatKg(v.capacityKg) },
          { key: 'docs', header: 'Documents', align: 'right', render: (v) => v.documents.length },
          { key: 'insuranceExpiry', header: 'Insurance until', render: (v) => <span className={v.insuranceExpiry && new Date(v.insuranceExpiry) < new Date() ? 'font-semibold text-red-600' : ''}>{formatDate(v.insuranceExpiry)}</span> },
          { key: 'verificationStatus', header: 'Verification', render: (v) => <StatusBadge status={v.verificationStatus} /> },
          { key: 'trips', header: 'Trips', align: 'right', render: (v) => v._count.trips },
        ]}
        empty={<EmptyState icon={Car} title="No vehicles yet" description="Register your tractor, tempo or truck to start taking loads." action={<Button onClick={() => setAdding(true)}>Register vehicle</Button>} />}
      />
      {adding && <VehicleForm onClose={() => setAdding(false)} onSaved={(v) => navigate(`/driver/vehicles/${v.id}`)} />}
    </>
  );
};

export default VehiclesPage;
