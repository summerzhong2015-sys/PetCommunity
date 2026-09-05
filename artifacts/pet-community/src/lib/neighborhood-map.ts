/**
 * A metric model of the neighborhood, in metres, with the origin at the centre
 * of the map. +x is east, +y is north. Everything the lost-pet search model
 * reasons about — where an animal can hide, what it has to cross to get
 * somewhere, what might draw it in — is described here.
 *
 * The map spans 1200 m x 900 m, which is roughly the area a search party can
 * realistically cover on foot in an afternoon.
 */

export type Vec = { x: number; y: number };

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 900;
export const MAP_MIN_X = -MAP_WIDTH / 2;
export const MAP_MAX_X = MAP_WIDTH / 2;
export const MAP_MIN_Y = -MAP_HEIGHT / 2;
export const MAP_MAX_Y = MAP_HEIGHT / 2;

/** Broad land-use classes. Each one implies different odds of an animal stopping there. */
export type TerrainKind =
  | 'park'
  | 'woodland'
  | 'dense-housing'
  | 'commercial'
  | 'garden'
  | 'open'
  | 'industrial';

export type TerrainZone = {
  id: string;
  name: string;
  kind: TerrainKind;
  /** Axis-aligned bounds in metres. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/** Something an animal has to cross, and usually would rather not. */
export type BarrierKind = 'major-road' | 'rail' | 'creek';

export type Barrier = {
  id: string;
  name: string;
  kind: BarrierKind;
  /** Ordered points forming a polyline. */
  path: Vec[];
};

/** Somewhere an animal is actively drawn towards. */
export type AttractorKind = 'food' | 'water' | 'shelter' | 'familiar';

export type Attractor = {
  id: string;
  name: string;
  kind: AttractorKind;
  at: Vec;
  /** Metres — how far the pull reaches. */
  reach: number;
  /** 0-1, relative pull before hunger/thirst scaling. */
  strength: number;
};

/**
 * Land use. Order matters: the first zone containing a point wins, so the
 * smaller, more specific zones are listed before the broad ones.
 */
export const TERRAIN_ZONES: TerrainZone[] = [
  { id: 'garden', name: 'Community garden', kind: 'garden', x0: -200, y0: 40, x1: -60, y1: 170 },
  { id: 'fern-finch', name: 'Fern & Finch courtyard', kind: 'commercial', x0: -20, y0: 40, x1: 200, y1: 170 },
  { id: 'willow-gate', name: 'Willow Gate thicket', kind: 'woodland', x0: -200, y0: 190, x1: -40, y1: 400 },
  { id: 'meadow', name: 'Riverside meadow', kind: 'open', x0: -20, y0: 190, x1: 220, y1: 400 },
  { id: 'maple-park', name: 'Maple Park', kind: 'park', x0: -560, y0: 40, x1: -240, y1: 400 },
  { id: 'east-ridge', name: 'East Ridge woods', kind: 'woodland', x0: 250, y0: 40, x1: 460, y1: 420 },
  { id: 'hilltop', name: 'Hilltop Lookout', kind: 'open', x0: 490, y0: -430, x1: 590, y1: 420 },
  { id: 'alder', name: 'Alder Street', kind: 'dense-housing', x0: -540, y0: -430, x1: -100, y1: -40 },
  { id: 'oak-terrace', name: 'Oak Terrace', kind: 'dense-housing', x0: -80, y0: -430, x1: 300, y1: -40 },
  { id: 'depot', name: 'Rail depot yard', kind: 'industrial', x0: 330, y0: -430, x1: 470, y1: -40 },
];

/** Everything that gets in an animal's way. */
export const BARRIERS: Barrier[] = [
  {
    id: 'ridge-road',
    name: 'Ridge Road',
    kind: 'major-road',
    path: [
      { x: -600, y: -20 },
      { x: -180, y: 0 },
      { x: 220, y: 10 },
      { x: 600, y: 40 },
    ],
  },
  {
    id: 'north-creek',
    name: 'North Creek',
    kind: 'creek',
    path: [
      { x: -600, y: 300 },
      { x: -330, y: 250 },
      { x: -100, y: 215 },
      { x: 140, y: 265 },
      { x: 380, y: 235 },
      { x: 600, y: 190 },
    ],
  },
  {
    id: 'rail',
    name: 'Depot rail line',
    kind: 'rail',
    path: [
      { x: 470, y: -450 },
      { x: 480, y: 0 },
      { x: 500, y: 450 },
    ],
  },
];

/** Places that pull an animal in once it is hungry, thirsty or looking for cover. */
export const ATTRACTORS: Attractor[] = [
  { id: 'a-garden', name: 'Community garden compost', kind: 'food', at: { x: -130, y: 105 }, reach: 90, strength: 0.75 },
  { id: 'a-bins', name: 'Fern & Finch bin alley', kind: 'food', at: { x: 90, y: 105 }, reach: 85, strength: 0.85 },
  { id: 'a-creek', name: 'Creek shallows', kind: 'water', at: { x: -100, y: 215 }, reach: 110, strength: 0.6 },
  { id: 'a-fountain', name: 'Maple Park fountain', kind: 'water', at: { x: -400, y: 220 }, reach: 90, strength: 0.5 },
  { id: 'a-depot', name: 'Depot loading dock', kind: 'shelter', at: { x: 400, y: -235 }, reach: 100, strength: 0.55 },
  { id: 'a-willow', name: 'Willow Gate culverts', kind: 'shelter', at: { x: -120, y: 300 }, reach: 95, strength: 0.7 },
];

/** Named waypoints used for human-readable directions. */
export const LANDMARKS: { id: string; name: string; at: Vec }[] = [
  { id: 'willow-gate', name: 'Willow Gate', at: { x: -120, y: 190 } },
  { id: 'maple-north', name: 'Maple Park north gate', at: { x: -400, y: 380 } },
  { id: 'maple-south', name: 'Maple Park south lawn', at: { x: -400, y: 90 } },
  { id: 'garden', name: 'the community garden', at: { x: -130, y: 105 } },
  { id: 'fern-finch', name: 'Fern & Finch courtyard', at: { x: 90, y: 105 } },
  { id: 'creek-bend', name: 'the creek bend', at: { x: 140, y: 265 } },
  { id: 'east-ridge', name: 'East Ridge trailhead', at: { x: 355, y: 230 } },
  { id: 'alder', name: 'Alder Street', at: { x: -320, y: -235 } },
  { id: 'oak-terrace', name: 'Oak Terrace', at: { x: 110, y: -235 } },
  { id: 'depot', name: 'the rail depot', at: { x: 400, y: -235 } },
  { id: 'hilltop', name: 'Hilltop Lookout', at: { x: 540, y: 0 } },
];

export function zoneAt(p: Vec): TerrainZone | null {
  for (const z of TERRAIN_ZONES) {
    if (p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1) return z;
  }
  return null;
}

export function terrainAt(p: Vec): TerrainKind {
  return zoneAt(p)?.kind ?? 'open';
}

export function distance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Shortest distance from a point to a polyline. */
export function distanceToPath(p: Vec, path: Vec[]): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i += 1) {
    best = Math.min(best, distanceToSegment(p, path[i], path[i + 1]));
  }
  return best;
}

export function distanceToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** True when segment pq crosses segment ab. */
export function segmentsCross(p: Vec, q: Vec, a: Vec, b: Vec): boolean {
  const d1 = cross(a, b, p);
  const d2 = cross(a, b, q);
  const d3 = cross(p, q, a);
  const d4 = cross(p, q, b);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function cross(a: Vec, b: Vec, c: Vec): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** How many times a straight line from `from` to `to` crosses a barrier. */
export function crossingsOf(from: Vec, to: Vec, barrier: Barrier): number {
  let n = 0;
  for (let i = 0; i < barrier.path.length - 1; i += 1) {
    if (segmentsCross(from, to, barrier.path[i], barrier.path[i + 1])) n += 1;
  }
  return n;
}

export function nearestLandmark(p: Vec): { name: string; metres: number } {
  let best = LANDMARKS[0];
  let bestD = distance(p, best.at);
  for (const l of LANDMARKS) {
    const d = distance(p, l.at);
    if (d < bestD) {
      best = l;
      bestD = d;
    }
  }
  return { name: best.name, metres: Math.round(bestD) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
