import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Boxes } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import SearchInput from '../../components/common/SearchInput';
import Tabs from '../../components/common/Tabs';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/modals/Modal';
import { Input, Select, Textarea } from '../../components/forms/Field';
import useList from '../../hooks/useList';
import { inventoryApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatKg, formatDateTime, humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

/** Stock movement types in shop words (inventory.txn.<TYPE>); unknown types fall back to humanize(). */
const TXN_TYPES = ['OPENING', 'SALE', 'SALE_CANCELLED', 'PURCHASE_RECEIPT', 'ORDER_RECEIPT', 'ADJUSTMENT', 'WASTAGE'];

const AdjustModal = ({ item, onClose, onDone }) => {
  const { t } = useI18n();
  const toast = useToast();
  const [type, setType] = useState('WASTAGE');
  const [direction, setDirection] = useState('OUT');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /^\d+(\.\d{1,3})?$/.test(qty) && Number(qty) > 0 && note.trim().length >= 3;

  const submit = async () => {
    setBusy(true);
    try {
      await inventoryApi.adjust(item.id, { type, direction: type === 'WASTAGE' ? 'OUT' : direction, quantityKg: qty, note });
      toast.success(t('inventory.stockUpdated'));
      onDone();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('inventory.adjustTitle', '', { name: item.product.name })}
      description={t('inventory.adjustIntro', '', { qty: formatKg(item.quantityKg) })}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!valid} loading={busy}>
            {t('inventory.saveAdjustment')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label={t('components.confirm.reason')}
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: 'WASTAGE', label: t('inventory.wastageOption') },
            { value: 'ADJUSTMENT', label: t('inventory.correctionOption') },
          ]}
        />
        {type === 'ADJUSTMENT' && (
          <Select
            label={t('inventory.direction')}
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            options={[
              { value: 'IN', label: t('inventory.addToStock') },
              { value: 'OUT', label: t('inventory.removeFromStock') },
            ]}
          />
        )}
        <Input label={t('common.quantity')} suffix="kg" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Textarea label={t('common.note')} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('inventory.notePlaceholder')} />
      </div>
    </Modal>
  );
};

/** Stock levels and the full stock ledger. */
const InventoryPage = () => {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [tab, setTab] = useState('levels');
  const [adjusting, setAdjusting] = useState(null);
  const levels = useList((p) => inventoryApi.list(p), { initialFilters: { lowStock: params.get('lowStock') === 'true' ? 'true' : '' }, pageSize: 25, sortBy: 'quantityKg', sortOrder: 'asc' });
  const ledger = useList((p) => inventoryApi.transactions(p), { initialFilters: { type: '' }, pageSize: 25 });

  return (
    <>
      <PageHeader title={t('inventory.title')} description={t('inventory.intro')} />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'levels', label: t('inventory.levels') },
          { value: 'ledger', label: t('inventory.ledger') },
        ]}
      />
      {tab === 'levels' ? (
        <DataTable
          list={levels}
          columns={[
            { key: 'name', header: t('common.product'), sortable: true, render: (i) => `${i.product.emoji || ''} ${i.product.name}` },
            { key: 'quantityKg', header: t('stock.inStock'), align: 'right', sortable: true, render: (i) => <span className="font-semibold">{formatKg(i.quantityKg)}</span> },
            { key: 'threshold', header: t('stock.warnBelow'), align: 'right', render: (i) => formatKg(i.lowStockThresholdKg) },
            { key: 'state', header: t('common.status'), render: (i) => (Number(i.quantityKg) <= 0 ? <StatusBadge tone="red">{t('pos.outOfStock')}</StatusBadge> : i.isLowStock ? <StatusBadge tone="amber">{t('inventory.low')}</StatusBadge> : <StatusBadge tone="green">{t('inventory.ok')}</StatusBadge>) },
            {
              key: 'adjust',
              header: '',
              render: (i) => (
                <Button size="sm" variant="ghost" icon={SlidersHorizontal} onClick={() => setAdjusting(i)}>
                  {t('inventory.adjust')}
                </Button>
              ),
            },
          ]}
          toolbar={
            <>
              <Tabs
                value={levels.filters.lowStock}
                onChange={(lowStock) => levels.setFilters({ lowStock })}
                tabs={[
                  { value: '', label: t('inventory.allItems') },
                  { value: 'true', label: t('inventory.lowStock') },
                ]}
              />
              <SearchInput value={levels.search} onChange={levels.setSearch} placeholder={t('common.searchProducts')} className="sm:w-60" />
            </>
          }
          empty={<EmptyState icon={Boxes} title={t(levels.filters.lowStock ? 'inventory.nothingLow' : 'inventory.noStock')} description={t('inventory.emptyBody')} />}
        />
      ) : (
        <DataTable
          list={ledger}
          columns={[
            { key: 'createdAt', header: t('inventory.when'), render: (tx) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(tx.createdAt)}</span> },
            { key: 'product', header: t('common.product'), render: (tx) => `${tx.inventoryItem.product.emoji || ''} ${tx.inventoryItem.product.name}` },
            { key: 'type', header: t('inventory.movement'), render: (tx) => (TXN_TYPES.includes(tx.type) ? t(`inventory.txn.${tx.type}`) : humanize(tx.type)) },
            {
              key: 'change',
              header: t('inventory.change'),
              align: 'right',
              render: (tx) => <span className={Number(tx.quantityChangeKg) < 0 ? 'text-chilli-600' : 'text-field-700'}>{`${Number(tx.quantityChangeKg) > 0 ? '+' : '−'}${formatKg(Math.abs(Number(tx.quantityChangeKg)))}`}</span>,
            },
            { key: 'balance', header: t('inventory.balance'), align: 'right', render: (tx) => formatKg(tx.balanceAfterKg) },
            { key: 'note', header: t('common.note'), render: (tx) => <span className="text-soil-500">{tx.note || '—'}</span> },
            { key: 'by', header: t('inventory.by'), render: (tx) => tx.createdBy?.name || '—' },
          ]}
          toolbar={
            <Tabs
              value={ledger.filters.type}
              onChange={(type) => ledger.setFilters({ type })}
              tabs={[
                { value: '', label: t('common.all') },
                { value: 'SALE', label: t('inventory.filterSales') },
                { value: 'PURCHASE_RECEIPT', label: t('inventory.filterPurchases') },
                { value: 'ORDER_RECEIPT', label: t('inventory.filterOrders') },
                { value: 'WASTAGE', label: t('inventory.txn.WASTAGE') },
                { value: 'ADJUSTMENT', label: t('inventory.filterCorrections') },
              ]}
            />
          }
        />
      )}
      {adjusting && <AdjustModal item={adjusting} onClose={() => setAdjusting(null)} onDone={() => { levels.reload(); ledger.reload(); }} />}
    </>
  );
};

export default InventoryPage;
