/**
 * Murrayville, Langley, British Columbia — in metres.
 *
 * This used to be an invented neighbourhood. It is now the real one, drawn as
 * well as a map can be drawn from addresses rather than a survey: the shape and
 * the arrangement are right, the edges are approximate, and nothing here is
 * precise enough to find a house with.
 *
 * Langley's grid does most of the work. Streets run north-south and avenues
 * east-west, both numbered, so every address is already a coordinate: James
 * Hill Elementary at 22144 Old Yale Road is 221.4 Street, a little over 50
 * Avenue. One unit of numbering is about 211 m — worked out from the real
 * latitude of Langley Memorial Hospital (49.0954 N, 22051 Fraser Highway)
 * against 0 Avenue on the border — so `at(street, avenue)` turns any address
 * into a point.
 *
 * The origin is 218 Street and 48 Avenue, which puts Five Corners — where 216
 * Street, 48 Avenue and Old Yale Road meet, and where Murrayville actually
 * begins — a little west of centre, and leaves room for the hospital and the
 * shops to the east and the Nicomekl to the north.
 *
 * Everything the lost-pet search model reasons about — where an animal can
 * hide, what it has to cross, what might draw it in — is described here.
 */

export type Vec = { x: number; y: number };

/** Metres per unit of Langley's street and avenue numbering. */
export const BLOCK_METRES = 211;
export const ORIGIN_STREET = 218;
export const ORIGIN_AVENUE = 48;

/** An address, as a point. 22051 Fraser Hwy is `at(220.5, 49)`. */
export function at(street: number, avenue: number): Vec {
  return {
    x: Math.round((street - ORIGIN_STREET) * BLOCK_METRES),
    y: Math.round((avenue - ORIGIN_AVENUE) * BLOCK_METRES),
  };
}

/** 213 to 223 Street, 43 to 53 Avenue — Murrayville with its edges. */
export const MAP_WIDTH = 2200;
export const MAP_HEIGHT = 2000;
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
  | 'industrial'
  | 'school';

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

/** A block of the grid, from its two corners as street and avenue numbers. */
function block(id: string, name: string, kind: TerrainKind, s0: number, a0: number, s1: number, a1: number): TerrainZone {
  const from = at(s0, a0);
  const to = at(s1, a1);
  return { id, name, kind, x0: from.x, y0: from.y, x1: to.x, y1: to.y };
}

/**
 * Land use. Order matters: the first zone containing a point wins, so the
 * smaller, more specific places are listed before the broad residential blocks
 * they sit inside.
 */
export const TERRAIN_ZONES: TerrainZone[] = [
  // The two commercial stretches: the old heart at Five Corners, and the strip
  // along 48 Avenue with the grocery, the library and the coffee shops.
  block('five-corners', 'Five Corners', 'commercial', 215.4, 47.6, 217.0, 48.5),
  block('murrayville-shops', 'the 48 Avenue shops', 'commercial', 219.6, 47.6, 223.1, 48.0),

  block('hospital', 'Langley Memorial Hospital', 'commercial', 219.9, 48.6, 221.3, 49.7),
  block('wc-blair', 'W.C. Blair Recreation Centre', 'park', 221.5, 48.6, 222.9, 49.7),
  block('activity-park', 'Murrayville Outdoor Activity Park', 'park', 221.0, 48.0, 222.2, 48.6),
  block('james-hill', 'James Hill Elementary', 'school', 220.4, 49.9, 221.8, 50.6),
  block('james-hill-park', 'James Hill Park', 'park', 220.4, 50.6, 222.0, 51.2),
  block('old-yale-park', 'Old Yale Park', 'park', 216.5, 49.6, 218.0, 50.8),
  block('arboretum', 'Derek Doubleday Arboretum', 'woodland', 217.3, 48.7, 218.9, 49.4),
  block('credo', 'Credo Christian School', 'school', 218.2, 51.0, 219.4, 51.6),
  block('cemetery', 'Murrayville Cemetery', 'garden', 213.4, 43.5, 214.8, 44.6),

  // The civic block: the RCMP detachment on 48A, Fire Hall 6 on 50th, and the
  // school district offices between them. Murrayville is the Township's
  // administrative corner, which is why so much of it is parking.
  block('civic', 'the civic block', 'commercial', 221.4, 49.8, 222.6, 50.6),
  block('hall', 'Murrayville Hall', 'commercial', 216.4, 47.7, 217.1, 48.2),
  block('fundamental', 'Langley Fundamental', 'school', 214.2, 50.6, 215.4, 51.2),

  // The Nicomekl floodplain across the north — wet, open, and the one piece of
  // ground round here that nobody has built on.
  block('nicomekl', 'the Nicomekl floodplain', 'open', 212.9, 51.7, 223.1, 52.8),

  // Everything else is houses.
  block('houses-nw', 'the streets north of 48th', 'dense-housing', 212.9, 48.6, 215.9, 51.5),
  block('houses-core', 'the old subdivision', 'dense-housing', 216.1, 48.6, 217.2, 49.5),
  block('houses-mid', 'the streets behind the hospital', 'dense-housing', 218.3, 49.7, 220.2, 50.9),
  block('houses-ne', 'the streets off Old Yale', 'dense-housing', 218.9, 50.1, 223.1, 51.5),
  block('houses-sw', 'the streets south of 48th', 'dense-housing', 212.9, 44.8, 215.9, 47.5),
  block('houses-se', 'the 46th Avenue blocks', 'dense-housing', 216.3, 44.8, 222.5, 47.5),
];

