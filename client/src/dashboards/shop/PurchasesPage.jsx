import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2, PackageOpen, ShoppingCart, Wallet, PackageCheck, Ban } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/modals/Modal';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import { DetailList } from '../../components/common/Section';
import { Select, Textarea } from '../../components/forms/Field';
import ProductSelect from '../../features/products/ProductSelect';
import QuantityConfirmModal from '../../features/orders/QuantityConfirmModal';
import RecordPaymentModal from '../../features/payments/RecordPaymentModal';
import useList from '../../hooks/useList';
import useAsync from '../../hooks/useAsync';
import { procurementApi, suppliersApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, formatDateTime } from '../../utils/format';
import { rules } from '../../validators';

const NewPurchase = ({ onClose, onSaved }) => {
  const toast = useToast();
  const suppliers = useAsync(() => suppliersApi.list({ limit: 100, sortBy: 'name', sortOrder: 'asc' }).then((r) => r.data), []);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { supplierId: '', items: [{ productId: '', quantityKg: '', unitCost: '' }], notes: '' } });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const total = items.reduce((a, i) => a + (Number(i.quantityKg) || 0) * (Number(i.unitCost) || 0), 0);

  const submit = async (v) => {
    try {
      const po = await procurementApi.createPurchase({ supplierId: v.supplierId, items: v.items, notes: v.notes || null });
      toast.success(`Purchase ${po.poNumber} recorded. Receive it when the goods arrive to add stock.`);
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
      size="lg"
      title="Record a supplier purchase"
      description="Stock is added only when you mark the purchase received, using the received quantities."
      footer={
        <>
          <span className="num mr-auto self-center font-semibold">Total {formatINR(total)}</span>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            Save purchase
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Select
          label="Supplier"
          required
          placeholder={suppliers.loading ? 'Loading…' : suppliers.data?.length ? 'Choose a supplier' : 'Add a supplier first'}
          options={(suppliers.data || []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
          error={errors.supplierId?.message}
          {...register('supplierId', rules.required('Supplier'))}
        />
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-soil-200 p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <ProductSelect className="col-span-2 sm:col-span-1" error={errors.items?.[i]?.productId?.message} {...register(`items.${i}.productId`, rules.required('Product'))} />
              <label className="block">
                <span className="field-label">Qty (kg)</span>
                <input className={`input num ${errors.items?.[i]?.quantityKg ? 'input-error' : ''}`} inputMode="decimal" {...register(`items.${i}.quantityKg`, rules.positive('Quantity'))} />
              </label>
              <label className="block">
                <span className="field-label">Cost ₹/kg</span>
                <input className={`input num ${errors.items?.[i]?.unitCost ? 'input-error' : ''}`} inputMode="decimal" {...register(`items.${i}.unitCost`, rules.money('Cost'))} />
              </label>
              <Button variant="ghost" size="icon" icon={Trash2} onClick={() => remove(i)} disabled={fields.length === 1} aria-label="Remove line" />
            </div>
          ))}
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => append({ productId: '', quantityKg: '', unitCost: '' })}>
            Add line
          </Button>
        </div>
        <Textarea label="Notes" rows={2} {...register('notes')} />
      </form>
    </Modal>
  );
};

