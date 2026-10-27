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
import { formatINR, formatKg, formatDateTime } from '../../utils/format';

/**
 * Transport requests and trips for farmers, shops, mandi owners and admins.
 * `canAssign` (admin, mandi owner) adds driver assignment for open requests.
 */
const TransportPage = ({ base, title = 'Transport', description = 'Loads you have requested and the trips carrying your orders.', canAssign = false, defaultTab = 'trips', showMap = true }) => {
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
      toast.success('Transport request cancelled');
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
      header: 'Request',
      render: (r) => (
        <div>
          <p className="num whitespace-nowrap font-semibold">{r.requestNumber}</p>
          <p className="text-xs text-soil-500">{r.order ? `Order ${r.order.orderNumber}` : 'Standalone load'}</p>
        </div>
      ),
    },
    { key: 'commodity', header: 'Load', render: (r) => `${r.commodity} (${formatKg(r.expectedQuantityKg)})` },
    {
      key: 'route',
      header: 'Route',
      render: (r) => (
        <span className="text-soil-600">
          {r.pickupAddress} <span className="text-soil-400">to</span> {r.dropAddress}
        </span>
      ),
    },
    { key: 'offeredCharge', header: 'Offer', align: 'right', render: (r) => (r.offeredCharge ? formatINR(r.offeredCharge) : '—') },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {canAssign && r.status === 'OPEN' && (
            <Button size="sm" icon={UserCheck} onClick={() => setAssignFor(r)}>
              Assign
            </Button>
          )}
          {(r.requester.id === user.id || user.role === 'ADMIN') && ['OPEN', 'ASSIGNED'].includes(r.status) && (
            <Button size="sm" variant="ghost" icon={Ban} onClick={() => setCancelFor(r)}>
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  const tripColumns = [
    { key: 'tripNumber', header: 'Trip', render: (t) => <span className="num whitespace-nowrap font-semibold">{t.tripNumber}</span> },
    { key: 'commodity', header: 'Load', render: (t) => `${t.commodity} (${formatKg(t.expectedQuantityKg)})` },
    {
      key: 'driver',
      header: 'Driver & vehicle',
      render: (t) => (
        <div>
          <p>{t.driver.name}</p>
          <p className="text-xs text-soil-500">{t.vehicle.registrationNumber}</p>
        </div>
      ),
    },
    { key: 'transportCharge', header: 'Charge', align: 'right', render: (t) => formatINR(t.transportCharge) },
    { key: 'status', header: 'Status', sortable: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: 'createdAt', header: 'Created', sortable: true, render: (t) => <span className="whitespace-nowrap text-soil-500">{formatDateTime(t.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button icon={Plus} onClick={() => setCreating(true)}>
            Request transport
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
          { value: 'trips', label: 'Trips', count: trips.meta?.total },
          { value: 'requests', label: 'Requests', count: requests.meta?.total },
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
                  { value: '', label: 'All' },
                  { value: 'OPEN', label: 'Waiting for driver' },
                  { value: 'ASSIGNED', label: 'Assigned' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
              <SearchInput value={requests.search} onChange={requests.setSearch} placeholder="Request no., load or place" className="sm:w-64" />
            </>
          }
          empty={<EmptyState icon={Truck} title="No transport requests" description="Request a vehicle for an order or any load you need moved." />}
        />
      ) : (
        <DataTable
          list={trips}
          columns={tripColumns}
          onRowClick={(t) => navigate(`${base}/transport/trips/${t.id}`)}
          toolbar={
            <>
              <Tabs
                value={trips.filters.status}
                onChange={(status) => trips.setFilters({ status })}
                tabs={[
                  { value: '', label: 'All' },
                  { value: 'ASSIGNED,ACCEPTED,PICKED_UP,IN_TRANSIT', label: 'Active' },
                  { value: 'DELIVERED', label: 'Delivered' },
                  { value: 'REJECTED,FAILED,CANCELLED', label: 'Not completed' },
                ]}
              />
              <SearchInput value={trips.search} onChange={trips.setSearch} placeholder="Trip, driver or vehicle" className="sm:w-64" />
            </>
          }
          empty={<EmptyState icon={Truck} title="No trips yet" description="Trips appear once a driver is assigned to one of your loads." />}
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
        title={`Cancel ${cancelFor?.requestNumber}`}
        message="If a driver has accepted but not yet picked up, their trip is cancelled too and they are notified."
        confirmLabel="Cancel request"
        requireReason
        busy={busy}
        onConfirm={cancel}
      />
    </>
  );
};

export default TransportPage;
