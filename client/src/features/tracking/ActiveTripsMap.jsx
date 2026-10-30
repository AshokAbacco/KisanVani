import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { RefreshCw } from 'lucide-react';
import { trackingApi } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { INDIA_CENTER, truckIcon, PICKUP_ICON } from '../../components/maps/mapSetup';
import Section from '../../components/common/Section';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import { timeAgo } from '../../utils/format';
import { useI18n } from '../../i18n';
import MapZoom from '../../components/maps/MapZoom';

const Fit = ({ pts }) => {
  const map = useMap();
  const key = JSON.stringify(pts);
  useEffect(() => {
    if (pts.length === 1) map.setView(pts[0], 11);
    else if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
};

/**
 * Overview map of active trips the user may see (all for admins). Trips without a GPS fix
 * are drawn at their pickup point and labelled as such; stale positions are grey.
 */
const ActiveTripsMap = ({ base, height = 360 }) => {
  const { t: tr } = useI18n();
  const settings = useSettings();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    trackingApi
      .active()
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const placed = trips
    .map((t) => (t.lastLat != null ? { t, pos: [Number(t.lastLat), Number(t.lastLng)], live: true } : t.pickupLat != null ? { t, pos: [Number(t.pickupLat), Number(t.pickupLng)], live: false } : null))
    .filter(Boolean);

  return (
    <Section
      title={tr('activeMap.title')}
      description={tr('activeMap.summary', '', { active: trips.length, live: trips.filter((t) => t.lastLat != null && !t.isStale).length })}
      actions={
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={load} loading={loading}>
          {tr('common.refresh')}
        </Button>
      }
      bodyClass="p-3"
    >
      <div style={{ height }} className="overflow-hidden rounded-xl">
        <MapContainer center={INDIA_CENTER} zoom={5} scrollWheelZoom={false} className="h-full w-full" zoomControl={false}>
        <MapZoom />
          <TileLayer url={settings['map.tileUrl']} attribution={settings['map.attribution']} />
          {placed.map(({ t, pos, live }) => (
            <Marker key={t.id} position={pos} icon={live ? truckIcon(t.isStale) : PICKUP_ICON}>
              <Popup>
                <strong>{t.tripNumber}</strong> — {t.commodity}
                <br />
                {t.driver.name}, {t.vehicle.registrationNumber}
                <br />
                {live ? tr(t.isStale ? 'activeMap.lastSeen' : 'activeMap.updated', '', { ago: timeAgo(t.lastLocationAt) }) : tr('activeMap.noGps')}
                <br />
                <Link to={`${base}/transport/trips/${t.id}`}>{tr('liveTracking.openTrip')}</Link>
              </Popup>
            </Marker>
          ))}
          <Fit pts={placed.map((p) => p.pos)} />
        </MapContainer>
      </div>
      {trips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {trips.slice(0, 12).map((t) => (
            <li key={t.id}>
              <Link to={`${base}/transport/trips/${t.id}`} className="inline-flex items-center gap-2 rounded-lg border border-soil-200 px-2.5 py-1.5 text-sm hover:bg-leafwhite">
                <span className="num whitespace-nowrap font-semibold">{t.tripNumber}</span>
                <StatusBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};

export default ActiveTripsMap;
