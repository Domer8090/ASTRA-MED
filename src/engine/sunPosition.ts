/**
 * Subsolar point (where the Sun is overhead) for a real instant, from the
 * low-precision solar coordinates in the Astronomical Almanac (accurate to
 * about 0.01° in declination, enough to draw the day–night line). Pure.
 */
const RAD = Math.PI / 180;

export function subsolarPoint(date: Date): { lat: number; lon: number } {
  const n = date.getTime() / 86_400_000 + 2440587.5 - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const epsilon = (23.439 - 0.0000004 * n) * RAD;
  const decl = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (((280.46061837 + 360.98564736629 * n) % 360) + 360) % 360;
  let lon = ra / RAD - gmst;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat: decl / RAD, lon };
}

/** Unit vector for a latitude/longitude on a sphere that matches an equirectangular texture in three.js. */
export function latLonToVector(lat: number, lon: number): [number, number, number] {
  const phi = ((lon + 180) / 360) * 2 * Math.PI;
  const c = Math.cos(lat * RAD);
  return [-Math.cos(phi) * c, Math.sin(lat * RAD), Math.sin(phi) * c];
}