/** Everything that gets in an animal's way. */
export const BARRIERS: Barrier[] = [
  {
    id: 'fraser-highway',
    name: 'Fraser Highway',
    kind: 'major-road',
    path: [at(212.5, 51.2), at(214.5, 49.9), at(216.3, 48.9), at(219, 48.75), at(221, 48.6), at(223.5, 48.4)],
  },
  {
    id: '216-street',
    name: '216 Street',
    kind: 'major-road',
    path: [at(216, 43), at(216, 53)],
  },
  {
    id: '48-avenue',
    name: '48 Avenue',
    kind: 'major-road',
    path: [at(212.5, 48), at(223.5, 48)],
  },
  {
    // The oldest concrete road in the province, and still a through route.
    id: 'old-yale-road',
    name: 'Old Yale Road',
    kind: 'major-road',
    path: [at(216, 48), at(218, 49.3), at(221.4, 50.4), at(223.5, 51.1)],
  },
  {
    id: 'nicomekl',
    name: 'the Nicomekl River',
    kind: 'creek',
    path: [at(212.5, 52.4), at(216, 52.0), at(220, 51.9), at(223.5, 52.3)],
  },
];

/** Places that pull an animal in once it is hungry, thirsty or looking for cover. */
export const ATTRACTORS: Attractor[] = [
  { id: 'a-shops', name: 'the bins behind the 48th Avenue shops', kind: 'food', at: at(222.3, 48.1), reach: 110, strength: 0.85 },
  { id: 'a-five-corners', name: 'the Five Corners patios', kind: 'food', at: at(216.2, 48.1), reach: 95, strength: 0.7 },
  { id: 'a-nicomekl', name: 'the Nicomekl shallows', kind: 'water', at: at(216.5, 52.0), reach: 150, strength: 0.65 },
  { id: 'a-old-yale', name: 'the Old Yale Park off-leash field', kind: 'familiar', at: at(217.3, 50.2), reach: 130, strength: 0.75 },
  { id: 'a-cemetery', name: 'the cemetery hedges', kind: 'shelter', at: at(214.1, 44.1), reach: 100, strength: 0.6 },
  { id: 'a-hospital', name: 'the hospital loading bay', kind: 'shelter', at: at(220.6, 49.2), reach: 90, strength: 0.5 },
];

/** Named waypoints used for human-readable directions, and for "roughly where you walk". */
export const LANDMARKS: { id: string; name: string; short: string; at: Vec }[] = [
  // `short` is what fits on the map; `name` is what a person says out loud.
  { id: 'five-corners', name: 'Five Corners', short: 'Five Corners', at: at(216, 48) },
  { id: 'murrayville-shops', name: 'the 48th Avenue shops', short: '48th Ave shops', at: at(222.3, 48.1) },
  { id: 'library', name: 'Murrayville Library', short: 'Library', at: at(220.7, 48.1) },
  { id: 'hospital', name: 'Langley Memorial Hospital', short: 'Hospital', at: at(220.5, 49.1) },
  { id: 'wc-blair', name: 'W.C. Blair Recreation Centre', short: 'W.C. Blair', at: at(222.2, 49.1) },
  { id: 'activity-park', name: 'Murrayville Outdoor Activity Park', short: 'Activity Park', at: at(221.6, 48.3) },
  { id: 'james-hill-park', name: 'James Hill Park', short: 'James Hill Park', at: at(221.1, 50.9) },
  { id: 'old-yale-park', name: 'Old Yale Park', short: 'Old Yale Park', at: at(217.2, 50.2) },
  { id: 'arboretum', name: 'Derek Doubleday Arboretum', short: 'Arboretum', at: at(218.1, 49.0) },
  { id: 'nicomekl', name: 'the Nicomekl trail', short: 'Nicomekl trail', at: at(216.5, 51.9) },
  { id: 'cemetery', name: 'Murrayville Cemetery', short: 'Cemetery', at: at(214.1, 44.1) },
  { id: 'hall', name: 'Murrayville Hall', short: 'The Hall', at: at(216.7, 47.9) },
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
