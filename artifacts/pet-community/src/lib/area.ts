/**
 * Where you walk from.
 *
 * Until now this was a dropdown of eleven landmarks, pre-filled with the first
 * one, which meant nobody ever actually set it — the field looked answered
 * before anyone had answered it. So: you drop a pin on the neighbourhood plan,
 * and the app says back, in words, roughly where that is.
 *
 * Three things keep it honest. The pin is rounded to a 50 m grid before it is
 * stored, so what is kept is never more precise than "that corner of the
 * park". It is described relative to a public landmark, never as an address.
 * And it is nothing to do with the device's GPS — this is a spot you choose on
 * a map, which is why "estimated" is the right word for it.
 */

import {
  LANDMARKS,
  MAP_MAX_X, MAP_MAX_Y, MAP_MIN_X, MAP_MIN_Y,
  type Vec,
} from './neighborhood-map.ts';

/** Metres the pin is rounded to before anything is stored. */
export const AREA_STEP = 50;

/** The circle drawn around the pin, to show it is an area and not a doorstep. */
export const AREA_BLUR_METRES = 160;

/** Close enough to a landmark that naming the landmark is the whole answer. */
export const AT_LANDMARK_METRES = 120;

export type Area = { x: number; y: number };

export function clampToMap(point: Vec): Vec {
  const x = Number.isFinite(point?.x) ? point.x : 0;
  const y = Number.isFinite(point?.y) ? point.y : 0;
  return {
    x: Math.min(MAP_MAX_X, Math.max(MAP_MIN_X, x)),
    y: Math.min(MAP_MAX_Y, Math.max(MAP_MIN_Y, y)),
  };
}

/** Inside the map, and rounded, so the stored spot is deliberately blunt. */
export function snapArea(point: Vec): Area {
  const inside = clampToMap(point);
  return {
    x: Math.round(inside.x / AREA_STEP) * AREA_STEP,
    y: Math.round(inside.y / AREA_STEP) * AREA_STEP,
  };
}

/** Only a pin we could have produced ourselves survives being read back. */
export function readArea(value: unknown): Area | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { x, y } = value as Partial<Area>;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return snapArea({ x: x as number, y: y as number });
}

export function metresBetweenPoints(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nearestLandmark(point: Vec): { id: string; name: string; at: Vec; metres: number } {
  let best = LANDMARKS[0];
  let bestMetres = Infinity;
  for (const landmark of LANDMARKS) {
    const metres = metresBetweenPoints(point, landmark.at);
    if (metres < bestMetres) {
      best = landmark;
      bestMetres = metres;
    }
  }
  return { ...best, metres: bestMetres };
}

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

/** Which way `to` lies from `from`, in the words a person would use. */
export function bearingWord(from: Vec, to: Vec): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return 'north';
  // Clockwise from north, which is how the words above are ordered.
  const degrees = (Math.atan2(dx, dy) * 180) / Math.PI;
  const index = Math.round(((degrees + 360) % 360) / 45) % 8;
  return COMPASS[index];
}

/** The rounded distance a person would actually say. */
export function roughMetres(metres: number): string {
  if (metres >= 1000) return `${(Math.round(metres / 100) / 10).toFixed(1)} km`;
  return `${Math.max(AREA_STEP, Math.round(metres / 50) * 50)} m`;
}

/** The pin, in words: "right by the creek bend", "300 m south of Alder Street". */
export function describeArea(point: Vec): string {
  const landmark = nearestLandmark(point);
  if (landmark.metres <= AT_LANDMARK_METRES) return `right by ${landmark.name}`;
  return `${roughMetres(landmark.metres)} ${bearingWord(landmark.at, point)} of ${landmark.name}`;
}

/** The label the rest of the app already shows — always a public landmark. */
export function areaLabel(point: Vec): string {
  return nearestLandmark(point).name;
}

/**
 * Where someone is, as a point: their pin if they set one, otherwise the
 * landmark they picked, otherwise nothing. Everything that measures a distance
 * goes through here, so a pin and a landmark are never compared in different
 * units.
 */
export function pointFor(area: Area | undefined, landmarkName: string | undefined): Vec | null {
  if (area) return area;
  const named = LANDMARKS.find((l) => l.name === landmarkName);
  return named ? named.at : null;
}
