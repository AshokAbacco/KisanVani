import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { useSettings } from '../../context/SettingsContext';
import { DROP_ICON, INDIA_CENTER, PICKUP_ICON, truckIcon } from './mapSetup';
import { formatDateTime, timeAgo } from '../../utils/format';
import { hasCoords } from '../../utils/maps';
import { useI18n } from '../../i18n';
import MapZoom from './MapZoom';

const FitBounds = ({ points }) => {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 12);
    else if (points.length > 1) map.fitBounds(points, { padding: [36, 36], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
};

/**
 * Pickup / drop markers, travelled path and the latest reported driver position.
 * The truck marker is grey when the last fix is stale; nothing is drawn when no fix exists.
 */
const TripMap = ({ pickup, drop, path = [], current, isStale, height = 360, follow = false }) => {
  const { t } = useI18n();
  const settings = useSettings();
  const pts = useMemo(() => {
    const list = [];
    if (pickup && hasCoords(pickup.lat, pickup.lng)) list.push([Number(pickup.lat), Number(pickup.lng)]);
    if (drop && hasCoords(drop.lat, drop.lng)) list.push([Number(drop.lat), Number(drop.lng)]);
    if (current && hasCoords(current.lat, current.lng)) list.push([Number(current.lat), Number(current.lng)]);
    return list;
  }, [pickup, drop, current]);
  const line = path.map((p) => [Number(p.latitude), Number(p.longitude)]);
  const fitTo = follow && current && hasCoords(current.lat, current.lng) ? [[Number(current.lat), Number(current.lng)]] : pts;

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-xl border border-soil-200">
      <MapContainer center={pts[0] || INDIA_CENTER} zoom={pts.length ? 11 : 5} scrollWheelZoom={false} className="h-full w-full" zoomControl={false}>
        <MapZoom />
        <TileLayer url={settings['map.tileUrl']} attribution={settings['map.attribution']} />
        {pickup && hasCoords(pickup.lat, pickup.lng) && (
          <Marker position={[Number(pickup.lat), Number(pickup.lng)]} icon={PICKUP_ICON}>
            <Popup>
              <strong>{t('components.tripMap.pickup')}</strong>
              <br />
              {pickup.label}
            </Popup>
          </Marker>
        )}
        {drop && hasCoords(drop.lat, drop.lng) && (
          <Marker position={[Number(drop.lat), Number(drop.lng)]} icon={DROP_ICON}>
            <Popup>
              <strong>{t('components.tripMap.destination')}</strong>
              <br />
              {drop.label}
            </Popup>
          </Marker>
        )}
        {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#1D5E9B', weight: 4, opacity: 0.7 }} />}
        {current && hasCoords(current.lat, current.lng) && (
          <Marker position={[Number(current.lat), Number(current.lng)]} icon={truckIcon(isStale)}>
            <Popup>
              <strong>{t(isStale ? 'components.tripMap.lastKnown' : 'components.tripMap.livePosition')}</strong>
              <br />
              {formatDateTime(current.at)} ({timeAgo(current.at)})
            </Popup>
          </Marker>
        )}
        <FitBounds points={fitTo} />
      </MapContainer>
      {!pts.length && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/70 text-center text-sm text-soil-500">
          <p className="px-6">{t('components.tripMap.noCoords')}</p>
        </div>
      )}
    </div>
  );
};

export default TripMap;
