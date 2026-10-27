/** Great-circle distance in kilometres (haversine). Returns null when either point is missing. */
const distanceKm = (lat1, lng1, lat2, lng2) => {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined)) return null;
  const toRad = (d) => (Number(d) * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLng = toRad(Number(lng2) - Number(lng1));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
};

module.exports = { distanceKm };
