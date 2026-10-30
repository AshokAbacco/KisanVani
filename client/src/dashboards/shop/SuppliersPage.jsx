import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Container } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/modals/Modal';
import { Input, Select, Textarea } from '../../components/forms/Field';
import useList from '../../hooks/useList';
import { suppliersApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { humanize } from '../../utils/format';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';
import { useI18n } from '../../i18n';

const TYPES = ['WHOLESALER', 'MANDI', 'FARMER', 'OTHER'];

const SupplierForm = ({ supplier, onClose, onSaved }) => {
  const { t } = useI18n();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: supplier ? { ...supplier, mobile: supplier.mobile || '', address: supplier.address || '', gstin: supplier.gstin || '', notes: supplier.notes || '' } : { type: 'WHOLESALER', isActive: true } });
  const submit = async (v) => {
    try {
      const body = { name: v.name, mobile: v.mobile || null, type: v.type, address: v.address || null, gstin: v.gstin || null, notes: v.notes || null, isActive: v.isActive };
      if (supplier) await suppliersApi.update(supplier.id, body);
      else await suppliersApi.create(body);
      toast.success(t('suppliers.saved'));
      onSaved();
      onClose();
    } catch (e) {
      if (!applyFieldErrors(e, setError)) toast.error(e);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t(supplier ? 'suppliers.edit' : 'suppliers.add')}
      size="sm"
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
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Input label={t('common.name')} required error={errors.name?.message} {...register('name', rules.name)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('common.mobile')} inputMode="tel" error={errors.mobile?.message} {...register('mobile', rules.optionalMobile)} />
          <Select label={t('common.type')} options={TYPES.map((value) => ({ value, label: t(`suppliers.types.${value}`) }))} {...register('type')} />
        </div>
        <Input label="GSTIN" {...register('gstin')} />
        <Textarea label={t('common.address')} rows={2} {...register('address')} />
        <Textarea label={t('common.notes')} rows={2} {...register('notes')} />
        {supplier && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-field-700" {...register('isActive')} /> {humanize('ACTIVE')}
          </label>
        )}
      </form>
    </Modal>
  );
};

/** Off-platform suppliers the shop buys from (wholesalers, local traders). */
const SuppliersPage = () => {
  const { t } = useI18n();
  const [editing, setEditing] = useState(null);
  const list = useList((p) => suppliersApi.list(p), { initialFilters: { includeInactive: 'true' }, sortBy: 'name', sortOrder: 'asc' });
  return (
    <>
      <PageHeader
        title={t('suppliers.title')}
        description={t('suppliers.intro')}
        actions={
          <Button icon={Plus} onClick={() => setEditing('new')}>
            {t('suppliers.add')}
          </Button>
        }
      />
      <DataTable
        list={list}
        columns={[
          { key: 'name', header: t('common.name'), sortable: true, render: (s) => <span className="font-medium">{s.name}</span> },
          { key: 'type', header: t('common.type'), render: (s) => (TYPES.includes(s.type) ? t(`suppliers.types.${s.type}`) : humanize(s.type)) },
          { key: 'mobile', header: t('common.mobile'), render: (s) => s.mobile || '—' },
          { key: 'purchases', header: t('purchases.title'), align: 'right', render: (s) => s._count.purchaseOrders },
          { key: 'isActive', header: t('common.status'), render: (s) => <StatusBadge status={s.isActive ? 'ACTIVE' : 'DEACTIVATED'}>{s.isActive ? humanize('ACTIVE') : t('common.inactive')}</StatusBadge> },
          { key: 'edit', header: '', render: (s) => <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(s)}>{t('common.edit')}</Button> },
        ]}
        toolbar={<SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.nameOrMobile')} className="sm:w-72" />}
        empty={<EmptyState icon={Container} title={t('suppliers.emptyTitle')} action={<Button onClick={() => setEditing('new')}>{t('suppliers.add')}</Button>} />}
      />
      {editing && <SupplierForm supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </>
  );
};

export default SuppliersPage;
