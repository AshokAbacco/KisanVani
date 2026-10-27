import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Coloured circular pin rendered with HTML so no marker images need to be bundled. */
export const pin = (color, label = '') =>
  L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
    html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:999px;background:${color};color:#fff;font:600 12px/1 system-ui;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">${label}</span>`,
  });

export const truckIcon = (stale) =>
  L.divIcon({
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    html: `<span style="display:grid;place-items:center;width:38px;height:38px;border-radius:999px;background:${stale ? '#86948A' : '#1D5E9B'};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></span>`,
  });

export const PICKUP_ICON = pin('#1F6F3D', 'P');
export const DROP_ICON = pin('#D4621F', 'D');
export const HERE_ICON = pin('#1D5E9B', '•');

/** Centre of India — used only as a map starting view, never as a location. */
export const INDIA_CENTER = [20.59, 78.96];
