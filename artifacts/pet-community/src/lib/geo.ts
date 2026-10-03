/**
 * The bridge between the app's metre grid and the real world.
 *
 * Everything inside the app — the search model, the distances, the pin — works
 * in metres from 218 Street at 48 Avenue, because that is the arithmetic a
 * search model wants. A real map works in latitude and longitude. These two
 * functions convert between them, and they are the only place that knows how.
 *
 * The anchor is measured, not guessed: Langley Memorial Hospital at 22051
 * Fraser Highway sits at 49.09538 N, 122.61254 W, which is 220.5 Street and
 * about 49 Avenue, so the grid origin works back to 49.09348 N, 122.61979 W.
 * At this latitude a degree of longitude is roughly 72.9 km against 111.3 km
 * for a degree of latitude, which is why the two scales differ.
 *
 * Murrayville is small enough that treating the ground as flat over it is
 * accurate to a couple of metres — far finer than the 50 m grid anything here
 * is rounded to.
 */

import { MAP_MAX_X, MAP_MAX_Y, MAP_MIN_X, MAP_MIN_Y, type Vec } from './neighborhood-map.ts';

/** 218 Street at 48 Avenue, in the real world. */
export const ORIGIN_LAT = 49.09348;
export const ORIGIN_LON = -122.61979;

export const METRES_PER_DEG_LAT = 111_320;
export const METRES_PER_DEG_LON = METRES_PER_DEG_LAT * Math.cos((ORIGIN_LAT * Math.PI) / 180);

export type LatLon = { lat: number; lon: number };

export function toLatLon(point: Vec): LatLon {
  return {
    lat: ORIGIN_LAT + point.y / METRES_PER_DEG_LAT,
    lon: ORIGIN_LON + point.x / METRES_PER_DEG_LON,
  };
}

export function toVec(place: LatLon): Vec {
  return {
    x: (place.lon - ORIGIN_LON) * METRES_PER_DEG_LON,
    y: (place.lat - ORIGIN_LAT) * METRES_PER_DEG_LAT,
  };
}

/** The corners of the app's map, as somewhere a real map can be told to show. */
export const MAP_BOUNDS = {
  south: toLatLon({ x: 0, y: MAP_MIN_Y }).lat,
  north: toLatLon({ x: 0, y: MAP_MAX_Y }).lat,
  west: toLatLon({ x: MAP_MIN_X, y: 0 }).lon,
  east: toLatLon({ x: MAP_MAX_X, y: 0 }).lon,
};

/** Five Corners, near enough, for a map that has to open somewhere. */
export const MURRAYVILLE_CENTRE = toLatLon({ x: -200, y: 100 });
