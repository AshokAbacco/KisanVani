import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, Phone, Wallet, FileCheck2, ExternalLink } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section, { DetailList } from '../../components/common/Section';
import Stepper, { Timeline } from '../../components/common/Stepper';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import LiveTripPanel from '../../components/maps/LiveTripPanel';
import RecordPaymentModal from '../payments/RecordPaymentModal';
import useAsync from '../../hooks/useAsync';
import { transportApi, paymentsApi } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, formatDateTime, humanize } from '../../utils/format';
import { TRIP_STEPS } from '../../constants/status';
import { roleLabel } from '../../constants/roles';
import { directionsUrl } from '../../utils/maps';

/** Trip view for buyers, sellers, requesters, assigners and admins (drivers use their own screen). */
const TripDetailPage = ({ base }) => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: trip, loading, error, reload } = useAsync(() => transportApi.trip(id), [id]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading && !trip) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const isManager = user.role === 'ADMIN' || [trip.assignedBy?.id, trip.transportRequest?.requesterId].includes(user.id);
  const canCancel = isManager && ['ASSIGNED', 'ACCEPTED'].includes(trip.status);
  const canPay = [trip.assignedBy?.id, trip.transportRequest?.requesterId].includes(user.id) && trip.status === 'DELIVERED' && Number(trip.transportCharge) - Number(trip.amountPaid) > 0.004;
  const offPath = ['REJECTED', 'FAILED', 'CANCELLED'].includes(trip.status) ? `${humanize(trip.status)}: ${trip.statusReason || ''}` : null;

  const cancel = async (reason) => {
    setBusy(true);
    try {
      await transportApi.transition(trip.id, { status: 'CANCELLED', reason });
      toast.success('Trip cancelled. The driver has been notified.');
      setCancelOpen(false);
      reload();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        back={{ to: `${base}/transport`, label: 'Transport' }}
        title={`Trip ${trip.tripNumber}`}
        description={`${trip.commodity}, ${formatKg(trip.expectedQuantityKg)}`}
        actions={
          <>
            <Button variant="secondary" icon={Phone} href={`tel:${trip.driver.mobile}`}>
              Call {trip.driver.name.split(' ')[0]}
            </Button>
            {canPay && (
              <Button icon={Wallet} onClick={() => setPayOpen(true)}>
                Pay driver
              </Button>
            )}
            {canCancel && (
              <Button variant="secondary" icon={Ban} onClick={() => setCancelOpen(true)}>
                Cancel trip
              </Button>
            )}
          </>
        }
      />
      <div className="space-y-6">
        <Section>
          <Stepper steps={TRIP_STEPS} current={trip.status} offPath={offPath} />
        </Section>
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Section title="Live location">
            <LiveTripPanel trip={trip} />
          </Section>
          <div className="space-y-6">
            <Section title="Trip details">
              <DetailList
                cols={1}
                items={[
                  ['Driver', `${trip.driver.name} (${trip.driver.mobile})`],
                  ['Vehicle', `${trip.vehicle.registrationNumber} — ${humanize(trip.vehicle.type)}${trip.vehicle.make ? `, ${trip.vehicle.make} ${trip.vehicle.model || ''}` : ''}`],
                  ['Pickup', `${trip.pickupAddress} — ${trip.pickupContactName}, ${trip.pickupContactPhone}`],
                  [
                    'Destination',
                    <span key="d">
                      {trip.dropAddress}
                      {trip.dropContactName ? ` — ${trip.dropContactName}` : ''}{' '}
                      <a className="link inline-flex items-center gap-0.5" target="_blank" rel="noreferrer" href={directionsUrl({ fromLat: trip.pickupLat, fromLng: trip.pickupLng, toLat: trip.dropLat, toLng: trip.dropLng, toAddress: trip.dropAddress })}>
                        route <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </span>,
                  ],
                  trip.order && ['Order', <Link key="o" className="link" to={`${base}/orders/${trip.order.id}`}>{trip.order.orderNumber}</Link>],
                  ['Expected', formatKg(trip.expectedQuantityKg)],
                  ['Loaded', trip.loadedQuantityKg ? formatKg(trip.loadedQuantityKg) : '—'],
                  ['Delivered', trip.deliveredQuantityKg ? formatKg(trip.deliveredQuantityKg) : '—'],
                  ['Estimated arrival', formatDateTime(trip.estimatedArrivalAt)],
                  ['Transport charge', `${formatINR(trip.transportCharge)} (paid ${formatINR(trip.amountPaid)})`],
                  trip.assignedBy && ['Assigned by', `${trip.assignedBy.name} (${roleLabel(trip.assignedBy.role)})`],
                ]}
              />
            </Section>
            {trip.deliveryProofs.length > 0 && (
              <Section title="Proof of delivery">
                <ul className="space-y-3">
                  {trip.deliveryProofs.map((p) => (
                    <li key={p.id} className="flex items-start gap-3">
                      <FileCheck2 className="mt-0.5 h-5 w-5 text-field-600" aria-hidden />
                      <div className="text-sm">
                        <p className="font-semibold">
                          Received by {p.receiverName} — {formatKg(p.deliveredQuantityKg)}
                        </p>
                        <p className="text-soil-500">{formatDateTime(p.createdAt)}</p>
                        {p.notes && <p className="text-soil-600">{p.notes}</p>}
                        {p.fileUrl && (
                          <a className="link" href={p.fileUrl} target="_blank" rel="noreferrer">
                            View photo / document
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            <Section title="Trip history">
              <Timeline items={trip.events.map((e) => ({ id: e.id, title: humanize(e.toStatus), meta: `${formatDateTime(e.createdAt)}${e.actor ? ` · ${e.actor.name}` : ''}`, note: e.note }))} />
              {trip.payments.length > 0 && (
                <div className="mt-4 border-t border-soil-200 pt-3">
                  {trip.payments.map((p) => (
                    <p key={p.id} className="flex justify-between text-sm">
                      <span className="text-soil-500">
                        {p.paymentNumber} <StatusBadge status="PAID" className="ml-1" />
                      </span>
                      <span className="num whitespace-nowrap font-semibold">{formatINR(p.amount)}</span>
                    </p>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this trip?" message="The driver is told immediately. If you are not the requester, the load goes back to open so it can be reassigned." confirmLabel="Cancel trip" requireReason busy={busy} onConfirm={cancel} />
      <RecordPaymentModal open={payOpen} onClose={() => setPayOpen(false)} title="Pay transport charge" due={Number(trip.transportCharge) - Number(trip.amountPaid)} payeeName={trip.driver.name} onSubmit={(body) => paymentsApi.payTrip(trip.id, body).then(reload)} />
    </>
  );
};

export default TripDetailPage;
