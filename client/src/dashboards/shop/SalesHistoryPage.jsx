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
import { formatINR, formatDateTime, modeLabel, humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

/** All bills with search, filters, preview, reprint and cancel (restores stock and udhar). */
const SalesHistoryPage = () => {
  const { t } = useI18n();
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
      toast.success(t('sales.cancelledToast', '', { number: cancelling.invoiceNumber }));
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
        title={t('sales.title')}
        description={list.meta ? t('sales.summary', '', { n: list.meta.total, amount: formatINR(list.meta.totalValue) }) : t('sales.intro')}
        actions={
          <Button variant="secondary" icon={Download} onClick={() => reportsApi.export({ dataset: 'sales', from: list.filters.from || undefined, to: list.filters.to || undefined })}>
            {t('common.export')}
          </Button>
        }
      />
      <DataTable
        list={list}
        columns={[
          { key: 'invoiceNumber', header: t('sales.bill'), sortable: true, render: (i) => <span className="num whitespace-nowrap font-semibold">{i.invoiceNumber}</span> },
          { key: 'createdAt', header: t('common.date'), sortable: true, render: (i) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(i.createdAt)}</span> },
          { key: 'customer', header: t('common.customer'), render: (i) => i.customerName || <span className="text-soil-400">{t('shopDash.walkIn')}</span> },
          { key: 'items', header: t('common.items'), align: 'right', render: (i) => i._count.items },
          { key: 'paymentMode', header: t('sales.paidBy'), render: (i) => modeLabel(i.paymentMode) },
          { key: 'total', header: t('common.total'), align: 'right', sortable: true, render: (i) => <span className={`font-semibold ${i.status === 'CANCELLED' ? 'text-soil-400 line-through' : ''}`}>{formatINR(i.total)}</span> },
          { key: 'status', header: t('common.status'), render: (i) => <StatusBadge status={i.status === 'COMPLETED' ? 'PAID' : 'CANCELLED'}>{humanize(i.status)}</StatusBadge> },
          {
            key: 'actions',
            header: '',
            render: (i) => (
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" icon={Eye} onClick={() => openPreview(i.id)} aria-label={t('sales.viewBill', '', { number: i.invoiceNumber })} />
                <Button size="icon" variant="ghost" icon={Printer} href={`/shop/invoices/${i.id}/print?auto=1`} aria-label={t('sales.reprintBill', '', { number: i.invoiceNumber })} />
                {i.status === 'COMPLETED' && <Button size="icon" variant="ghost" icon={Ban} onClick={() => setCancelling(i)} aria-label={t('sales.cancelBillLabel', '', { number: i.invoiceNumber })} />}
              </div>
            ),
          },
        ]}
        toolbar={
          <>
            <Tabs
              value={list.filters.paymentMode}
              onChange={(paymentMode) => list.setFilters({ paymentMode })}
              tabs={[{ value: '', label: t('common.all') }, ...['CASH', 'UPI', 'CREDIT'].map((m) => ({ value: m, label: modeLabel(m) }))]}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DateRangeFilter value={{ from: list.filters.from, to: list.filters.to }} onChange={(r) => list.setFilters(r)} />
              <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('sales.searchPlaceholder')} className="sm:w-56" />
            </div>
          </>
        }
        empty={<EmptyState icon={Receipt} title={t('sales.emptyTitle')} description={t('sales.emptyBody')} action={<Button to="/shop/pos">{t('shopDash.startBilling')}</Button>} />}
      />
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.invoiceNumber} size="sm" footer={<Button icon={Printer} href={preview ? `/shop/invoices/${preview.id}/print?auto=1` : undefined}>{t('common.print')}</Button>}>
        {preview && <ThermalReceipt invoice={preview} />}
      </Modal>
      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title={t('sales.cancelTitle', '', { number: cancelling?.invoiceNumber })}
        message={t('sales.cancelMessage')}
        confirmLabel={t('sales.cancelBill')}
        requireReason
        busy={busy}
        onConfirm={cancel}
      />
    </>
  );
};

export default SalesHistoryPage;
