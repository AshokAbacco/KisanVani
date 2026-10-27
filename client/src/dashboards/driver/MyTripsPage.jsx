import { useNavigate } from 'react-router-dom';
import { Route } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import useList from '../../hooks/useList';
import { transportApi } from '../../services';
import { formatINR, formatKg, formatDateTime } from '../../utils/format';

const PRESETS = {
  all: { title: 'My trips', description: 'Every trip assigned to you.', status: '' },
  pickups: { title: 'Pickup confirmation', description: 'Trips you have accepted and still need to load. Open one to confirm the loaded weight.', status: 'ASSIGNED,ACCEPTED' },
  deliveries: { title: 'Delivery confirmation', description: 'Loads on board. Open a trip to record the delivered weight and proof.', status: 'PICKED_UP,IN_TRANSIT' },
  history: { title: 'Trip history', description: 'Finished trips, including rejected, failed and cancelled ones.', status: 'DELIVERED,REJECTED,FAILED,CANCELLED' },
};

const MyTripsPage = ({ preset = 'all' }) => {
  const navigate = useNavigate();
  const p = PRESETS[preset];
  const list = useList((q) => transportApi.trips(q), { initialFilters: { status: p.status } });

  return (
    <>
      <PageHeader title={p.title} description={p.description} />
      <DataTable
        list={list}
        onRowClick={(t) => navigate(`/driver/trips/${t.id}`)}
        columns={[
          { key: 'tripNumber', header: 'Trip', render: (t) => <span className="num whitespace-nowrap font-semibold">{t.tripNumber}</span> },
          { key: 'commodity', header: 'Load', render: (t) => `${t.commodity} (${formatKg(t.expectedQuantityKg)})` },
          { key: 'route', header: 'Route', render: (t) => <span className="text-soil-600">{t.pickupAddress} to {t.dropAddress}</span> },
          { key: 'vehicle', header: 'Vehicle', render: (t) => <span className="num">{t.vehicle.registrationNumber}</span> },
          { key: 'transportCharge', header: 'Charge', align: 'right', render: (t) => formatINR(t.transportCharge) },
          { key: 'status', header: 'Status', sortable: true, render: (t) => <StatusBadge status={t.status} /> },
          { key: 'createdAt', header: 'Created', sortable: true, render: (t) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(t.createdAt)}</span> },
        ]}
        toolbar={
          <>
            {preset === 'all' ? (
              <Tabs
                value={list.filters.status}
                onChange={(status) => list.setFilters({ status })}
                tabs={[
                  { value: '', label: 'All' },
                  { value: PRESETS.pickups.status, label: 'To pick up' },
                  { value: PRESETS.deliveries.status, label: 'On the road' },
                  { value: 'DELIVERED', label: 'Delivered' },
                ]}
              />
            ) : (
              <span />
            )}
            <SearchInput value={list.search} onChange={list.setSearch} placeholder="Trip, load or vehicle" className="sm:w-60" />
          </>
        }
        empty={<EmptyState icon={Route} title="No trips here" description="Take an open load or wait for an assignment." action={<Button to="/driver/assignments">See open loads</Button>} />}
      />
    </>
  );
};

export default MyTripsPage;
