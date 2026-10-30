import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Play, Pause, CheckCheck, Package } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import useList from '../../hooks/useList';
import { farmerApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, formatDate, humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

/** The farmer's harvest listings with publish / pause / complete controls. */
const ListingsPage = () => {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(null);
  const list = useList((p) => farmerApi.listings(p), { initialFilters: { status: '' } });

  const setStatus = async (l, status) => {
    try {
      await farmerApi.setStatus(l.id, status);
      toast.success(t(`listings.toast.${status}`));
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title={t('listings.title')}
        description={t('listings.intro')}
        actions={
          <Button icon={Plus} to="/farmer/listings/new">
            {t('dnav.tabs.postNewHarvest')}
          </Button>
        }
      />
      <DataTable
        list={list}
        onRowClick={(l) => navigate(`/farmer/listings/${l.id}/edit`)}
        columns={[
          {
            key: 'crop',
            header: t('crops.crop'),
            render: (l) => (
              <div className="flex items-center gap-3">
                {l.images[0] ? <img src={l.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-field-50 text-xl">{l.product.emoji}</span>}
                <div>
                  <p className="font-medium">{l.cropName}</p>
                  <p className="text-xs text-soil-500">{[l.variety, l.grade && t('common.grade', '', { grade: l.grade })].filter(Boolean).join(', ') || '—'}</p>
                </div>
              </div>
            ),
          },
          { key: 'harvestAt', header: t('listings.harvest'), sortable: true, render: (l) => formatDate(l.harvestAt) },
          { key: 'pricePerKg', header: t('common.price'), align: 'right', sortable: true, render: (l) => t('common.perKg', '', { price: formatINR(l.pricePerKg) }) },
          {
            key: 'availableQuantityKg',
            header: t('listings.leftTotal'),
            align: 'right',
            sortable: true,
            render: (l) => (
              <span>
                <span className="font-semibold">{formatKg(l.availableQuantityKg, { grams: false })}</span>
                <span className="text-soil-400"> / {formatKg(l.totalQuantityKg, { grams: false })}</span>
              </span>
            ),
          },
          { key: 'orders', header: t('dnav.items.orders'), align: 'right', render: (l) => l._count.orderItems },
          { key: 'status', header: t('common.status'), render: (l) => <StatusBadge status={l.status} /> },
          {
            key: 'actions',
            header: '',
            render: (l) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {['DRAFT', 'PAUSED'].includes(l.status) && Number(l.availableQuantityKg) > 0 && (
                  <Button size="sm" icon={Play} onClick={() => setStatus(l, 'ACTIVE')}>
                    {t('listings.publish')}
                  </Button>
                )}
                {['ACTIVE', 'SOLD_OUT'].includes(l.status) && (
                  <Button size="sm" variant="ghost" icon={Pause} onClick={() => setStatus(l, 'PAUSED')}>
                    {t('listings.pause')}
                  </Button>
                )}
                {l.status !== 'COMPLETED' && <Button size="sm" variant="ghost" icon={CheckCheck} onClick={() => setCompleting(l)} aria-label={t('listings.complete')} />}
                <Button size="sm" variant="ghost" icon={Pencil} to={`/farmer/listings/${l.id}/edit`} aria-label={t('common.edit')} />
              </div>
            ),
          },
        ]}
        toolbar={
          <>
            <Tabs
              value={list.filters.status}
              onChange={(status) => list.setFilters({ status })}
              tabs={[
                { value: '', label: t('common.all') },
                { value: 'ACTIVE', label: t('listings.published') },
                { value: 'DRAFT', label: t('listings.drafts') },
                { value: 'PAUSED', label: humanize('PAUSED') },
                { value: 'SOLD_OUT', label: humanize('SOLD_OUT') },
                { value: 'COMPLETED', label: humanize('COMPLETED') },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('listings.searchPlaceholder')} className="sm:w-56" />
          </>
        }
        empty={<EmptyState icon={Package} title={t('listings.emptyTitle')} description={t('listings.emptyBody')} action={<Button to="/farmer/listings/new">{t('dnav.tabs.postNewHarvest')}</Button>} />}
      />
      <ConfirmDialog
        open={!!completing}
        onClose={() => setCompleting(null)}
        title={t('listings.completeTitle', '', { name: completing?.cropName })}
        message={t('listings.completeMessage')}
        confirmLabel={t('listings.completeListing')}
        tone="primary"
        onConfirm={() => setStatus(completing, 'COMPLETED').then(() => setCompleting(null))}
      />
    </>
  );
};

export default ListingsPage;
