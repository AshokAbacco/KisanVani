import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, ImagePlus, Trash2, Tags } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/modals/Modal';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import { Input, Select } from '../../components/forms/Field';
import useList from '../../hooks/useList';
import useAsync from '../../hooks/useAsync';
import { catalogApi } from '../../services';
import { clearCatalogueCache } from '../../features/products/ProductSelect';
import { useToast } from '../../context/ToastContext';
import { CATEGORY_TYPES } from '../../constants/status';
import { humanize } from '../../utils/format';
import { rules } from '../../validators';
import { applyFieldErrors } from '../../utils/errors';

const ProductForm = ({ product, categories, onClose, onSaved }) => {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: product ? { name: product.name, localName: product.localName || '', categoryId: product.categoryId, emoji: product.emoji || '', isActive: product.isActive } : { isActive: true } });
  const submit = async (v) => {
    try {
      const body = { name: v.name, localName: v.localName || null, categoryId: v.categoryId, emoji: v.emoji || null, isActive: v.isActive };
      if (product) await catalogApi.updateProduct(product.id, body);
      else await catalogApi.createProduct(body);
      clearCatalogueCache();
      toast.success('Product saved');
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
      title={product ? `Edit ${product.name}` : 'Add product'}
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
        <Input label="Name" required error={errors.name?.message} {...register('name', rules.required('Name'))} />
        <Input label="Local name" placeholder="e.g. Tamatar" {...register('localName')} />
        <Select label="Category" required placeholder="Choose" options={categories.map((c) => ({ value: c.id, label: c.name }))} error={errors.categoryId?.message} {...register('categoryId', rules.required('Category'))} />
        <Input label="Catalogue emoji" hint="Shown on produce cards only" maxLength={8} {...register('emoji')} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-field-700" {...register('isActive')} /> Active (available to list and sell)
        </label>
      </form>
    </Modal>
  );
};

const CategoryForm = ({ category, onClose, onSaved }) => {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: category ? { name: category.name, type: category.type, isActive: category.isActive } : { type: 'VEGETABLE', isActive: true } });
  const submit = async (v) => {
    try {
      if (category) await catalogApi.updateCategory(category.id, v);
      else await catalogApi.createCategory(v);
      clearCatalogueCache();
      toast.success('Category saved');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={category ? 'Edit category' : 'Add category'}
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
        <Input label="Name" required error={errors.name?.message} {...register('name', rules.required('Name'))} />
        <Select label="Type" options={CATEGORY_TYPES} {...register('type')} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-field-700" {...register('isActive')} /> Active
        </label>
      </form>
    </Modal>
  );
};

/** Product and category management. Products in use are deactivated rather than deleted. */
const CatalogPage = () => {
  const toast = useToast();
  const [tab, setTab] = useState('products');
  const [editing, setEditing] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [deletingCat, setDeletingCat] = useState(null);
  const categories = useAsync(() => catalogApi.categories({ includeInactive: 'true' }), []);
  const products = useList((p) => catalogApi.products(p), { initialFilters: { includeInactive: 'true', categoryId: '' }, pageSize: 25, sortBy: 'name', sortOrder: 'asc' });

  const uploadImage = async (product, file) => {
    try {
      await catalogApi.uploadProductImage(product.id, file);
      clearCatalogueCache();
      toast.success('Photo added');
      products.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Products & categories"
        description="The shared catalogue used by every listing, lot, stock master and bill."
        actions={
          tab === 'products' ? (
            <Button icon={Plus} onClick={() => setEditing('new')}>
              Add product
            </Button>
          ) : (
            <Button icon={Plus} onClick={() => setEditingCat('new')}>
              Add category
            </Button>
          )
        }
      />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'products', label: 'Products', count: products.meta?.total },
          { value: 'categories', label: 'Categories', count: categories.data?.length },
        ]}
      />
      {tab === 'products' ? (
        <DataTable
          list={products}
          columns={[
            {
              key: 'name',
              header: 'Product',
              sortable: true,
              render: (p) => (
                <span className="flex items-center gap-3">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-lg bg-field-50 text-lg">{p.emoji}</span>}
                  <span>
                    <span className="font-medium">{p.name}</span>
                    {p.localName && <span className="block text-xs text-soil-500">{p.localName}</span>}
                  </span>
                </span>
              ),
            },
            { key: 'category', header: 'Category', render: (p) => p.category.name },
            { key: 'isActive', header: 'Status', render: (p) => <StatusBadge status={p.isActive ? 'ACTIVE' : 'DEACTIVATED'}>{p.isActive ? 'Active' : 'Inactive'}</StatusBadge> },
            {
              key: 'actions',
              header: '',
              render: (p) => (
                <div className="flex justify-end gap-1">
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-soil-600 hover:bg-soil-100">
                    <ImagePlus className="h-4 w-4" aria-hidden /> Photo
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(p, e.target.files[0])} />
                  </label>
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(p)}>
                    Edit
                  </Button>
                </div>
              ),
            },
          ]}
          toolbar={
            <>
              <select className="input h-9 w-auto py-1" value={products.filters.categoryId} onChange={(e) => products.setFilters({ categoryId: e.target.value })} aria-label="Category">
                <option value="">All categories</option>
                {(categories.data || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <SearchInput value={products.search} onChange={products.setSearch} placeholder="Search products" className="sm:w-64" />
            </>
          }
          empty={<EmptyState icon={Tags} title="No products" />}
        />
      ) : (
        <DataTable
          list={{ items: categories.data || [], loading: categories.loading, error: categories.error, reload: categories.reload, meta: null }}
          columns={[
            { key: 'name', header: 'Category', render: (c) => <span className="font-medium">{c.name}</span> },
            { key: 'type', header: 'Type', render: (c) => humanize(c.type) },
            { key: 'products', header: 'Products', align: 'right', render: (c) => c._count.products },
            { key: 'isActive', header: 'Status', render: (c) => <StatusBadge status={c.isActive ? 'ACTIVE' : 'DEACTIVATED'}>{c.isActive ? 'Active' : 'Inactive'}</StatusBadge> },
            {
              key: 'actions',
              header: '',
              render: (c) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingCat(c)}>
                    Edit
                  </Button>
                  {c.isActive && <Button size="icon" variant="ghost" icon={Trash2} onClick={() => setDeletingCat(c)} aria-label={`Remove ${c.name}`} />}
                </div>
              ),
            },
          ]}
        />
      )}
      {editing && <ProductForm product={editing === 'new' ? null : editing} categories={(categories.data || []).filter((c) => c.isActive || c.id === editing?.categoryId)} onClose={() => setEditing(null)} onSaved={products.reload} />}
      {editingCat && <CategoryForm category={editingCat === 'new' ? null : editingCat} onClose={() => setEditingCat(null)} onSaved={categories.reload} />}
      <ConfirmDialog
        open={!!deletingCat}
        onClose={() => setDeletingCat(null)}
        title={`Remove ${deletingCat?.name}?`}
        message="Categories that are in use are deactivated instead of deleted, so past records stay intact."
        confirmLabel="Remove"
        onConfirm={async () => {
          try {
            const r = await catalogApi.deleteCategory(deletingCat.id);
            toast.success(r.deleted ? 'Category deleted' : 'Category deactivated');
            setDeletingCat(null);
            categories.reload();
          } catch (e) {
            toast.error(e);
          }
        }}
      />
    </>
  );
};

export default CatalogPage;
