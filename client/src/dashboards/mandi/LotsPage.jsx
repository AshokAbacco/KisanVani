import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Play, Pause, Lock, Boxes } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import useList from '../../hooks/useList';
import { mandiApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

const LotsPage = () => {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [closing, setClosing] = useState(null);
  const list = useList((p) => mandiApi.lots(p), { initialFilters: { status: '' } });

  const setStatus = async (lot, status) => {
    try {
      await mandiApi.setStatus(lot.id, status);
      toast.success(t(`lots.toast.${status}`));
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader title={t('dnav.tabs.mandiLots')} description={t('lots.intro')} actions={<Button icon={Plus} to="/mandi/lots/new">{t('lots.createNew')}</Button>} />
      <DataTable
        list={list}
        onRowClick={(l) => navigate(`/mandi/lots/${l.id}/edit`)}
        columns={[
          { key: 'lotCode', header: t('lots.lot'), render: (l) => <span className="num whitespace-nowrap font-semibold">{l.lotCode}</span> },
          {
            key: 'commodity',
            header: t('lots.commodity'),
            render: (l) => (
              <div>
                <p className="font-medium">{`${l.product.emoji || ''} ${l.commodityName}`}</p>
                <p className="text-xs text-soil-500">{[l.variety, l.grade, l.lotType !== 'LOOSE' && `${humanize(l.lotType)}${l.unitSizeKg ? ` ${Number(l.unitSizeKg)} kg` : ''}`].filter(Boolean).join(', ')}</p>
              </div>
            ),
          },
          { key: 'pricePerKg', header: t('common.price'), align: 'right', sortable: true, render: (l) => t('common.perKg', '', { price: formatINR(l.pricePerKg) }) },
          {
            key: 'availableWeightKg',
            header: t('lots.availableTotal'),
            align: 'right',
            sortable: true,
            render: (l) => (
              <span>
                <span className="font-semibold">{formatKg(l.availableWeightKg, { grams: false })}</span>
                <span className="text-soil-400"> / {formatKg(l.totalWeightKg, { grams: false })}</span>
              </span>
            ),
          },
          { key: 'yard', header: t('lots.yard'), render: (l) => <span className="text-soil-600">{[l.marketYardName, l.location].filter(Boolean).join(', ')}</span> },
          { key: 'orders', header: t('dnav.items.orders'), align: 'right', render: (l) => l._count.orderItems },
          { key: 'status', header: t('common.status'), render: (l) => <StatusBadge status={l.status} /> },
          {
            key: 'actions',
            header: '',
            render: (l) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {['DRAFT', 'PAUSED'].includes(l.status) && Number(l.availableWeightKg) > 0 && (
                  <Button size="sm" icon={Play} onClick={() => setStatus(l, 'AVAILABLE')}>
                    {t('listings.publish')}
                  </Button>
                )}
                {['AVAILABLE', 'SOLD_OUT'].includes(l.status) && <Button size="sm" variant="ghost" icon={Pause} onClick={() => setStatus(l, 'PAUSED')} aria-label={t('listings.pause')} />}
                {l.status !== 'CLOSED' && <Button size="sm" variant="ghost" icon={Lock} onClick={() => setClosing(l)} aria-label={t('lots.closeLot')} />}
                <Button size="sm" variant="ghost" icon={Pencil} to={`/mandi/lots/${l.id}/edit`} aria-label={t('common.edit')} />
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
                { value: 'AVAILABLE', label: humanize('AVAILABLE') },
                { value: 'DRAFT', label: t('listings.drafts') },
                { value: 'PAUSED', label: humanize('PAUSED') },
                { value: 'SOLD_OUT', label: humanize('SOLD_OUT') },
                { value: 'CLOSED', label: humanize('CLOSED') },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('lots.searchPlaceholder')} className="sm:w-56" />
          </>
        }
        empty={<EmptyState icon={Boxes} title={t('lots.emptyTitle')} action={<Button to="/mandi/lots/new">{t('lots.createNew')}</Button>} />}
      />
      <ConfirmDialog
        open={!!closing}
        onClose={() => setClosing(null)}
        title={t('lots.closeTitle', '', { code: closing?.lotCode })}
        message={t('lots.closeMessage')}
        confirmLabel={t('lots.closeLot')}
        onConfirm={() => setStatus(closing, 'CLOSED').then(() => setClosing(null))}
      />
    </>
  );
};

export default LotsPage;
