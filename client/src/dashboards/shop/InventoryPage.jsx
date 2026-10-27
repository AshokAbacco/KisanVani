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

const TXN_LABEL = {
  OPENING: 'Opening stock',
  SALE: 'Sale',
  SALE_CANCELLED: 'Bill cancelled',
  PURCHASE_RECEIPT: 'Supplier purchase',
  ORDER_RECEIPT: 'KisanVani order received',
  ADJUSTMENT: 'Correction',
  WASTAGE: 'Wastage',
};

const AdjustModal = ({ item, onClose, onDone }) => {
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
      toast.success('Stock updated');
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
      title={`Adjust ${item.product.name}`}
      description={`Currently ${formatKg(item.quantityKg)} in stock. Every adjustment is recorded with your note.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid} loading={busy}>
            Save adjustment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Reason"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: 'WASTAGE', label: 'Wastage (spoiled, damaged)' },
            { value: 'ADJUSTMENT', label: 'Correction after counting' },
          ]}
        />
        {type === 'ADJUSTMENT' && (
          <Select
            label="Direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            options={[
              { value: 'IN', label: 'Add to stock' },
              { value: 'OUT', label: 'Remove from stock' },
            ]}
          />
        )}
        <Input label="Quantity" suffix="kg" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Textarea label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2 kg tomatoes crushed in transport" />
      </div>
    </Modal>
  );
};

/** Stock levels and the full stock ledger. */
const InventoryPage = () => {
  const [params] = useSearchParams();
  const [tab, setTab] = useState('levels');
  const [adjusting, setAdjusting] = useState(null);
  const levels = useList((p) => inventoryApi.list(p), { initialFilters: { lowStock: params.get('lowStock') === 'true' ? 'true' : '' }, pageSize: 25, sortBy: 'quantityKg', sortOrder: 'asc' });
  const ledger = useList((p) => inventoryApi.transactions(p), { initialFilters: { type: '' }, pageSize: 25 });

  return (
    <>
      <PageHeader title="Inventory" description="What is in stock now, and every movement that got it there." />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'levels', label: 'Stock levels' },
          { value: 'ledger', label: 'Stock ledger' },
        ]}
      />
      {tab === 'levels' ? (
        <DataTable
          list={levels}
          columns={[
            { key: 'name', header: 'Product', sortable: true, render: (i) => `${i.product.emoji || ''} ${i.product.name}` },
            { key: 'quantityKg', header: 'In stock', align: 'right', sortable: true, render: (i) => <span className="font-semibold">{formatKg(i.quantityKg)}</span> },
            { key: 'threshold', header: 'Warn below', align: 'right', render: (i) => formatKg(i.lowStockThresholdKg) },
            { key: 'state', header: 'Status', render: (i) => (Number(i.quantityKg) <= 0 ? <StatusBadge tone="red">Out of stock</StatusBadge> : i.isLowStock ? <StatusBadge tone="amber">Low</StatusBadge> : <StatusBadge tone="green">OK</StatusBadge>) },
            {
              key: 'adjust',
              header: '',
              render: (i) => (
                <Button size="sm" variant="ghost" icon={SlidersHorizontal} onClick={() => setAdjusting(i)}>
                  Adjust
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
                  { value: '', label: 'All items' },
                  { value: 'true', label: 'Low stock' },
                ]}
              />
              <SearchInput value={levels.search} onChange={levels.setSearch} placeholder="Search products" className="sm:w-60" />
            </>
          }
          empty={<EmptyState icon={Boxes} title={levels.filters.lowStock ? 'Nothing is running low' : 'No stock yet'} description="Stock is added through purchases, KisanVani orders and the stock master." />}
        />
      ) : (
        <DataTable
          list={ledger}
          columns={[
            { key: 'createdAt', header: 'When', render: (t) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(t.createdAt)}</span> },
            { key: 'product', header: 'Product', render: (t) => `${t.inventoryItem.product.emoji || ''} ${t.inventoryItem.product.name}` },
            { key: 'type', header: 'Movement', render: (t) => TXN_LABEL[t.type] || humanize(t.type) },
            {
              key: 'change',
              header: 'Change',
              align: 'right',
              render: (t) => <span className={Number(t.quantityChangeKg) < 0 ? 'text-chilli-600' : 'text-field-700'}>{`${Number(t.quantityChangeKg) > 0 ? '+' : '−'}${formatKg(Math.abs(Number(t.quantityChangeKg)))}`}</span>,
            },
            { key: 'balance', header: 'Balance', align: 'right', render: (t) => formatKg(t.balanceAfterKg) },
            { key: 'note', header: 'Note', render: (t) => <span className="text-soil-500">{t.note || '—'}</span> },
            { key: 'by', header: 'By', render: (t) => t.createdBy?.name || '—' },
          ]}
          toolbar={
            <Tabs
              value={ledger.filters.type}
              onChange={(type) => ledger.setFilters({ type })}
              tabs={[
                { value: '', label: 'All' },
                { value: 'SALE', label: 'Sales' },
                { value: 'PURCHASE_RECEIPT', label: 'Purchases' },
                { value: 'ORDER_RECEIPT', label: 'Orders' },
                { value: 'WASTAGE', label: 'Wastage' },
                { value: 'ADJUSTMENT', label: 'Corrections' },
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
