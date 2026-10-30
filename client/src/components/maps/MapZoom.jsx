import { ZoomControl } from 'react-leaflet';
import { useI18n } from '../../i18n';

/**
 * Leaflet's +/− buttons with tooltips in the active language.
 * Use inside <MapContainer zoomControl={false}>. Re-mounted on language change, because
 * Leaflet only reads the titles when the control is created.
 */
const MapZoom = () => {
  const { lang, t } = useI18n();
  return <ZoomControl key={lang} position="topleft" zoomInTitle={t('components.map.zoomIn', 'Zoom in')} zoomOutTitle={t('components.map.zoomOut', 'Zoom out')} />;
};

export default MapZoom;
