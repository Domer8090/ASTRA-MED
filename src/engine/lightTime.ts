/**
 * Earth–Mars distance and signal light time from the JPL "Approximate
 * Positions of the Planets" Keplerian elements (E. M. Standish, Table 1,
 * valid 1800–2050). Accuracy is a few thousandths of an AU, ample for a
 * light-time readout. Pure functions, no network.
 */

interface Elements {
  a: [number, number];
  e: [number, number];
  i: [number, number];
  L: [number, number];
  peri: [number, number];
  node: [number, number];
}

// [value at J2000, rate per Julian century]; a in AU, angles in degrees.
const EARTH: Elements = {
  a: [1.00000261, 0.00000562],
  e: [0.01671123, -0.00004392],
  i: [-0.00001531, -0.01294668],
  L: [100.46457166, 35999.37244981],
  peri: [102.93768193, 0.32327364],
  node: [0, 0],
};

const MARS: Elements = {
  a: [1.52371034, 0.00001847],
  e: [0.0933941, 0.00007882],
  i: [1.84969142, -0.00813131],
  L: [-4.55343205, 19140.30268499],
  peri: [-23.94362959, 0.44441088],
  node: [49.55953891, -0.29257343],
};

const AU_KM = 149_597_870.7;
const C_KM_S = 299_792.458;
const RAD = Math.PI / 180;

/** Heliocentric ecliptic position (J2000) in AU. */
export function heliocentric(el: Elements, date: Date): [number, number, number] {
  const T = (date.getTime() / 86_400_000 + 2440587.5 - 2451545) / 36525;
  const v = (p: [number, number]) => p[0] + p[1] * T;
  const a = v(el.a);
  const e = v(el.e);
  const i = v(el.i) * RAD;
  const L = v(el.L);
  const peri = v(el.peri);
  const node = v(el.node);
  const w = (peri - node) * RAD;
  const O = node * RAD;
  let M = (((L - peri) % 360) + 540) % 360 - 180;
  M *= RAD;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const x = (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(i)) * xp + (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(i)) * yp;
  const y = (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(i)) * xp + (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(i)) * yp;
  const z = Math.sin(w) * Math.sin(i) * xp + Math.cos(w) * Math.sin(i) * yp;
  return [x, y, z];
}

export function earthMarsDistanceAu(date: Date): number {
  const [x1, y1, z1] = heliocentric(EARTH, date);
  const [x2, y2, z2] = heliocentric(MARS, date);
  return Math.hypot(x2 - x1, y2 - y1, z2 - z1);
}

/** One-way radio signal time between Earth and Mars, in minutes. */
export function earthMarsLightMinutes(date: Date): number {
  return (earthMarsDistanceAu(date) * AU_KM) / C_KM_S / 60;
}
