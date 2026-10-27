import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Clock, IndianRupee, ClipboardList } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/feedback/ErrorState';
import Alert from '../../components/feedback/Alert';
import Pagination from '../../components/tables/Pagination';
import Modal from '../../components/modals/Modal';
import { Input, Select } from '../../components/forms/Field';
import useList from '../../hooks/useList';
import useAsync from '../../hooks/useAsync';
import { transportApi, vehiclesApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, formatDateTime, humanize, plural, timeAgo } from '../../utils/format';

const ClaimModal = ({ request, vehicles, onClose, onClaimed }) => {
  const toast = useToast();
  const usable = vehicles.filter((v) => v.verificationStatus === 'VERIFIED' && v.isActive && Number(v.capacityKg) >= Number(request.expectedQuantityKg));
  const [vehicleId, setVehicleId] = useState(usable[0]?.id || '');
  const [charge, setCharge] = useState(request.offeredCharge ? String(Number(request.offeredCharge)) : '');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const trip = await transportApi.claim(request.id, { vehicleId, transportCharge: charge || undefined });
      toast.success(`Load taken. Trip ${trip.tripNumber} is yours.`);
      onClaimed(trip);
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
      title={`Take load ${request.requestNumber}`}
      description={`${request.commodity}, ${formatKg(request.expectedQuantityKg)}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy} disabled={!vehicleId || !/^\d+(\.\d{1,2})?$/.test(charge)}>
            Take this load
          </Button>
        </>
      }
    >
      {usable.length === 0 ? (
        <Alert tone="warning">None of your verified vehicles can carry {formatKg(request.expectedQuantityKg)}.</Alert>
      ) : (
        <div className="space-y-4">
          <Select label="Vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} options={usable.map((v) => ({ value: v.id, label: `${v.registrationNumber} — ${humanize(v.type)}, ${formatKg(v.capacityKg)}` }))} />
          <Input label="Your charge" suffix="₹" inputMode="decimal" value={charge} onChange={(e) => setCharge(e.target.value)} hint={request.offeredCharge ? `The requester offered ${formatINR(request.offeredCharge)}` : 'No rate offered — enter your price'} />
        </div>
      )}
    </Modal>
  );
};

/** Trips waiting for the driver's answer, plus the open-load marketplace. */
const AssignmentsPage = () => {
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(null);
  const pending = useList((p) => transportApi.trips(p), { initialFilters: { status: 'ASSIGNED' } });
  const open = useList((p) => transportApi.requests(p), { pageSize: 10 });
  const vehicles = useAsync(() => vehiclesApi.list({ limit: 50 }).then((r) => r.data), []);
  const hasVerified = vehicles.data?.some((v) => v.verificationStatus === 'VERIFIED');

  return (
    <>
      <PageHeader title="Transport assignments" description="Accept trips assigned to you, or take an open load that suits your route." />
      <div className="space-y-6">
        <Section title="Waiting for your answer" bodyClass="p-0">
          {pending.items.length ? (
            <ul className="divide-y divide-soil-100">
              {pending.items.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold">
                      {t.tripNumber} — {t.commodity}
                    </p>
                    <p className="text-sm text-soil-500">
                      {t.pickupAddress} to {t.dropAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num whitespace-nowrap font-semibold">{formatINR(t.transportCharge)}</span>
                    <Button size="sm" to={`/driver/trips/${t.id}`}>
                      Review
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-soil-500">{pending.loading ? 'Loading…' : 'Nothing waiting. Assigned trips appear here.'}</p>
          )}
        </Section>

        <Section title="Open loads" description={open.meta ? `${plural(open.meta.total, 'load')} looking for a vehicle` : 'Loading…'}>
          {vehicles.data && !hasVerified && (
            <Alert tone="info" className="mb-4">
              You can take loads once a vehicle is verified. <Link to="/driver/vehicles" className="underline">Check your vehicles</Link>
            </Alert>
          )}
          {open.error ? (
            <ErrorState error={open.error} onRetry={open.reload} />
          ) : !open.loading && !open.items.length ? (
            <EmptyState icon={ClipboardList} compact title="No open loads right now" description="You will get a notification when a new load is posted." />
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {open.items.map((r) => (
                <li key={r.id} className="rounded-xl border border-soil-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-semibold">{r.commodity}</p>
                      <p className="num text-sm text-soil-500">
                        {formatKg(r.expectedQuantityKg)} · {r.requestNumber} · posted {timeAgo(r.createdAt)}
                      </p>
                    </div>
                    {r.preferredVehicleType && <StatusBadge tone="blue">{humanize(r.preferredVehicleType)}</StatusBadge>}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    <li className="flex gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-field-600" aria-hidden /> <span><span className="text-soil-500">From</span> {r.pickupAddress}</span>
                    </li>
                    <li className="flex gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-chilli-500" aria-hidden /> <span><span className="text-soil-500">To</span> {r.dropAddress}</span>
                    </li>
                    {r.preferredPickupAt && (
                      <li className="flex gap-2">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-soil-400" aria-hidden /> Pickup {formatDateTime(r.preferredPickupAt)}
                      </li>
                    )}
                  </ul>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="num inline-flex items-center gap-1 font-display text-xl font-semibold">
                      <IndianRupee className="h-4 w-4" aria-hidden />
                      {r.offeredCharge ? Number(r.offeredCharge).toLocaleString('en-IN') : 'Quote'}
                    </span>
                    <Button onClick={() => setClaiming(r)} disabled={!hasVerified}>
                      Take load
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination meta={open.meta} page={open.page} onPage={open.setPage} />
        </Section>
      </div>
      {claiming && (
        <ClaimModal
          request={claiming}
          vehicles={vehicles.data || []}
          onClose={() => setClaiming(null)}
          onClaimed={(trip) => {
            setClaiming(null);
            navigate(`/driver/trips/${trip.id}`);
          }}
        />
      )}
    </>
  );
};

export default AssignmentsPage;
