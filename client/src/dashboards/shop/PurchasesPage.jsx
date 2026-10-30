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
import { formatINR, formatKg, formatDateTime, humanize } from '../../utils/format';
import { rules } from '../../validators';
import { useI18n } from '../../i18n';

const NewPurchase = ({ onClose, onSaved }) => {
  const { t } = useI18n();
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
      toast.success(t('purchases.recordedToast', '', { number: po.poNumber }));
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
      title={t('purchases.newTitle')}
      description={t('purchases.newIntro')}
      footer={
        <>
          <span className="num mr-auto self-center font-semibold">{t('purchases.totalAmount', '', { amount: formatINR(total) })}</span>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(submit)} loading={isSubmitting}>
            {t('purchases.savePurchase')}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <Select
          label={t('purchases.supplier')}
          required
          placeholder={suppliers.loading ? t('common.loading') : suppliers.data?.length ? t('purchases.chooseSupplier') : t('purchases.addSupplierFirst')}
          options={(suppliers.data || []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
          error={errors.supplierId?.message}
          {...register('supplierId', rules.required(t('purchases.supplier')))}
        />
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-soil-200 p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <ProductSelect className="col-span-2 sm:col-span-1" error={errors.items?.[i]?.productId?.message} {...register(`items.${i}.productId`, rules.required(t('common.product')))} />
              <label className="block">
                <span className="field-label">{t('purchases.qtyKg')}</span>
                <input className={`input num ${errors.items?.[i]?.quantityKg ? 'input-error' : ''}`} inputMode="decimal" {...register(`items.${i}.quantityKg`, rules.positive(t('common.quantity')))} />
              </label>
              <label className="block">
                <span className="field-label">{t('stock.costPerKg')}</span>
                <input className={`input num ${errors.items?.[i]?.unitCost ? 'input-error' : ''}`} inputMode="decimal" {...register(`items.${i}.unitCost`, rules.money(t('stock.cost')))} />
              </label>
              <Button variant="ghost" size="icon" icon={Trash2} onClick={() => remove(i)} disabled={fields.length === 1} aria-label={t('purchases.removeLine')} />
            </div>
          ))}
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => append({ productId: '', quantityKg: '', unitCost: '' })}>
            {t('purchases.addLine')}
          </Button>
        </div>
        <Textarea label={t('common.notes')} rows={2} {...register('notes')} />
      </form>
    </Modal>
  );
};

const PurchaseDetail = ({ id, onClose, onChanged }) => {
  const { t } = useI18n();
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
      title={t('purchases.detailTitle', '', { number: po.poNumber })}
      description={`${po.supplier.name} · ${formatDateTime(po.orderedAt)}`}
      footer={
        <>
          {po.status === 'ORDERED' && (
            <>
              <Button variant="ghost" icon={Ban} onClick={() => setCancelling(true)}>
                {t('purchases.cancelPurchase')}
              </Button>
              <Button icon={PackageCheck} onClick={() => setReceiving(true)}>
                {t('purchases.markReceived')}
              </Button>
            </>
          )}
          {po.status !== 'CANCELLED' && due > 0.004 && (
            <Button variant="secondary" icon={Wallet} onClick={() => setPaying(true)}>
              {t('purchases.paySupplier')}
            </Button>
          )}
        </>
      }
    >
      <DetailList items={[[t('common.status'), <StatusBadge key="s" status={po.status} />], [t('common.total'), formatINR(po.total)], [t('purchases.paid'), formatINR(po.amountPaid)], [t('purchases.received'), po.receivedAt ? formatDateTime(po.receivedAt) : '—']]} />
      <table className="mt-5 min-w-full text-sm">
        <thead className="text-left text-xs text-soil-500">
          <tr>
            <th className="py-2">{t('common.item')}</th>
            <th className="py-2 text-right">{t('purchases.ordered')}</th>
            <th className="py-2 text-right">{t('purchases.received')}</th>
            <th className="py-2 text-right">{t('stock.cost')}</th>
            <th className="py-2 text-right">{t('common.amount')}</th>
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
        title={t('purchases.receiveTitle')}
        description={t('purchases.receiveIntro')}
        items={po.items.map((i) => ({ ...i, itemName: i.product.name }))}
        field="receivedQuantityKg"
        cap={(i) => Number(i.quantityKg) * 1.1}
        defaultQty={(i) => i.quantityKg}
        confirmLabel={t('inventory.addToStock')}
        onConfirm={async (items) => {
          try {
            await procurementApi.receivePurchase(po.id, { items });
            toast.success(t('purchases.receivedToast'));
            refresh();
          } catch (e) {
            toast.error(e);
            throw e;
          }
        }}
      />
      <RecordPaymentModal open={paying} onClose={() => setPaying(false)} title={t('purchases.paySupplier')} due={due} payeeName={po.supplier.name} onSubmit={(body) => procurementApi.payPurchase(po.id, body).then(refresh)} />
      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        title={t('purchases.cancelTitle')}
        confirmLabel={t('purchases.cancelPurchase')}
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
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const list = useList((p) => procurementApi.purchases(p), { initialFilters: { status: '' } });

  return (
    <>
      <PageHeader
        title={t('purchases.title')}
        description={t('purchases.intro')}
        actions={
          <>
            <Button variant="secondary" icon={ShoppingCart} to="/shop/orders">
              {t('purchases.myOrders')}
            </Button>
            <Button icon={Plus} onClick={() => setCreating(true)}>
              {t('purchases.record')}
            </Button>
          </>
        }
      />
      <DataTable
        list={list}
        onRowClick={(po) => setViewing(po.id)}
        columns={[
          { key: 'poNumber', header: t('purchases.purchase'), render: (p) => <span className="num whitespace-nowrap font-semibold">{p.poNumber}</span> },
          { key: 'supplier', header: t('purchases.supplier'), render: (p) => p.supplier.name },
          { key: 'items', header: t('purchases.lines'), align: 'right', render: (p) => p._count.items },
          { key: 'total', header: t('common.total'), align: 'right', sortable: true, render: (p) => formatINR(p.total) },
          { key: 'paid', header: t('purchases.paid'), align: 'right', render: (p) => formatINR(p.amountPaid) },
          { key: 'status', header: t('common.status'), render: (p) => <StatusBadge status={p.status} /> },
          { key: 'createdAt', header: t('common.date'), sortable: true, render: (p) => formatDateTime(p.createdAt) },
        ]}
        toolbar={
          <>
            <Tabs
              value={list.filters.status}
              onChange={(status) => list.setFilters({ status })}
              tabs={[
                { value: '', label: t('common.all') },
                { value: 'ORDERED', label: t('purchases.awaiting') },
                { value: 'RECEIVED', label: t('purchases.received') },
                { value: 'CANCELLED', label: humanize('CANCELLED') },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('purchases.searchPlaceholder')} className="sm:w-64" />
          </>
        }
        empty={<EmptyState icon={PackageOpen} title={t('purchases.emptyTitle')} description={t('purchases.emptyBody')} action={<Button onClick={() => setCreating(true)}>{t('purchases.record')}</Button>} />}
      />
      {creating && <NewPurchase onClose={() => setCreating(false)} onSaved={list.reload} />}
      {viewing && <PurchaseDetail id={viewing} onClose={() => setViewing(null)} onChanged={list.reload} />}
    </>
  );
};

export default PurchasesPage;
