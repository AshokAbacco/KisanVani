import { useState } from 'react';
import { Printer, Eye, Ban, Receipt, Download } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/modals/Modal';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import ThermalReceipt from '../../features/billing/ThermalReceipt';
import useList from '../../hooks/useList';
import { billingApi, reportsApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDateTime, modeLabel } from '../../utils/format';

/** All bills with search, filters, preview, reprint and cancel (restores stock and udhar). */
const SalesHistoryPage = () => {
  const toast = useToast();
  const [preview, setPreview] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = useList((p) => billingApi.list(p), { initialFilters: { paymentMode: '', status: '', from: '', to: '' } });

  const openPreview = async (id) => {
    try {
      setPreview(await billingApi.get(id));
    } catch (e) {
      toast.error(e);
    }
  };

  const cancel = async (reason) => {
    setBusy(true);
    try {
      await billingApi.cancel(cancelling.id, reason);
      toast.success(`Bill ${cancelling.invoiceNumber} cancelled. Stock has been restored.`);
      setCancelling(null);
      list.reload();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Sales history"
        description={list.meta ? `${list.meta.total} bills, ${formatINR(list.meta.totalValue)} in completed sales for this view.` : 'Every bill from the counter.'}
        actions={
          <Button variant="secondary" icon={Download} onClick={() => reportsApi.export({ dataset: 'sales', from: list.filters.from || undefined, to: list.filters.to || undefined })}>
            Export CSV
          </Button>
        }
      />
      <DataTable
        list={list}
        columns={[
          { key: 'invoiceNumber', header: 'Bill', sortable: true, render: (i) => <span className="num whitespace-nowrap font-semibold">{i.invoiceNumber}</span> },
          { key: 'createdAt', header: 'Date', sortable: true, render: (i) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(i.createdAt)}</span> },
          { key: 'customer', header: 'Customer', render: (i) => i.customerName || <span className="text-soil-400">Walk-in</span> },
          { key: 'items', header: 'Items', align: 'right', render: (i) => i._count.items },
          { key: 'paymentMode', header: 'Paid by', render: (i) => modeLabel(i.paymentMode) },
          { key: 'total', header: 'Total', align: 'right', sortable: true, render: (i) => <span className={`font-semibold ${i.status === 'CANCELLED' ? 'text-soil-400 line-through' : ''}`}>{formatINR(i.total)}</span> },
          { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status === 'COMPLETED' ? 'PAID' : 'CANCELLED'}>{i.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}</StatusBadge> },
          {
            key: 'actions',
            header: '',
            render: (i) => (
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" icon={Eye} onClick={() => openPreview(i.id)} aria-label={`View ${i.invoiceNumber}`} />
                <Button size="icon" variant="ghost" icon={Printer} href={`/shop/invoices/${i.id}/print?auto=1`} aria-label={`Reprint ${i.invoiceNumber}`} />
                {i.status === 'COMPLETED' && <Button size="icon" variant="ghost" icon={Ban} onClick={() => setCancelling(i)} aria-label={`Cancel ${i.invoiceNumber}`} />}
              </div>
            ),
          },
        ]}
        toolbar={
          <>
            <Tabs
              value={list.filters.paymentMode}
              onChange={(paymentMode) => list.setFilters({ paymentMode })}
              tabs={[
                { value: '', label: 'All' },
                { value: 'CASH', label: 'Cash' },
                { value: 'UPI', label: 'UPI' },
                { value: 'CREDIT', label: 'Udhar' },
              ]}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DateRangeFilter value={{ from: list.filters.from, to: list.filters.to }} onChange={(r) => list.setFilters(r)} />
              <SearchInput value={list.search} onChange={list.setSearch} placeholder="Bill no., name, mobile" className="sm:w-56" />
            </div>
          </>
        }
        empty={<EmptyState icon={Receipt} title="No bills found" description="Bills you save on the billing screen appear here." action={<Button to="/shop/pos">Start billing</Button>} />}
      />
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.invoiceNumber} size="sm" footer={<Button icon={Printer} href={preview ? `/shop/invoices/${preview.id}/print?auto=1` : undefined}>Print</Button>}>
        {preview && <ThermalReceipt invoice={preview} />}
      </Modal>
      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title={`Cancel bill ${cancelling?.invoiceNumber}?`}
        message="Items go back into stock, any udhar on this bill is reversed and recorded payments are marked refunded. This cannot be undone."
        confirmLabel="Cancel bill"
        requireReason
        busy={busy}
        onConfirm={cancel}
      />
    </>
  );
};

export default SalesHistoryPage;
