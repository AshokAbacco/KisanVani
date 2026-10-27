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

const TYPES = [
  { value: 'WHOLESALER', label: 'Wholesaler' },
  { value: 'MANDI', label: 'Mandi trader' },
  { value: 'FARMER', label: 'Farmer' },
  { value: 'OTHER', label: 'Other' },
];

const SupplierForm = ({ supplier, onClose, onSaved }) => {
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
      toast.success('Supplier saved');
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
      title={supplier ? 'Edit supplier' : 'Add supplier'}
      size="sm"
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
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Input label="Name" required error={errors.name?.message} {...register('name', rules.name)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mobile" inputMode="tel" error={errors.mobile?.message} {...register('mobile', rules.optionalMobile)} />
          <Select label="Type" options={TYPES} {...register('type')} />
        </div>
        <Input label="GSTIN" {...register('gstin')} />
        <Textarea label="Address" rows={2} {...register('address')} />
        <Textarea label="Notes" rows={2} {...register('notes')} />
        {supplier && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-field-700" {...register('isActive')} /> Active
          </label>
        )}
      </form>
    </Modal>
  );
};

/** Off-platform suppliers the shop buys from (wholesalers, local traders). */
const SuppliersPage = () => {
  const [editing, setEditing] = useState(null);
  const list = useList((p) => suppliersApi.list(p), { initialFilters: { includeInactive: 'true' }, sortBy: 'name', sortOrder: 'asc' });
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="People you buy from outside KisanVani. Record purchases from them under Purchases."
        actions={
          <Button icon={Plus} onClick={() => setEditing('new')}>
            Add supplier
          </Button>
        }
      />
      <DataTable
        list={list}
        columns={[
          { key: 'name', header: 'Name', sortable: true, render: (s) => <span className="font-medium">{s.name}</span> },
          { key: 'type', header: 'Type', render: (s) => humanize(s.type) },
          { key: 'mobile', header: 'Mobile', render: (s) => s.mobile || '—' },
          { key: 'purchases', header: 'Purchases', align: 'right', render: (s) => s._count.purchaseOrders },
          { key: 'isActive', header: 'Status', render: (s) => <StatusBadge status={s.isActive ? 'ACTIVE' : 'DEACTIVATED'}>{s.isActive ? 'Active' : 'Inactive'}</StatusBadge> },
          { key: 'edit', header: '', render: (s) => <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(s)}>Edit</Button> },
        ]}
        toolbar={<SearchInput value={list.search} onChange={list.setSearch} placeholder="Name or mobile" className="sm:w-72" />}
        empty={<EmptyState icon={Container} title="No suppliers yet" action={<Button onClick={() => setEditing('new')}>Add supplier</Button>} />}
      />
      {editing && <SupplierForm supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </>
  );
};

export default SuppliersPage;
