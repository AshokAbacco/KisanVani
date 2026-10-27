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
import { formatINR, formatKg, formatDate } from '../../utils/format';

/** The farmer's harvest listings with publish / pause / complete controls. */
const ListingsPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(null);
  const list = useList((p) => farmerApi.listings(p), { initialFilters: { status: '' } });

  const setStatus = async (l, status) => {
    try {
      await farmerApi.setStatus(l.id, status);
      toast.success({ ACTIVE: 'Listing published — buyers can see it now', PAUSED: 'Listing paused', COMPLETED: 'Listing completed' }[status]);
      list.reload();
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Harvest listings"
        description="Only published listings with quantity left are shown to shops and Market Mandis."
        actions={
          <Button icon={Plus} to="/farmer/listings/new">
            Post new harvest
          </Button>
        }
      />
      <DataTable
        list={list}
        onRowClick={(l) => navigate(`/farmer/listings/${l.id}/edit`)}
        columns={[
          {
            key: 'crop',
            header: 'Crop',
            render: (l) => (
              <div className="flex items-center gap-3">
                {l.images[0] ? <img src={l.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-field-50 text-xl">{l.product.emoji}</span>}
                <div>
                  <p className="font-medium">{l.cropName}</p>
                  <p className="text-xs text-soil-500">{[l.variety, l.grade && `Grade ${l.grade}`].filter(Boolean).join(', ') || '—'}</p>
                </div>
              </div>
            ),
          },
          { key: 'harvestAt', header: 'Harvest', sortable: true, render: (l) => formatDate(l.harvestAt) },
          { key: 'pricePerKg', header: 'Price', align: 'right', sortable: true, render: (l) => `${formatINR(l.pricePerKg)}/kg` },
          {
            key: 'availableQuantityKg',
            header: 'Left / total',
            align: 'right',
            sortable: true,
            render: (l) => (
              <span>
                <span className="font-semibold">{formatKg(l.availableQuantityKg, { grams: false })}</span>
                <span className="text-soil-400"> / {formatKg(l.totalQuantityKg, { grams: false })}</span>
              </span>
            ),
          },
          { key: 'orders', header: 'Orders', align: 'right', render: (l) => l._count.orderItems },
          { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
          {
            key: 'actions',
            header: '',
            render: (l) => (
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {['DRAFT', 'PAUSED'].includes(l.status) && Number(l.availableQuantityKg) > 0 && (
                  <Button size="sm" icon={Play} onClick={() => setStatus(l, 'ACTIVE')}>
                    Publish
                  </Button>
                )}
                {['ACTIVE', 'SOLD_OUT'].includes(l.status) && (
                  <Button size="sm" variant="ghost" icon={Pause} onClick={() => setStatus(l, 'PAUSED')}>
                    Pause
                  </Button>
                )}
                {l.status !== 'COMPLETED' && <Button size="sm" variant="ghost" icon={CheckCheck} onClick={() => setCompleting(l)} aria-label="Complete" />}
                <Button size="sm" variant="ghost" icon={Pencil} to={`/farmer/listings/${l.id}/edit`} aria-label="Edit" />
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
                { value: '', label: 'All' },
                { value: 'ACTIVE', label: 'Published' },
                { value: 'DRAFT', label: 'Drafts' },
                { value: 'PAUSED', label: 'Paused' },
                { value: 'SOLD_OUT', label: 'Sold out' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
            />
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Crop or variety" className="sm:w-56" />
          </>
        }
        empty={<EmptyState icon={Package} title="No listings here" description="Post a harvest with its quantity and price per kg." action={<Button to="/farmer/listings/new">Post new harvest</Button>} />}
      />
      <ConfirmDialog
        open={!!completing}
        onClose={() => setCompleting(null)}
        title={`Complete ${completing?.cropName}?`}
        message="A completed listing is closed for good and cannot be edited. Open orders must be finished or rejected first."
        confirmLabel="Complete listing"
        tone="primary"
        onConfirm={() => setStatus(completing, 'COMPLETED').then(() => setCompleting(null))}
      />
    </>
  );
};

export default ListingsPage;
