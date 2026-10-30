import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, PackageOpen, Truck, PackageCheck, AlertTriangle, Ban, Navigation, Phone, Radio, Square, ExternalLink } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Section, { DetailList } from '../../components/common/Section';
import Stepper, { Timeline } from '../../components/common/Stepper';
import Button from '../../components/common/Button';
import { PageLoader } from '../../components/common/Spinner';
import ErrorState from '../../components/feedback/ErrorState';
import Alert from '../../components/feedback/Alert';
import Modal from '../../components/modals/Modal';
import ConfirmDialog from '../../components/modals/ConfirmDialog';
import { Input, Textarea } from '../../components/forms/Field';
import FileUpload from '../../components/forms/FileUpload';
import TripMap from '../../components/maps/TripMap';
import useAsync from '../../hooks/useAsync';
import useTripTracking from '../../hooks/useTripTracking';
import useLocationSharing from '../../hooks/useLocationSharing';
import { transportApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatKg, formatDateTime, formatTime, humanize, timeAgo } from '../../utils/format';
import { TRIP_STEPS, TRIP_TRACKABLE } from '../../constants/status';
import { directionsUrl } from '../../utils/maps';
import { useI18n } from '../../i18n';

const QtyModal = ({ open, onClose, title, label, max, defaultValue, confirmLabel, onConfirm, withEta }) => {
  const { t } = useI18n();
  const [qty, setQty] = useState(defaultValue);
  const [eta, setEta] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /^\d+(\.\d{1,3})?$/.test(qty) && Number(qty) > 0 && (!max || Number(qty) <= Number(max));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!valid}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(qty, eta);
                onClose();
              } catch {
                /* toast shown by caller */
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={label} suffix="kg" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} hint={max ? t('driverTrip.upTo', '', { qty: formatKg(max, { grams: false }) }) : undefined} />
        {withEta && <Input label={t('driverTrip.eta')} type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} hint={t('driverTrip.sharedWithBuyer')} />}
      </div>
    </Modal>
  );
};

const DeliveryModal = ({ open, onClose, trip, onDone }) => {
  const { t } = useI18n();
  const toast = useToast();
  const [qty, setQty] = useState(trip.loadedQuantityKg ? String(Number(trip.loadedQuantityKg)) : '');
  const [receiverName, setReceiverName] = useState(trip.dropContactName || '');
  const [receiverMobile, setReceiverMobile] = useState(trip.dropContactPhone || '');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const max = trip.loadedQuantityKg;
  const valid = /^\d+(\.\d{1,3})?$/.test(qty) && (!max || Number(qty) <= Number(max)) && receiverName.trim().length >= 2 && (!receiverMobile || /^[6-9]\d{9}$/.test(receiverMobile.replace(/\D/g, '').slice(-10)));

  const submit = async () => {
    setBusy(true);
    try {
      await transportApi.proof(trip.id, { deliveredQuantityKg: qty, receiverName, receiverMobile: receiverMobile || '', notes }, file);
      toast.success(t('driverTrip.deliveredToast'));
      onDone();
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('driverTrip.confirmDelivery')}
      description={t('driverTrip.deliveryIntro')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!valid} loading={busy}>
            {t('driverTrip.confirmDelivery')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('driverTrip.deliveredQty')} suffix="kg" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} hint={max ? t('driverTrip.loadedQty', '', { qty: formatKg(max, { grams: false }) }) : undefined} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('driverTrip.receivedBy')} value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
          <Input label={t('driverTrip.receiverMobile')} inputMode="tel" value={receiverMobile} onChange={(e) => setReceiverMobile(e.target.value)} />
        </div>
        <Textarea label={t('common.notes')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('driverTrip.notesPlaceholder')} />
        <div>
          <p className="field-label">{t('driverTrip.proof')}</p>
          {file ? (
            <p className="flex items-center justify-between rounded-lg bg-leafwhite px-3 py-2 text-sm">
              {file.name}
              <button className="link" onClick={() => setFile(null)}>
                {t('common.remove')}
              </button>
            </p>
          ) : (
            <FileUpload accept="image/jpeg,image/png,image/webp,application/pdf" onFiles={(f) => setFile(f[0])} label={t('driverTrip.takePhoto')} />
          )}
        </div>
      </div>
    </Modal>
  );
};

/** The driver's working screen for one trip: status actions, GPS sharing, navigation and proof of delivery. */
/* Consequential actions confirmed with a reason; texts come from driverTrip.confirm.<key>. */
const CONFIRMS = {
  reject: 'REJECTED',
  cancel: 'CANCELLED',
  fail: 'FAILED',
};

