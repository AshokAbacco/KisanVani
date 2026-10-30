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
import { useI18n } from '../../i18n';

/** Trip view for buyers, sellers, requesters, assigners and admins (drivers use their own screen). */
const TripDetailPage = ({ base }) => {
  const { t } = useI18n();
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
      toast.success(t('tripDetail.cancelledToast'));
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
        back={{ to: `${base}/transport`, label: t('dnav.items.transport') }}
        title={t('trips.tripTitle', '', { number: trip.tripNumber })}
        description={`${trip.commodity}, ${formatKg(trip.expectedQuantityKg)}`}
        actions={
          <>
            <Button variant="secondary" icon={Phone} href={`tel:${trip.driver.mobile}`}>
              {t('tripDetail.call', '', { name: trip.driver.name.split(' ')[0] })}
            </Button>
            {canPay && (
              <Button icon={Wallet} onClick={() => setPayOpen(true)}>
                {t('tripDetail.payDriver')}
              </Button>
            )}
            {canCancel && (
              <Button variant="secondary" icon={Ban} onClick={() => setCancelOpen(true)}>
                {t('driverTrip.confirm.cancel.label')}
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
          <Section title={t('tripDetail.liveLocation')}>
            <LiveTripPanel trip={trip} />
          </Section>
          <div className="space-y-6">
            <Section title={t('tripDetail.details')}>
              <DetailList
                cols={1}
                items={[
                  [t('roleNames.DRIVER'), `${trip.driver.name} (${trip.driver.mobile})`],
                  [t('dnav.items.vehicle'), `${trip.vehicle.registrationNumber} — ${humanize(trip.vehicle.type)}${trip.vehicle.make ? `, ${trip.vehicle.make} ${trip.vehicle.model || ''}` : ''}`],
                  [t('components.tripMap.pickup'), `${trip.pickupAddress} — ${trip.pickupContactName}, ${trip.pickupContactPhone}`],
                  [
                    t('components.tripMap.destination'),
                    <span key="d">
                      {trip.dropAddress}
                      {trip.dropContactName ? ` — ${trip.dropContactName}` : ''}{' '}
                      <a className="link inline-flex items-center gap-0.5" target="_blank" rel="noreferrer" href={directionsUrl({ fromLat: trip.pickupLat, fromLng: trip.pickupLng, toLat: trip.dropLat, toLng: trip.dropLng, toAddress: trip.dropAddress })}>
                        {t('tripDetail.route')} <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </span>,
                  ],
                  trip.order && [t('enums.ORDER'), <Link key="o" className="link" to={`${base}/orders/${trip.order.id}`}>{trip.order.orderNumber}</Link>],
                  [t('tripDetail.expected'), formatKg(trip.expectedQuantityKg)],
                  [t('driverTrip.loaded'), trip.loadedQuantityKg ? formatKg(trip.loadedQuantityKg) : '—'],
                  [humanize('DELIVERED'), trip.deliveredQuantityKg ? formatKg(trip.deliveredQuantityKg) : '—'],
                  [t('driverTrip.eta'), formatDateTime(trip.estimatedArrivalAt)],
                  [t('assignTrip.charge'), t('tripDetail.chargePaid', '', { charge: formatINR(trip.transportCharge), paid: formatINR(trip.amountPaid) })],
                  trip.assignedBy && [t('tripDetail.assignedBy'), `${trip.assignedBy.name} (${roleLabel(trip.assignedBy.role)})`],
                ]}
              />
            </Section>
            {trip.deliveryProofs.length > 0 && (
              <Section title={t('tripDetail.proof')}>
                <ul className="space-y-3">
                  {trip.deliveryProofs.map((p) => (
                    <li key={p.id} className="flex items-start gap-3">
                      <FileCheck2 className="mt-0.5 h-5 w-5 text-field-600" aria-hidden />
                      <div className="text-sm">
                        <p className="font-semibold">
                          {t('tripDetail.receivedBy', '', { name: p.receiverName, qty: formatKg(p.deliveredQuantityKg) })}
                        </p>
                        <p className="text-soil-500">{formatDateTime(p.createdAt)}</p>
                        {p.notes && <p className="text-soil-600">{p.notes}</p>}
                        {p.fileUrl && (
                          <a className="link" href={p.fileUrl} target="_blank" rel="noreferrer">
                            {t('tripDetail.viewProof')}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            <Section title={t('myTrips.presets.history.title')}>
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
      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} title={t('driverTrip.confirm.cancel.title')} message={t('tripDetail.cancelMessage')} confirmLabel={t('driverTrip.confirm.cancel.label')} requireReason busy={busy} onConfirm={cancel} />
      <RecordPaymentModal open={payOpen} onClose={() => setPayOpen(false)} title={t('tripDetail.payCharge')} due={Number(trip.transportCharge) - Number(trip.amountPaid)} payeeName={trip.driver.name} onSubmit={(body) => paymentsApi.payTrip(trip.id, body).then(reload)} />
    </>
  );
};

export default TripDetailPage;
