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
import { useI18n } from '../../i18n';

export const VehicleForm = ({ vehicle, onClose, onSaved }) => {
  const { t } = useI18n();
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
      toast.success(t(vehicle ? (saved.verificationStatus === 'PENDING' && vehicle.verificationStatus === 'VERIFIED' ? 'vehicles.needsReverify' : 'vehicles.updated') : 'vehicles.registered'));
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
      title={vehicle ? t('stock.editTitle', '', { name: vehicle.registrationNumber }) : t('vehicles.registerTitle')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)} noValidate>
        <Input label={t('vehicles.regNumber')} required placeholder="KA 05 AB 1234" error={errors.registrationNumber?.message} {...register('registrationNumber', rules.required(t('vehicles.regNumber')))} />
        <Select label={t('vehicles.vehicleType')} options={VEHICLE_TYPES} {...register('type')} />
        <Input label={t('vehicles.make')} placeholder={t('vehicles.makePlaceholder')} {...register('make')} />
        <Input label={t('vehicles.model')} placeholder={t('vehicles.modelPlaceholder')} {...register('model')} />
        <Input label={t('vehicles.capacity')} required suffix="kg" inputMode="decimal" error={errors.capacityKg?.message} {...register('capacityKg', rules.positive(t('vehicles.capacity')))} />
        <Input label={t('vehicles.ownerName')} required error={errors.ownerName?.message} {...register('ownerName', rules.name)} />
        <Input label={t('vehicles.ownerMobile')} inputMode="tel" error={errors.ownerMobile?.message} {...register('ownerMobile', rules.optionalMobile)} />
        <Input label={t('vehicles.policyNo')} {...register('insurancePolicyNo')} />
        <Input label={t('vehicles.insuranceUntil')} type="date" {...register('insuranceExpiry')} />
        <Input label={t('vehicles.fitnessUntil')} type="date" hint={t('vehicles.whereApplicable')} {...register('fitnessExpiry')} />
        <Input label={t('vehicles.permitNumber')} hint={t('vehicles.whereApplicable')} {...register('permitNumber')} />
        <Input label={t('vehicles.permitUntil')} type="date" {...register('permitExpiry')} />
      </form>
    </Modal>
  );
};

const VehiclesPage = ({ documentsFocus = false }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const list = useList((p) => vehiclesApi.list(p));
  return (
    <>
      <PageHeader
        title={t(documentsFocus ? 'vehicles.docsTitle' : 'dnav.tabs.vehicleDetails')}
        description={t(documentsFocus ? 'vehicles.docsIntro' : 'vehicles.intro')}
        actions={
          <Button icon={Plus} onClick={() => setAdding(true)}>
            {t('vehicles.register')}
          </Button>
        }
      />
      <DataTable
        list={list}
        onRowClick={(v) => navigate(`/driver/vehicles/${v.id}`)}
        columns={[
          { key: 'registrationNumber', header: t('vehicles.registration'), render: (v) => <span className="num whitespace-nowrap font-semibold">{v.registrationNumber}</span> },
          { key: 'type', header: t('common.type'), render: (v) => `${humanize(v.type)}${v.make ? ` — ${v.make} ${v.model || ''}` : ''}` },
          { key: 'capacityKg', header: t('vehicles.capacity'), align: 'right', render: (v) => formatKg(v.capacityKg) },
          { key: 'docs', header: t('dnav.tabs.documents'), align: 'right', render: (v) => v.documents.length },
          { key: 'insuranceExpiry', header: t('vehicles.insuranceUntilShort'), render: (v) => <span className={v.insuranceExpiry && new Date(v.insuranceExpiry) < new Date() ? 'font-semibold text-red-600' : ''}>{formatDate(v.insuranceExpiry)}</span> },
          { key: 'verificationStatus', header: t('vehicles.verification'), render: (v) => <StatusBadge status={v.verificationStatus} /> },
          { key: 'trips', header: t('dnav.tabs.trips'), align: 'right', render: (v) => v._count.trips },
        ]}
        empty={<EmptyState icon={Car} title={t('vehicles.emptyTitle')} description={t('vehicles.emptyBody')} action={<Button onClick={() => setAdding(true)}>{t('vehicles.register')}</Button>} />}
      />
      {adding && <VehicleForm onClose={() => setAdding(false)} onSaved={(v) => navigate(`/driver/vehicles/${v.id}`)} />}
    </>
  );
};

export default VehiclesPage;
