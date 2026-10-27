import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Tags } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import SearchInput from '../../components/common/SearchInput';
import Tabs from '../../components/common/Tabs';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/modals/Modal';
import { Input } from '../../components/forms/Field';
import ProductSelect from '../../features/products/ProductSelect';
import useList from '../../hooks/useList';
import { inventoryApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, formatDateTime } from '../../utils/format';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';

const ItemForm = ({ item, onClose, onSaved }) => {
  const toast = useToast();
  const editing = !!item;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: editing
      ? { sellingPricePerKg: String(Number(item.sellingPricePerKg)), costPricePerKg: item.costPricePerKg ? String(Number(item.costPricePerKg)) : '', lowStockThresholdKg: String(Number(item.lowStockThresholdKg)), isActive: item.isActive }
      : { productId: '', sellingPricePerKg: '', costPricePerKg: '', openingQuantityKg: '0', lowStockThresholdKg: '5' },
  });

  const submit = async (v) => {
    try {
      if (editing) {
        await inventoryApi.update(item.id, { sellingPricePerKg: v.sellingPricePerKg, costPricePerKg: v.costPricePerKg || null, lowStockThresholdKg: v.lowStockThresholdKg, isActive: v.isActive });
        toast.success(`${item.product.name} updated`);
      } else {
        await inventoryApi.create({ productId: v.productId, sellingPricePerKg: v.sellingPricePerKg, costPricePerKg: v.costPricePerKg || null, openingQuantityKg: v.openingQuantityKg || '0', lowStockThresholdKg: v.lowStockThresholdKg || '0' });
        toast.success('Product added to your stock master');
      }
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
      title={editing ? `Edit ${item.product.name}` : 'Add a product'}
      description={editing ? 'Rate changes apply to new bills immediately and are logged.' : 'Choose from the KisanVani catalogue and set your selling rate.'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {editing ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        {!editing && <ProductSelect required error={errors.productId?.message} {...register('productId', rules.required('Product'))} />}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Selling rate" required suffix="₹/kg" inputMode="decimal" error={errors.sellingPricePerKg?.message} {...register('sellingPricePerKg', rules.money('Selling rate'))} />
          <Input label="Cost rate" suffix="₹/kg" inputMode="decimal" error={errors.costPricePerKg?.message} {...register('costPricePerKg', { validate: (v) => !v || rules.money('Cost', { allowZero: true }).validate(v) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {!editing && <Input label="Opening stock" suffix="kg" inputMode="decimal" error={errors.openingQuantityKg?.message} {...register('openingQuantityKg', { validate: (v) => !v || /^\d+(\.\d{1,3})?$/.test(v) || 'Up to 3 decimals' })} />}
          <Input label="Warn below" suffix="kg" inputMode="decimal" error={errors.lowStockThresholdKg?.message} {...register('lowStockThresholdKg', { validate: (v) => !v || /^\d+(\.\d{1,3})?$/.test(v) || 'Up to 3 decimals' })} />
        </div>
        {editing && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-field-700" {...register('isActive')} /> Available for billing
          </label>
        )}
      </form>
    </Modal>
  );
};

/** Stock & rates master: what the shop sells and at what price. */
const StockMasterPage = () => {
  const [editing, setEditing] = useState(null);
  const list = useList((p) => inventoryApi.list(p), { initialFilters: { categoryType: '', includeInactive: 'true' }, pageSize: 25, sortBy: 'name', sortOrder: 'asc' });

  const columns = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (i) => (
        <span className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            {i.product.emoji}
          </span>
          <span>
            <span className="font-medium">{i.product.name}</span>
            <span className="block text-xs text-soil-500">{i.product.category.name}</span>
          </span>
        </span>
      ),
    },
    { key: 'sellingPricePerKg', header: 'Selling ₹/kg', align: 'right', sortable: true, render: (i) => <span className="font-semibold">{formatINR(i.sellingPricePerKg)}</span> },
    { key: 'cost', header: 'Cost ₹/kg', align: 'right', render: (i) => (i.costPricePerKg ? formatINR(i.costPricePerKg) : '—') },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      render: (i) => (i.costPricePerKg && Number(i.costPricePerKg) > 0 ? `${(((Number(i.sellingPricePerKg) - Number(i.costPricePerKg)) / Number(i.costPricePerKg)) * 100).toFixed(0)}%` : '—'),
    },
    { key: 'quantityKg', header: 'In stock', align: 'right', sortable: true, render: (i) => <span className={i.isLowStock ? 'font-semibold text-turmeric-700' : ''}>{formatKg(i.quantityKg)}</span> },
    { key: 'isActive', header: 'Billing', render: (i) => <StatusBadge status={i.isActive ? 'ACTIVE' : 'PAUSED'}>{i.isActive ? 'On' : 'Off'}</StatusBadge> },
    { key: 'updatedAt', header: 'Updated', sortable: true, render: (i) => <span className="text-soil-500">{formatDateTime(i.updatedAt)}</span> },
    {
      key: 'edit',
      header: '',
      render: (i) => (
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(i)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Stock & rates master"
        description="Products you sell and their selling rates. The billing screen always uses these rates."
        actions={
          <Button icon={Plus} onClick={() => setEditing('new')}>
            Add product
          </Button>
        }
      />
      <DataTable
        list={list}
        columns={columns}
        toolbar={
          <>
            <Tabs
              value={list.filters.categoryType}
              onChange={(categoryType) => list.setFilters({ categoryType })}
              tabs={[
                { value: '', label: 'All' },
                { value: 'VEGETABLE', label: 'Vegetables' },
                { value: 'FRUIT', label: 'Fruits' },
                { value: 'LEAFY_GREEN', label: 'Leafy greens' },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Search products" className="sm:w-60" />
          </>
        }
        empty={<EmptyState icon={Tags} title="Your stock master is empty" description="Add the products you sell with a selling rate per kg." action={<Button onClick={() => setEditing('new')}>Add product</Button>} />}
      />
      {editing && <ItemForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </>
  );
};

export default StockMasterPage;
