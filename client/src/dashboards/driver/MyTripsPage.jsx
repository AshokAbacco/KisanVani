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
import { formatINR, formatKg, formatDateTime, humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

/* Title and description come from myTrips.presets.<preset> in the locale files. */
const PRESETS = {
  all: { status: '' },
  pickups: { status: 'ASSIGNED,ACCEPTED' },
  deliveries: { status: 'PICKED_UP,IN_TRANSIT' },
  history: { status: 'DELIVERED,REJECTED,FAILED,CANCELLED' },
};

const MyTripsPage = ({ preset = 'all' }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const p = PRESETS[preset];
  const list = useList((q) => transportApi.trips(q), { initialFilters: { status: p.status } });

  return (
    <>
      <PageHeader title={t(`myTrips.presets.${preset}.title`)} description={t(`myTrips.presets.${preset}.description`)} />
      <DataTable
        list={list}
        onRowClick={(trip) => navigate(`/driver/trips/${trip.id}`)}
        columns={[
          { key: 'tripNumber', header: t('trips.trip'), render: (trip) => <span className="num whitespace-nowrap font-semibold">{trip.tripNumber}</span> },
          { key: 'commodity', header: t('trips.load'), render: (trip) => `${trip.commodity} (${formatKg(trip.expectedQuantityKg)})` },
          { key: 'route', header: t('trips.route'), render: (trip) => <span className="text-soil-600">{t('common.fromTo', '', { from: trip.pickupAddress, to: trip.dropAddress })}</span> },
          { key: 'vehicle', header: t('dnav.items.vehicle'), render: (trip) => <span className="num">{trip.vehicle.registrationNumber}</span> },
          { key: 'transportCharge', header: t('trips.charge'), align: 'right', render: (trip) => formatINR(trip.transportCharge) },
          { key: 'status', header: t('common.status'), sortable: true, render: (trip) => <StatusBadge status={trip.status} /> },
          { key: 'createdAt', header: t('trips.created'), sortable: true, render: (trip) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(trip.createdAt)}</span> },
        ]}
        toolbar={
          <>
            {preset === 'all' ? (
              <Tabs
                value={list.filters.status}
                onChange={(status) => list.setFilters({ status })}
                tabs={[
                  { value: '', label: t('common.all') },
                  { value: PRESETS.pickups.status, label: t('myTrips.toPickUp') },
                  { value: PRESETS.deliveries.status, label: t('myTrips.onTheRoad') },
                  { value: 'DELIVERED', label: humanize('DELIVERED') },
                ]}
              />
            ) : (
              <span />
            )}
            <SearchInput value={list.search} onChange={list.setSearch} placeholder={t('myTrips.searchPlaceholder')} className="sm:w-60" />
          </>
        }
        empty={<EmptyState icon={Route} title={t('myTrips.emptyTitle')} description={t('myTrips.emptyBody')} action={<Button to="/driver/assignments">{t('driverDash.seeOpenLoads')}</Button>} />}
      />
    </>
  );
};

export default MyTripsPage;
