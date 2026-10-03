/**
 * Tests for the metre grid against the real world.
 *
 * The one thing that must hold: a place with a known address comes out at its
 * known latitude and longitude, within a few metres. If this drifts, every pin
 * anyone drops on the real map lands in the wrong part of Murrayville.
 *
 * Run with:  node --experimental-strip-types src/lib/geo.test.ts
 */

import { MAP_BOUNDS, MURRAYVILLE_CENTRE, ORIGIN_LAT, ORIGIN_LON, toLatLon, toVec } from './geo.ts';
import { LANDMARKS, at } from './neighborhood-map.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

/** Metres between two real points, near enough at this latitude. */
function metresApart(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const x = (a.lon - b.lon) * 72_870;
  const y = (a.lat - b.lat) * 111_320;
  return Math.hypot(x, y);
}

// --- known addresses land where they really are --------------------------
{
  // Langley Memorial Hospital, 22051 Fraser Highway: 49.09538 N, 122.61254 W.
  const hospital = toLatLon(at(220.5, 49.0));
  check('the hospital lands on the hospital',
    metresApart(hospital, { lat: 49.09538, lon: -122.61254 }) < 15,
    `${metresApart(hospital, { lat: 49.09538, lon: -122.61254 }).toFixed(1)} m out`);

  // 0 Avenue runs along the Canada-US border at 49.0023 N.
  const border = toLatLon(at(218, 0));
  check('0 Avenue lands on the border', Math.abs(border.lat - 49.0023) < 0.002, String(border.lat));

  const origin = toLatLon({ x: 0, y: 0 });
  check('the origin is the origin', origin.lat === ORIGIN_LAT && origin.lon === ORIGIN_LON);
}

// --- the conversion is reversible ----------------------------------------
{
  const points = [{ x: 0, y: 0 }, { x: 500, y: -700 }, { x: -1050, y: 950 }, { x: 137, y: -42 }];
  for (const point of points) {
    const back = toVec(toLatLon(point));
    check(`${JSON.stringify(point)} survives the round trip`,
      Math.hypot(back.x - point.x, back.y - point.y) < 0.001, JSON.stringify(back));
  }
  for (const landmark of LANDMARKS) {
    const back = toVec(toLatLon(landmark.at));
    check(`${landmark.name} survives the round trip`,
      Math.hypot(back.x - landmark.at.x, back.y - landmark.at.y) < 0.001);
  }
}

// --- directions are not mirrored -----------------------------------------
{
  check('north is a bigger latitude', toLatLon({ x: 0, y: 500 }).lat > toLatLon({ x: 0, y: -500 }).lat);
  check('east is a bigger longitude', toLatLon({ x: 500, y: 0 }).lon > toLatLon({ x: -500, y: 0 }).lon);
  check('a metre north is not a metre east',
    toLatLon({ x: 0, y: 1 }).lat - toLatLon({ x: 0, y: 0 }).lat !==
    toLatLon({ x: 1, y: 0 }).lon - toLatLon({ x: 0, y: 0 }).lon);
}

// --- the bounds hold the whole neighbourhood -----------------------------
{
  check('north is north of south', MAP_BOUNDS.north > MAP_BOUNDS.south);
  check('east is east of west', MAP_BOUNDS.east > MAP_BOUNDS.west);
  for (const landmark of LANDMARKS) {
    const place = toLatLon(landmark.at);
    check(`${landmark.name} is inside the bounds`,
      place.lat >= MAP_BOUNDS.south && place.lat <= MAP_BOUNDS.north &&
      place.lon >= MAP_BOUNDS.west && place.lon <= MAP_BOUNDS.east);
  }
  check('the map is about two kilometres across',
    Math.abs(metresApart({ lat: 0 + MAP_BOUNDS.south, lon: MAP_BOUNDS.west }, { lat: MAP_BOUNDS.south, lon: MAP_BOUNDS.east }) - 2200) < 50);
  check('the centre is somewhere in Murrayville',
    MURRAYVILLE_CENTRE.lat > 49.08 && MURRAYVILLE_CENTRE.lat < 49.11 &&
    MURRAYVILLE_CENTRE.lon > -122.64 && MURRAYVILLE_CENTRE.lon < -122.60,
    JSON.stringify(MURRAYVILLE_CENTRE));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
