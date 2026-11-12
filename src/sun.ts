// Sunrise, sunset, golden hour and blue hour for any date and place, worked out on the device.
// Uses the standard NOAA solar position formulas, so it's accurate to a minute or two.

const rad = Math.PI / 180;

/** The sun's height above the horizon in degrees, at a moment in time and a place. */
export function sunElevation(date: Date, lat: number, lon: number) {
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C = Math.sin(M * rad) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * t) + Math.sin(3 * M * rad) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)) / rad;
  const y = Math.tan((eps / 2) * rad) ** 2;
  const eqTime =
    (4 / rad) *
    (y * Math.sin(2 * L0 * rad) -
      2 * e * Math.sin(M * rad) +
      4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) -
      0.5 * y * y * Math.sin(4 * L0 * rad) -
      1.25 * e * e * Math.sin(2 * M * rad));
  const minutesUtc = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolar = (((minutesUtc + eqTime + 4 * lon) % 1440) + 1440) % 1440;
  const hourAngle = trueSolar / 4 < 0 ? trueSolar / 4 + 180 : trueSolar / 4 - 180;
  const cosZenith = Math.sin(lat * rad) * Math.sin(decl * rad) + Math.cos(lat * rad) * Math.cos(decl * rad) * Math.cos(hourAngle * rad);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) / rad;
}

export type Window = { start: Date; end: Date };
export type SunDay = {
  sunrise: Date | null;
  sunset: Date | null;
  goldenMorning: Window | null;
  goldenEvening: Window | null;
  blueMorning: Window | null;
  blueEvening: Window | null;
};

/**
 * Light windows for a local calendar day ("YYYY-MM-DD"), in the device's time zone.
 * Golden hour: sun between -4° and 6°. Blue hour: between -6° and -4°.
 */
export function sunDay(day: string, lat: number, lon: number): SunDay {
  const start = new Date(`${day}T00:00:00`);
  const samples: { t: Date; el: number }[] = [];
  for (let m = 0; m <= 1440; m++) {
    const t = new Date(start.getTime() + m * 60_000);
    samples.push({ t, el: sunElevation(t, lat, lon) });
  }
  const noon = samples.reduce((a, b) => (b.el > a.el ? b : a));
  const morning = samples.filter((s) => s.t <= noon.t);
  const evening = samples.filter((s) => s.t >= noon.t);

  const between = (list: typeof samples, lo: number, hi: number): Window | null => {
    const inside = list.filter((s) => s.el >= lo && s.el <= hi);
    return inside.length ? { start: inside[0].t, end: inside[inside.length - 1].t } : null;
  };
  // Sunrise and sunset use the usual -0.833° (refraction plus the sun's radius)
  const crossing = (list: typeof samples) => {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1].el + 0.833;
      const b = list[i].el + 0.833;
      if ((a < 0 && b >= 0) || (a >= 0 && b < 0)) return list[i].t;
    }
    return null;
  };
  return {
    sunrise: crossing(morning),
    sunset: crossing(evening),
    goldenMorning: between(morning, -4, 6),
    goldenEvening: between(evening, -4, 6),
    blueMorning: between(morning, -6, -4),
    blueEvening: between(evening, -6, -4),
  };
}

export const clock = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
