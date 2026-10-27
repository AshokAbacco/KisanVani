/** Opens turn-by-turn directions in the user's map app (Google Maps universal link). */
export const directionsUrl = ({ fromLat, fromLng, toLat, toLng, toAddress }) => {
  const dest = toLat != null && toLng != null ? `${toLat},${toLng}` : encodeURIComponent(toAddress || '');
  const origin = fromLat != null && fromLng != null ? `&origin=${fromLat},${fromLng}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=driving`;
};

export const placeUrl = (lat, lng, address) =>
  lat != null && lng != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;

export const hasCoords = (lat, lng) => lat !== null && lat !== undefined && lng !== null && lng !== undefined && lat !== '' && lng !== '';
