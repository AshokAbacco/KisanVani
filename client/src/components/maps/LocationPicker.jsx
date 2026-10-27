import { useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { HERE_ICON, INDIA_CENTER } from './mapSetup';
import Button from '../common/Button';
import { hasCoords } from '../../utils/maps';

const ClickToSet = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))) });
  return null;
};

/** Pick a GPS position by tapping the map or using the device location. value = { lat, lng } */
const LocationPicker = ({ value, onChange, height = 280 }) => {
  const settings = useSettings();
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);
  const has = hasCoords(value?.lat, value?.lng);
  const center = has ? [Number(value.lat), Number(value.lng)] : INDIA_CENTER;

  const useDevice = () => {
    if (!navigator.geolocation) return setError('Location is not available on this device.');
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        onChange({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) });
      },
      (e) => {
        setLocating(false);
        setError(e.code === e.PERMISSION_DENIED ? 'Location permission denied. Tap the map to set the position instead.' : 'Could not get a GPS fix. Tap the map instead.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
    return undefined;
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="num text-sm text-soil-500">{has ? `${Number(value.lat).toFixed(5)}, ${Number(value.lng).toFixed(5)}` : 'Tap the map to set the location'}</p>
        <div className="flex gap-2">
          {has && (
            <Button size="sm" variant="ghost" onClick={() => onChange({ lat: null, lng: null })}>
              Clear
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={LocateFixed} loading={locating} onClick={useDevice}>
            Use my location
          </Button>
        </div>
      </div>
      <div style={{ height }} className="overflow-hidden rounded-xl border border-soil-200">
        <MapContainer key={has ? 'set' : 'unset'} center={center} zoom={has ? 14 : 5} className="h-full w-full">
          <TileLayer url={settings['map.tileUrl']} attribution={settings['map.attribution']} />
          <ClickToSet onPick={(lat, lng) => onChange({ lat, lng })} />
          {has && <Marker position={center} icon={HERE_ICON} />}
        </MapContainer>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default LocationPicker;
