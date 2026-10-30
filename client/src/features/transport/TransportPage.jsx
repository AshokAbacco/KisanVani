import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Truck, UserCheck, Ban } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/tables/DataTable';
import Tabs from '../../components/common/Tabs';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import RequestTransportModal from './RequestTransportModal';
import AssignTripModal from './AssignTripModal';
import ActiveTripsMap from '../tracking/ActiveTripsMap';
import useList from '../../hooks/useList';
import { transportApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, formatDateTime, humanize } from '../../utils/format';
import { useI18n } from '../../i18n';

/**
 * Transport requests and trips for farmers, shops, mandi owners and admins.
 * `canAssign` (admin, mandi owner) adds driver assignment for open requests.
 * `copy` is the locale key holding this screen's title/description (routes.<screen>).
 */
const TransportPage = ({ base, copy = 'transport', canAssign = false, defaultTab = 'trips', showMap = true }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState(defaultTab);
  const [creating, setCreating] = useState(false);
  const [assignFor, setAssignFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const requests = useList((p) => transportApi.requests(p), { initialFilters: { status: '' } });
  const trips = useList((p) => transportApi.trips(p), { initialFilters: { status: '' } });

  const cancel = async (reason) => {
    setBusy(true);
    try {
      await transportApi.cancelRequest(cancelFor.id, reason);
      toast.success(t('transport.cancelledToast'));
      setCancelFor(null);
      requests.reload();
      trips.reload();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const requestColumns = [
    {
      key: 'requestNumber',
      header: t('transport.request'),
      render: (r) => (
        <div>
          <p className="num whitespace-nowrap font-semibold">{r.requestNumber}</p>
          <p className="text-xs text-soil-500">{r.order ? t('orderDetail.title', '', { number: r.order.orderNumber }) : t('transport.standalone')}</p>
        </div>
      ),
    },
    { key: 'commodity', header: t('trips.load'), render: (r) => `${r.commodity} (${formatKg(r.expectedQuantityKg)})` },
    {
      key: 'route',
      header: t('trips.route'),
      render: (r) => (
        <span className="text-soil-600">
          {r.pickupAddress} <span className="text-soil-400">{t('components.dateRange.to')}</span> {r.dropAddress}
        </span>
      ),
    },
    { key: 'offeredCharge', header: t('transport.offer'), align: 'right', render: (r) => (r.offeredCharge ? formatINR(r.offeredCharge) : '—') },
    { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canAssign && r.status === 'OPEN' && (
            <Button size="sm" icon={UserCheck} onClick={() => setAssignFor(r)}>
              {t('transport.assign')}
            </Button>
          )}
          {(r.requester.id === user.id || user.role === 'ADMIN') && ['OPEN', 'ASSIGNED'].includes(r.status) && (
            <Button size="sm" variant="ghost" icon={Ban} onClick={() => setCancelFor(r)}>
              {t('common.cancel')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const tripColumns = [
    { key: 'tripNumber', header: t('trips.trip'), render: (trip) => <span className="num whitespace-nowrap font-semibold">{trip.tripNumber}</span> },
    { key: 'commodity', header: t('trips.load'), render: (trip) => `${trip.commodity} (${formatKg(trip.expectedQuantityKg)})` },
    {
      key: 'driver',
      header: t('transport.driverVehicle'),
      render: (trip) => (
        <div>
          <p>{trip.driver.name}</p>
          <p className="text-xs text-soil-500">{trip.vehicle.registrationNumber}</p>
        </div>
      ),
    },
    { key: 'transportCharge', header: t('trips.charge'), align: 'right', render: (trip) => formatINR(trip.transportCharge) },
    { key: 'status', header: t('common.status'), sortable: true, render: (trip) => <StatusBadge status={trip.status} /> },
    { key: 'createdAt', header: t('trips.created'), sortable: true, render: (trip) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(trip.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title={t(`${copy}.title`)}
        description={t(`${copy}.description`)}
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)}>
            {t('orderDetail.requestTransport')}
          </Button>
        }
      />
      {showMap && (
        <div className="mb-6">
          <ActiveTripsMap base={base} height={300} />
        </div>
      )}
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'trips', label: t('dnav.tabs.trips'), count: trips.meta?.total },
          { value: 'requests', label: t('transport.requests'), count: requests.meta?.total },
        ]}
      />
      {tab === 'requests' ? (
        <DataTable
          list={requests}
          columns={requestColumns}
          toolbar={
            <>
              <Tabs
                value={requests.filters.status}
                onChange={(status) => requests.setFilters({ status })}
                tabs={[
                  { value: '', label: t('common.all') },
                  { value: 'OPEN', label: t('transport.waitingDriver') },
                  { value: 'ASSIGNED', label: humanize('ASSIGNED') },
                  { value: 'COMPLETED', label: humanize('COMPLETED') },
                  { value: 'CANCELLED', label: humanize('CANCELLED') },
                ]}
              />
              <SearchInput value={requests.search} onChange={requests.setSearch} placeholder={t('transport.searchRequests')} className="sm:w-64" />
            </>
          }
          empty={<EmptyState icon={Truck} title={t('transport.noRequests')} description={t('transport.noRequestsBody')} />}
        />
      ) : (
        <DataTable
          list={trips}
          columns={tripColumns}
          onRowClick={(trip) => navigate(`${base}/transport/trips/${trip.id}`)}
          toolbar={
            <>
              <Tabs
                value={trips.filters.status}
                onChange={(status) => trips.setFilters({ status })}
                tabs={[
                  { value: '', label: t('common.all') },
                  { value: 'ASSIGNED,ACCEPTED,PICKED_UP,IN_TRANSIT', label: humanize('ACTIVE') },
                  { value: 'DELIVERED', label: humanize('DELIVERED') },
                  { value: 'REJECTED,FAILED,CANCELLED', label: t('transport.notCompleted') },
                ]}
              />
              <SearchInput value={trips.search} onChange={trips.setSearch} placeholder={t('transport.searchTrips')} className="sm:w-64" />
            </>
          }
          empty={<EmptyState icon={Truck} title={t('transport.noTrips')} description={t('transport.noTripsBody')} />}
        />
      )}

      <RequestTransportModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setTab('requests');
          requests.reload();
        }}
      />
      <AssignTripModal
        open={!!assignFor}
        request={assignFor}
        onClose={() => setAssignFor(null)}
        onAssigned={() => {
          requests.reload();
          trips.reload();
        }}
      />
      <ConfirmDialog
        open={!!cancelFor}
        onClose={() => setCancelFor(null)}
        title={t('transport.cancelTitle', '', { number: cancelFor?.requestNumber })}
        message={t('transport.cancelMessage')}
        confirmLabel={t('transport.cancelRequest')}
        requireReason
        busy={busy}
        onConfirm={cancel}
      />
    </>
  );
};

export default TransportPage;