const PurchaseDetail = ({ id, onClose, onChanged }) => {
  const toast = useToast();
  const { data: po, reload } = useAsync(() => procurementApi.purchase(id), [id]);
  const [receiving, setReceiving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const refresh = () => {
    reload();
    onChanged();
  };
  if (!po) return null;
  const due = Number(po.total) - Number(po.amountPaid);
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Purchase ${po.poNumber}`}
      description={`${po.supplier.name} · ${formatDateTime(po.orderedAt)}`}
      footer={
        <>
          {po.status === 'ORDERED' && (
            <>
              <Button variant="ghost" icon={Ban} onClick={() => setCancelling(true)}>
                Cancel purchase
              </Button>
              <Button icon={PackageCheck} onClick={() => setReceiving(true)}>
                Mark received
              </Button>
            </>
          )}
          {po.status !== 'CANCELLED' && due > 0.004 && (
            <Button variant="secondary" icon={Wallet} onClick={() => setPaying(true)}>
              Pay supplier
            </Button>
          )}
        </>
      }
    >
      <DetailList items={[['Status', <StatusBadge key="s" status={po.status} />], ['Total', formatINR(po.total)], ['Paid', formatINR(po.amountPaid)], ['Received', po.receivedAt ? formatDateTime(po.receivedAt) : '—']]} />
      <table className="mt-5 min-w-full text-sm">
        <thead className="text-left text-xs text-soil-500">
          <tr>
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Ordered</th>
            <th className="py-2 text-right">Received</th>
            <th className="py-2 text-right">Cost</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="num divide-y divide-soil-100">
          {po.items.map((i) => (
            <tr key={i.id}>
              <td className="py-2 font-sans">
                {i.product.emoji} {i.product.name}
              </td>
              <td className="py-2 text-right">{formatKg(i.quantityKg)}</td>
              <td className="py-2 text-right">{i.receivedQuantityKg != null ? formatKg(i.receivedQuantityKg) : '—'}</td>
              <td className="py-2 text-right">{formatINR(i.unitCost)}</td>
              <td className="py-2 text-right">{formatINR(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {po.notes && <p className="mt-4 whitespace-pre-line text-sm text-soil-600">{po.notes}</p>}
      <QuantityConfirmModal
        open={receiving}
        onClose={() => setReceiving(false)}
        title="Receive purchase"
        description="Enter what actually arrived. Stock increases by these quantities."
        items={po.items.map((i) => ({ ...i, itemName: i.product.name }))}
        field="receivedQuantityKg"
        cap={(i) => Number(i.quantityKg) * 1.1}
        defaultQty={(i) => i.quantityKg}
        confirmLabel="Add to stock"
        onConfirm={async (items) => {
          try {
            await procurementApi.receivePurchase(po.id, { items });
            toast.success('Purchase received and stock updated');
            refresh();
          } catch (e) {
            toast.error(e);
            throw e;
          }
        }}
      />
      <RecordPaymentModal open={paying} onClose={() => setPaying(false)} title="Pay supplier" due={due} payeeName={po.supplier.name} onSubmit={(body) => procurementApi.payPurchase(po.id, body).then(refresh)} />
      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        title="Cancel this purchase?"
        confirmLabel="Cancel purchase"
        requireReason
        onConfirm={async (reason) => {
          try {
            await procurementApi.cancelPurchase(po.id, reason);
            setCancelling(false);
            refresh();
          } catch (e) {
            toast.error(e);
          }
        }}
      />
    </Modal>
  );
};

/** Shop purchases: supplier purchase orders recorded here, plus a link to KisanVani orders. */
const PurchasesPage = () => {
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const list = useList((p) => procurementApi.purchases(p), { initialFilters: { status: '' } });

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Stock bought from your own suppliers. Orders placed with farmers and Market Mandis are under My orders."
        actions={
          <>
            <Button variant="secondary" icon={ShoppingCart} to="/shop/orders">
              My KisanVani orders
            </Button>
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Record purchase
            </Button>
          </>
        }
      />
      <DataTable
        list={list}
        onRowClick={(po) => setViewing(po.id)}
        columns={[
          { key: 'poNumber', header: 'Purchase', render: (p) => <span className="num whitespace-nowrap font-semibold">{p.poNumber}</span> },
          { key: 'supplier', header: 'Supplier', render: (p) => p.supplier.name },
          { key: 'items', header: 'Lines', align: 'right', render: (p) => p._count.items },
          { key: 'total', header: 'Total', align: 'right', sortable: true, render: (p) => formatINR(p.total) },
          { key: 'paid', header: 'Paid', align: 'right', render: (p) => formatINR(p.amountPaid) },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          { key: 'createdAt', header: 'Date', sortable: true, render: (p) => formatDateTime(p.createdAt) },
        ]}
        toolbar={
          <>
            <Tabs
              value={list.filters.status}
              onChange={(status) => list.setFilters({ status })}
              tabs={[
                { value: '', label: 'All' },
                { value: 'ORDERED', label: 'Awaiting goods' },
                { value: 'RECEIVED', label: 'Received' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Purchase no. or supplier" className="sm:w-64" />
          </>
        }
        empty={<EmptyState icon={PackageOpen} title="No supplier purchases" description="Record what you buy from wholesalers so stock and costs stay accurate." action={<Button onClick={() => setCreating(true)}>Record purchase</Button>} />}
      />
      {creating && <NewPurchase onClose={() => setCreating(false)} onSaved={list.reload} />}
      {viewing && <PurchaseDetail id={viewing} onClose={() => setViewing(null)} onChanged={list.reload} />}
    </>
  );
};

export default PurchasesPage;