const DriverTripPage = () => {
  const { t } = useI18n();
  const { id } = useParams();
  const toast = useToast();
  const { data: trip, loading, error, reload } = useAsync(() => transportApi.trip(id), [id]);
  const trackable = trip ? TRIP_TRACKABLE.includes(trip.status) : false;
  const tracking = useTripTracking(trip?.id, { enabled: !!trip });
  const sharing = useLocationSharing(trip?.id, trackable);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading && !trip) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const move = async (status, extra = {}) => {
    setBusy(true);
    try {
      await transportApi.transition(trip.id, { status, ...extra });
      toast.success(t('driverTrip.movedToast', '', { status: humanize(status) }));
      await reload();
    } catch (e) {
      toast.error(e);
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const toPickup = ['ASSIGNED', 'ACCEPTED'].includes(trip.status);
  const nav = toPickup
    ? directionsUrl({ toLat: trip.pickupLat, toLng: trip.pickupLng, toAddress: trip.pickupAddress })
    : directionsUrl({ fromLat: trip.pickupLat, fromLng: trip.pickupLng, toLat: trip.dropLat, toLng: trip.dropLng, toAddress: trip.dropAddress });
  const snap = tracking.snapshot || trip;
  const current = sharing.lastFix
    ? { lat: sharing.lastFix.coords.latitude, lng: sharing.lastFix.coords.longitude, at: sharing.lastFix.timestamp }
    : snap.lastLat != null
      ? { lat: snap.lastLat, lng: snap.lastLng, at: snap.lastLocationAt }
      : null;
  const offPath = ['REJECTED', 'FAILED', 'CANCELLED'].includes(trip.status) ? `${humanize(trip.status)}: ${trip.statusReason || ''}` : null;

  return (
    <>
      <PageHeader
        back={{ to: '/driver/trips', label: t('myTrips.presets.all.title') }}
        title={t('trips.tripTitle', '', { number: trip.tripNumber })}
        description={t('driverTrip.summary', '', { load: trip.commodity, qty: formatKg(trip.expectedQuantityKg), charge: formatINR(trip.transportCharge) })}
      />
      <div className="space-y-6">
        <Section>
          <Stepper steps={TRIP_STEPS} current={trip.status} offPath={offPath} />
        </Section>

        {/* Primary actions — big buttons for use in the cab */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trip.status === 'ASSIGNED' && (
            <>
              <Button size="lg" icon={CheckCircle2} onClick={() => move('ACCEPTED').catch(() => {})} loading={busy}>
                {t('driverTrip.accept')}
              </Button>
              <Button size="lg" variant="secondary" icon={XCircle} onClick={() => setConfirm('reject')}>
                {t('driverTrip.reject')}
              </Button>
            </>
          )}
          {trip.status === 'ACCEPTED' && (
            <>
              <Button size="lg" icon={PackageOpen} onClick={() => setModal('pickup')}>
                {t('driverTrip.confirmPickup')}
              </Button>
              <Button size="lg" variant="secondary" icon={Ban} onClick={() => setConfirm('cancel')}>
                {t('driverTrip.cantDo')}
              </Button>
            </>
          )}
          {trip.status === 'PICKED_UP' && (
            <Button size="lg" icon={Truck} onClick={() => setModal('start')}>
              {t('driverTrip.startTrip')}
            </Button>
          )}
          {trip.status === 'IN_TRANSIT' && (
            <Button size="lg" icon={PackageCheck} onClick={() => setModal('deliver')}>
              {t('driverTrip.confirmDelivery')}
            </Button>
          )}
          {['PICKED_UP', 'IN_TRANSIT'].includes(trip.status) && (
            <Button size="lg" variant="secondary" icon={AlertTriangle} onClick={() => setConfirm('fail')}>
              {t('driverTrip.reportProblem')}
            </Button>
          )}
          {!offPath && trip.status !== 'DELIVERED' && (
            <Button size="lg" variant="secondary" icon={Navigation} href={nav}>
              {t(toPickup ? 'driverTrip.navPickup' : 'driverTrip.navDrop')}
            </Button>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Section
            title={t('driverTrip.location')}
            actions={
              trackable &&
              (sharing.sharing ? (
                <Button size="sm" variant="secondary" icon={Square} onClick={sharing.stop}>
                  {t('driverTrip.stopSharing')}
                </Button>
              ) : (
                <Button size="sm" icon={Radio} onClick={sharing.start}>
                  {t('driverTrip.shareLocation')}
                </Button>
              ))
            }
          >
            {trackable ? (
              sharing.sharing ? (
                <Alert tone="success" className="mb-3">
                  {t('driverTrip.sharingEvery', '', { n: sharing.intervalSec })}{' '}
                  {sharing.lastSent ? t('driverTrip.lastSentAt', '', { time: formatTime(sharing.lastSent) }) : t('driverTrip.waitingGps')} {t('driverTrip.keepOpen')}
                </Alert>
              ) : (
                <Alert tone="info" className="mb-3">
                  {t('driverTrip.sharingInfo')}
                </Alert>
              )
            ) : (
              <p className="mb-3 text-sm text-soil-500">{t(trip.status === 'ASSIGNED' ? 'driverTrip.acceptToShare' : 'driverTrip.sharingEnded')}</p>
            )}
            {sharing.error && (
              <Alert tone="warning" className="mb-3">
                {sharing.error}
              </Alert>
            )}
            <TripMap
              height={360}
              follow={sharing.sharing}
              pickup={{ lat: trip.pickupLat, lng: trip.pickupLng, label: trip.pickupAddress }}
              drop={{ lat: trip.dropLat, lng: trip.dropLng, label: trip.dropAddress }}
              path={tracking.points}
              current={current}
              isStale={!sharing.sharing && tracking.isStale}
            />
            {current && <p className="mt-2 text-xs text-soil-500">{t('driverTrip.lastPosition', '', { ago: timeAgo(current.at) })}</p>}
          </Section>

          <div className="space-y-6">
            <Section title={t('components.tripMap.pickup')}>
              <DetailList
                cols={1}
                items={[
                  [t('common.address'), trip.pickupAddress],
                  [t('common.contact'), <a key="p" className="link inline-flex items-center gap-1" href={`tel:${trip.pickupContactPhone}`}><Phone className="h-3.5 w-3.5" aria-hidden />{trip.pickupContactName}, {trip.pickupContactPhone}</a>],
                  [t('driverTrip.expectedLoad'), formatKg(trip.expectedQuantityKg)],
                  [t('driverTrip.loaded'), trip.loadedQuantityKg ? t('common.qtyAt', '', { qty: formatKg(trip.loadedQuantityKg), at: formatDateTime(trip.pickedUpAt) }) : '—'],
                ]}
              />
            </Section>
            <Section title={t('components.tripMap.destination')}>
              <DetailList
                cols={1}
                items={[
                  [t('common.address'), <span key="d">{trip.dropAddress} <a className="link inline-flex items-center gap-0.5" target="_blank" rel="noreferrer" href={directionsUrl({ toLat: trip.dropLat, toLng: trip.dropLng, toAddress: trip.dropAddress })}>{t('driverTrip.map')} <ExternalLink className="h-3 w-3" aria-hidden /></a></span>],
                  trip.dropContactPhone && [t('driverTrip.receiver'), <a key="r" className="link" href={`tel:${trip.dropContactPhone}`}>{trip.dropContactName || t('driverTrip.receiver')}, {trip.dropContactPhone}</a>],
                  [t('driverTrip.eta'), formatDateTime(trip.estimatedArrivalAt)],
                  [humanize('DELIVERED'), trip.deliveredQuantityKg ? t('common.qtyAt', '', { qty: formatKg(trip.deliveredQuantityKg), at: formatDateTime(trip.deliveredAt) }) : '—'],
                  trip.order && [t('enums.ORDER'), trip.order.orderNumber],
                  [t('trips.charge'), t('driverTrip.chargeReceived', '', { charge: formatINR(trip.transportCharge), received: formatINR(trip.amountPaid) })],
                ]}
              />
              {trip.status === 'DELIVERED' && !trip.deliveryProofs.length && (
                <Button className="mt-4" size="sm" variant="secondary" onClick={() => setModal('deliver')}>
                  {t('driverTrip.addProof')}
                </Button>
              )}
            </Section>
            <Section title={t('dnav.tabs.history')}>
              <Timeline items={trip.events.map((e) => ({ id: e.id, title: humanize(e.toStatus), meta: formatDateTime(e.createdAt), note: e.note }))} />
            </Section>
            <p className="text-center text-sm text-soil-500">
              {t('driverTrip.changeVehicle')}{' '}
              <Link className="link" to="/driver/vehicles">
                {t('dnav.tabs.vehicles')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {modal === 'pickup' && (
        <QtyModal open onClose={() => setModal(null)} title={t('driverTrip.confirmPickup')} label={t('driverTrip.loadedQuantity')} defaultValue={String(Number(trip.expectedQuantityKg))} confirmLabel={t('driverTrip.confirmPickup')} onConfirm={(q) => move('PICKED_UP', { loadedQuantityKg: q })} />
      )}
      {modal === 'start' && (
        <QtyModal
          open
          withEta
          onClose={() => setModal(null)}
          title={t('driverTrip.startTheTrip')}
          label={t('driverTrip.loadOnBoard')}
          defaultValue={String(Number(trip.loadedQuantityKg || trip.expectedQuantityKg))}
          max={trip.loadedQuantityKg}
          confirmLabel={t('driverTrip.startTrip')}
          onConfirm={(_q, eta) => {
            if (!sharing.sharing) sharing.start();
            return move('IN_TRANSIT', eta ? { estimatedArrivalAt: new Date(eta).toISOString() } : {});
          }}
        />
      )}
      {modal === 'deliver' && <DeliveryModal open trip={trip} onClose={() => setModal(null)} onDone={reload} />}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm && t(`driverTrip.confirm.${confirm}.title`)}
        message={confirm && t(`driverTrip.confirm.${confirm}.message`)}
        confirmLabel={confirm && t(`driverTrip.confirm.${confirm}.label`)}
        requireReason
        busy={busy}
        onConfirm={(reason) =>
          move(CONFIRMS[confirm], { reason })
            .then(() => setConfirm(null))
            .catch(() => {})
        }
      />
    </>
  );
};

export default DriverTripPage;
