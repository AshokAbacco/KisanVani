import { Radio, SignalZero, Clock } from 'lucide-react';
import TripMap from './TripMap';
import useTripTracking from '../../hooks/useTripTracking';
import { formatDateTime, timeAgo } from '../../utils/format';
import { TRIP_TRACKABLE } from '../../constants/status';
import Alert from '../feedback/Alert';
import { useI18n } from '../../i18n';

/** Map + honest live-status line for anyone allowed to watch a trip. */
const LiveTripPanel = ({ trip, height = 380 }) => {
  const { t: tr } = useI18n();
  const t = useTripTracking(trip.id);
  const snap = t.snapshot || trip;
  const status = snap.status || trip.status;
  const trackable = TRIP_TRACKABLE.includes(status);
  const current = snap.lastLat != null ? { lat: snap.lastLat, lng: snap.lastLng, at: snap.lastLocationAt } : null;

  let indicator;
  if (!trackable) indicator = { icon: Clock, cls: 'text-soil-500', text: tr(status === 'ASSIGNED' ? 'components.liveTrip.startsAfterAccept' : 'components.liveTrip.ended') };
  else if (!current) indicator = { icon: SignalZero, cls: 'text-soil-500', text: tr('components.liveTrip.waiting') };
  else if (t.isStale) indicator = { icon: SignalZero, cls: 'text-chilli-600', text: tr('components.liveTrip.offline', '', { ago: timeAgo(current.at), at: formatDateTime(current.at) }) };
  else indicator = { icon: Radio, cls: 'text-field-700', text: tr('components.liveTrip.live', '', { ago: timeAgo(current.at) }) };
  const Icon = indicator.icon;

  return (
    <div className="space-y-3">
      {t.denied && <Alert tone="warning">{tr('components.liveTrip.denied')}</Alert>}
      <TripMap
        height={height}
        pickup={{ lat: trip.pickupLat, lng: trip.pickupLng, label: trip.pickupAddress }}
        drop={{ lat: trip.dropLat, lng: trip.dropLng, label: trip.dropAddress }}
        path={t.points}
        current={current}
        isStale={t.isStale}
      />
      <p className={`flex items-center gap-2 text-sm font-medium ${indicator.cls}`}>
        <Icon className="h-4 w-4" aria-hidden />
        {indicator.text}
        {trackable && !t.connected && !t.denied && <span className="font-normal text-soil-400">{tr('components.liveTrip.reconnecting')}</span>}
      </p>
    </div>
  );
};

export default LiveTripPanel;
