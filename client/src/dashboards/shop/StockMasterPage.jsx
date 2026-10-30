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
import { useI18n } from '../../i18n';

const ItemForm = ({ item, onClose, onSaved }) => {
  const { t } = useI18n();
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
        toast.success(t('stock.updated', '', { name: item.product.name }));
      } else {
        await inventoryApi.create({ productId: v.productId, sellingPricePerKg: v.sellingPricePerKg, costPricePerKg: v.costPricePerKg || null, openingQuantityKg: v.openingQuantityKg || '0', lowStockThresholdKg: v.lowStockThresholdKg || '0' });
        toast.success(t('stock.added'));
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
      title={editing ? t('stock.editTitle', '', { name: item.product.name }) : t('stock.addTitle')}
      description={t(editing ? 'stock.editIntro' : 'stock.addIntro')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {editing ? t('common.saveChanges') : t('stock.addProduct')}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        {!editing && <ProductSelect required error={errors.productId?.message} {...register('productId', rules.required(t('common.product')))} />}
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('stock.sellingRate')} required suffix="₹/kg" inputMode="decimal" error={errors.sellingPricePerKg?.message} {...register('sellingPricePerKg', rules.money(t('stock.sellingRate')))} />
          <Input label={t('stock.costRate')} suffix="₹/kg" inputMode="decimal" error={errors.costPricePerKg?.message} {...register('costPricePerKg', { validate: (v) => !v || rules.money(t('stock.cost'), { allowZero: true }).validate(v) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {!editing && <Input label={t('stock.openingStock')} suffix="kg" inputMode="decimal" error={errors.openingQuantityKg?.message} {...register('openingQuantityKg', { validate: (v) => !v || /^\d+(\.\d{1,3})?$/.test(v) || t('validation.upTo3Decimals') })} />}
          <Input label={t('stock.warnBelow')} suffix="kg" inputMode="decimal" error={errors.lowStockThresholdKg?.message} {...register('lowStockThresholdKg', { validate: (v) => !v || /^\d+(\.\d{1,3})?$/.test(v) || t('validation.upTo3Decimals') })} />
        </div>
        {editing && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-field-700" {...register('isActive')} /> {t('stock.availableForBilling')}
          </label>
        )}
      </form>
    </Modal>
  );
};

/** Stock & rates master: what the shop sells and at what price. */
const StockMasterPage = () => {
  const { t } = useI18n();
  const [editing, setEditing] = useState(null);
  const list = useList((p) => inventoryApi.list(p), { initialFilters: { categoryType: '', includeInactive: 'true' }, pageSize: 25, sortBy: 'name', sortOrder: 'asc' });

  const columns = [
    {
      key: 'name',
      header: t('common.product'),
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
    { key: 'sellingPricePerKg', header: t('stock.sellingPerKg'), align: 'right', sortable: true, render: (i) => <span className="font-semibold">{formatINR(i.sellingPricePerKg)}</span> },
    { key: 'cost', header: t('stock.costPerKg'), align: 'right', render: (i) => (i.costPricePerKg ? formatINR(i.costPricePerKg) : '—') },
    {
      key: 'margin',
      header: t('stock.margin'),
      align: 'right',
      render: (i) => (i.costPricePerKg && Number(i.costPricePerKg) > 0 ? `${(((Number(i.sellingPricePerKg) - Number(i.costPricePerKg)) / Number(i.costPricePerKg)) * 100).toFixed(0)}%` : '—'),
    },
    { key: 'quantityKg', header: t('stock.inStock'), align: 'right', sortable: true, render: (i) => <span className={i.isLowStock ? 'font-semibold text-turmeric-700' : ''}>{formatKg(i.quantityKg)}</span> },
    { key: 'isActive', header: t('stock.billing'), render: (i) => <StatusBadge status={i.isActive ? 'ACTIVE' : 'PAUSED'}>{t(i.isActive ? 'common.on' : 'common.off')}</StatusBadge> },
    { key: 'updatedAt', header: t('stock.updatedCol'), sortable: true, render: (i) => <span className="text-soil-500">{formatDateTime(i.updatedAt)}</span> },
    {
      key: 'edit',
      header: '',
      render: (i) => (
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(i)}>
          {t('common.edit')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('stock.title')}
        description={t('stock.intro')}
        actions={
          <Button icon={Plus} onClick={() => setEditing('new')}>
            {t('stock.addProduct')}
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
              tabs={['', 'VEGETABLE', 'FRUIT', 'LEAFY_GREEN'].map((value) => ({ value, label: value ? t(`categoryType.${value}`) : t('common.all') }))}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('common.searchProducts')} className="sm:w-60" />
          </>
        }
        empty={<EmptyState icon={Tags} title={t('stock.emptyTitle')} description={t('stock.emptyBody')} action={<Button onClick={() => setEditing('new')}>{t('stock.addProduct')}</Button>} />}
      />
      {editing && <ItemForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={list.reload} />}
    </>
  );
};

export default StockMasterPage;
