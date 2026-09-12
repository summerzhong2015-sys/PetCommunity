/**
 * Lost-pet search model.
 *
 * Given where an animal was last seen, how long ago, what kind of animal it is
 * and anything neighbours have reported since, this builds a probability field
 * over the neighbourhood and pulls out the places worth searching first.
 *
 * The field is a product of five independent terms, evaluated per grid cell and
 * then normalised so the whole map sums to 1:
 *
 *   1. dispersal    how far the animal is likely to have got by now
 *   2. terrain      whether it would actually stop somewhere like that
 *   3. barriers     what it had to cross to get there
 *   4. attractors   food, water and cover pulling it in
 *   5. sightings    what people have actually reported
 *
 * The behavioural constants come from how lost animals are known to act rather
 * than from anything fitted: cats hole up close to where they went missing,
 * dogs cover ground, frightened animals travel further and hide harder than
 * confident ones, and both orient back towards home once the initial panic
 * wears off.
 *
 * Everything here is pure and deterministic, so it can be tested directly.
 */

import {
  ATTRACTORS,
  BARRIERS,
  MAP_HEIGHT,
  MAP_MIN_X,
  MAP_MIN_Y,
  MAP_WIDTH,
  clamp,
  crossingsOf,
  distance,
  distanceToPath,
  nearestLandmark,
  terrainAt,
  zoneAt,
  type BarrierKind,
  type TerrainKind,
  type Vec,
} from './neighborhood-map.ts';
import { NO_CUES, type ReadCues } from './report-reader.ts';

export type Species = 'dog' | 'cat';
export type BuildSize = 'small' | 'medium' | 'large';
export type Temperament = 'friendly' | 'shy' | 'skittish';
export type Weather = 'clear' | 'rain' | 'cold' | 'hot';
export type TimeOfDay = 'day' | 'dusk' | 'night';
export type SightingConfidence = 'confirmed' | 'likely' | 'possible';

export type Sighting = {
  id: string;
  at: Vec;
  minutesAgo: number;
  confidence: SightingConfidence;
  note: string;
  reporter: string;
};

export type PredictionInput = {
  name: string;
  species: Species;
  size: BuildSize;
  temperament: Temperament;
  lastSeen: Vec;
  minutesSinceLastSeen: number;
  home: Vec;
  sightings: Sighting[];
  weather: Weather;
  timeOfDay: TimeOfDay;
  /**
   * What the free text in the report and the sightings said, as read by
   * `readReport`. Omitted means nothing was read and nothing changes.
   */
  cues?: ReadCues;
};

export type Cell = {
  x: number;
  y: number;
  /** Probability that the animal is in this cell. */
  p: number;
  /**
   * Share of the total probability held by this cell and every cell at least as
   * likely: 1 at the single most likely cell, falling towards 0 out in the tail.
   * Shading by this rather than by `p` keeps a diffuse field from washing the
   * whole map in the top colour, and makes two maps comparable.
   */
  q: number;
};

export type Grid = {
  cells: Cell[];
  cols: number;
  rows: number;
  cellSize: number;
};

export type SearchZone = {
  id: string;
  rank: number;
  centre: Vec;
  radius: number;
  probability: number;
  terrain: TerrainKind;
  place: string;
  reason: string;
  advice: string;
};

export type Driver = { label: string; detail: string; weight: number };

export type Action = { when: string; text: string; urgency: 'now' | 'soon' | 'ongoing' };

export type Prediction = {
  grid: Grid;
  zones: SearchZone[];
  /** Radius from the anchor containing 50 / 80 / 95% of the probability mass. */
  rings: { p50: number; p80: number; p95: number };
  /** True when the likely range has outgrown the mapped area, so rings are clipped. */
  beyondMap: boolean;
  /** Where the model is reasoning outward from — the last confirmed position. */
  anchor: Vec;
  anchorLabel: string;
  effectiveMinutes: number;
  confidence: { level: 'low' | 'moderate' | 'high'; pct: number; note: string };
  drivers: Driver[];
  actions: Action[];
};

const CELL_SIZE = 25;
const COLS = Math.round(MAP_WIDTH / CELL_SIZE);
const ROWS = Math.round(MAP_HEIGHT / CELL_SIZE);

type SpeciesProfile = {
  /** Furthest an animal of this kind realistically gets from where it went missing. */
  maxRange: number;
  /** Minutes for the search radius to reach ~63% of its eventual size. */
  tau: number;
  /** Spread of the "gone to ground within sight of where it vanished" mode. */
  hideSigma: number;
  /** Baseline share of probability in that hiding mode. */
  hideWeight: number;
  /** How strongly this species navigates back towards home. */
  homing: number;
};

const SPECIES: Record<Species, SpeciesProfile> = {
  // Cats overwhelmingly go to ground close by — under a deck, in a shed, behind
  // a fence — and stay put, often for days, rather than travelling.
  cat: { maxRange: 340, tau: 330, hideSigma: 45, hideWeight: 0.64, homing: 0.55 },
  // Dogs keep moving, and a frightened one can cover kilometres in an hour.
  dog: { maxRange: 2400, tau: 140, hideSigma: 150, hideWeight: 0.2, homing: 1 },
};

const SIZE_RANGE: Record<BuildSize, number> = { small: 0.62, medium: 1, large: 1.32 };

const TEMPERAMENT: Record<Temperament, { range: number; hide: number; note: string }> = {
  // A confident animal approaches people, so it tends to be picked up early and close.
  friendly: { range: 0.72, hide: 0.5, note: 'approaches people, so is often picked up early' },
  shy: { range: 1, hide: 1, note: 'keeps its distance but does not bolt' },
  // A panicking animal runs first and hides hardest — the two effects compound.
  skittish: { range: 1.55, hide: 1.42, note: 'bolts when approached, so travels further and hides harder' },
};

const WEATHER: Record<Weather, { range: number; hide: number; cover: number; note: string }> = {
  clear: { range: 1, hide: 1, cover: 1, note: '' },
  rain: { range: 0.74, hide: 1.28, cover: 1.45, note: 'rain pushes animals under cover and shortens how far they roam' },
  cold: { range: 0.82, hide: 1.22, cover: 1.35, note: 'cold drives them towards warm, sheltered spots' },
  hot: { range: 0.86, hide: 1.1, cover: 1.2, note: 'heat pulls them towards shade and water' },
};

const TIME_OF_DAY: Record<TimeOfDay, Record<Species, number>> = {
  day: { cat: 0.85, dog: 1 },
  dusk: { cat: 1.2, dog: 1.1 },
  night: { cat: 1.15, dog: 0.82 },
};

/** How likely an animal is to settle in each kind of ground, before temperament weighting. */
const TERRAIN_FIT: Record<Species, Record<TerrainKind, number>> = {
  cat: {
    'dense-housing': 2.6, // decks, sheds, garages, crawl spaces — where cats are actually found
    woodland: 2.3,
    garden: 2.0,
    industrial: 1.4,
    park: 1.3,
    commercial: 0.85,
    open: 0.3,
  },
  dog: {
    park: 1.85,
    open: 1.5,
    woodland: 1.4,
    commercial: 1.2,
    'dense-housing': 1.0,
    garden: 1.0,
    industrial: 0.85,
  },
};

/** Odds of getting past each kind of barrier, per crossing. */
const PERMEABILITY: Record<BarrierKind, Record<Species, number>> = {
  'major-road': { cat: 0.28, dog: 0.44 },
  rail: { cat: 0.55, dog: 0.6 },
  creek: { cat: 0.12, dog: 0.45 },
};

const CONFIDENCE_WEIGHT: Record<SightingConfidence, number> = {
  confirmed: 1,
  likely: 0.62,
  possible: 0.3,
};

export function predict(input: PredictionInput): Prediction {
  const profile = SPECIES[input.species];
  const temperament = TEMPERAMENT[input.temperament];
  const weather = WEATHER[input.weather];
  const cues = input.cues ?? NO_CUES;

  // A recent, credible sighting is a better starting point than the original
  // last-seen report, so the model re-anchors on it and restarts the clock.
  const anchorSighting = pickAnchorSighting(input.sightings);
  const anchor = anchorSighting ? anchorSighting.at : input.lastSeen;
  const effectiveMinutes = anchorSighting ? anchorSighting.minutesAgo : input.minutesSinceLastSeen;

  const sizeFactor = input.species === 'dog' ? SIZE_RANGE[input.size] : 1;
  const activity = TIME_OF_DAY[input.timeOfDay][input.species];
  const maxRange =
    profile.maxRange * sizeFactor * temperament.range * weather.range * activity * cues.mobility;

  // Displacement grows quickly at first and then flattens off as the animal
  // tires and settles, rather than running away forever.
  const reach = maxRange * (1 - Math.exp(-effectiveMinutes / profile.tau));
  // Rayleigh scale: the mean of the distribution is scale * sqrt(pi/2).
  const scale = Math.max(20, reach / 1.2533);

  const hideWeight = clamp(
    profile.hideWeight * temperament.hide * weather.hide * cues.hiding,
    0.05,
    0.85,
  );
  const hideSigma = profile.hideSigma * (input.species === 'cat' ? 1 : sizeFactor);
  // A frightened animal is pulled into cover much harder than a bold one.
  const coverPull = 0.55 + 0.95 * hideWeight;

  // Hunger and thirst build over hours, and homing instinct surfaces once the
  // initial panic burns off.
  const need = clamp(effectiveMinutes / 600, 0, 1.15);
  const homeWeight = profile.homing * clamp(effectiveMinutes / 720, 0.12, 1) * 1.1;

  const cells: Cell[] = [];
  let total = 0;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const p: Vec = {
        x: MAP_MIN_X + (col + 0.5) * CELL_SIZE,
        y: MAP_MIN_Y + (row + 0.5) * CELL_SIZE,
      };

      const d = distance(anchor, p);

      // 1. Dispersal — a mixture of "gone to ground nearby" and "kept moving".
      const hiding = Math.exp(-(d * d) / (2 * hideSigma * hideSigma));
      const roaming = (d / (scale * scale)) * Math.exp(-(d * d) / (2 * scale * scale)) * scale;
      let value = hideWeight * hiding + (1 - hideWeight) * roaming;

      // 2. Terrain — would it stop somewhere like this?
      const kind = terrainAt(p);
      // The text can point at particular ground — "into the thicket", "under a deck".
      const fit = TERRAIN_FIT[input.species][kind] * (cues.terrainBias[kind] ?? 1);
      const coverBoost = kind === 'woodland' || kind === 'dense-housing' || kind === 'industrial'
        ? weather.cover
        : 1;
      value *= (1 + coverPull * (fit - 1)) * coverBoost;

      // Open water is not somewhere a cat or dog ends up.
      const creek = BARRIERS.find((b) => b.kind === 'creek');
      if (creek && distanceToPath(p, creek.path) < 12) {
        value *= input.species === 'cat' ? 0.05 : 0.3;
      }

      // 3. Barriers — discount for everything it had to cross to get here.
      // A report saying it is already across a road beats the prior that says
      // it probably is not, so the road penalty is softened rather than dropped.
      for (const barrier of BARRIERS) {
        const n = crossingsOf(anchor, p, barrier);
        if (n === 0) continue;
        const base = PERMEABILITY[barrier.kind][input.species];
        const permeability =
          cues.crossedRoad && barrier.kind === 'major-road' ? Math.min(0.9, base + 0.5) : base;
        value *= Math.pow(permeability, n);
      }

      // 4. Attractors — food, water, cover, and the pull of home.
      let pull = 1;
      for (const a of ATTRACTORS) {
        const da = distance(a.at, p);
        const scaled = a.kind === 'shelter' ? a.strength * coverPull : a.strength * need;
        pull += scaled * Math.exp(-(da * da) / (2 * a.reach * a.reach));
      }
      const dHome = distance(input.home, p);
      pull += homeWeight * Math.exp(-(dHome * dHome) / (2 * 120 * 120));

      // Places the text named by name.
      for (const place of cues.places) {
        const dp = distance(place.at, p);
        pull += 1.1 * Math.exp(-(dp * dp) / (2 * 100 * 100));
      }
      value *= pull;

      // A stated direction of travel is strong evidence, so it lifts the ground
      // ahead and damps the ground behind — without cutting either off, because
      // animals turn and reports are approximate.
      if (cues.heading && d > 35) {
        const along = ((p.x - anchor.x) * cues.heading.x + (p.y - anchor.y) * cues.heading.y) / d;
        value *= along >= 0 ? 1 + 2.2 * along * along : 1 - 0.5 * along * along;
      }

      // 5. Sightings — the strongest evidence there is.
      for (const s of input.sightings) {
        const w = CONFIDENCE_WEIGHT[s.confidence] * Math.exp(-s.minutesAgo / 240);
        const ds = distance(s.at, p);
        value *= 1 + 4 * w * Math.exp(-(ds * ds) / (2 * 70 * 70));
      }

      value = Math.max(value, 1e-9);
      cells.push({ x: p.x, y: p.y, p: value, q: 0 });
      total += value;
    }
  }

  for (const cell of cells) cell.p /= total;
  assignQuantiles(cells);

  const grid: Grid = { cells, cols: COLS, rows: ROWS, cellSize: CELL_SIZE };
  const zones = extractZones(grid, input);
  const rings = containmentRings(cells, anchor);
  const confidence = scoreConfidence(input, effectiveMinutes, zones);
  const drivers = describeDrivers(input, {
    cues,
    reach,
    hideWeight,
    effectiveMinutes,
    temperamentNote: temperament.note,
    weatherNote: weather.note,
    anchoredOnSighting: Boolean(anchorSighting),
  });
  const actions = recommendActions(input, effectiveMinutes, zones, rings);

  return {
    grid,
    zones,
    rings,
    beyondMap: reach > MAP_HEIGHT / 2,
    anchor,
    anchorLabel: anchorSighting
      ? `Last credible sighting, ${formatAge(anchorSighting.minutesAgo)}`
      : `Last seen, ${formatAge(input.minutesSinceLastSeen)}`,
    effectiveMinutes,
    confidence,
    drivers,
    actions,
  };
}

/** Cumulative-mass rank per cell, best first. See `Cell.q`. */
function assignQuantiles(cells: Cell[]): void {
  const order = cells.map((cell, index) => ({ index, p: cell.p })).sort((a, b) => b.p - a.p);
  let cumulative = 0;
  for (const item of order) {
    cells[item.index].q = 1 - cumulative;
    cumulative += item.p;
  }
}

function pickAnchorSighting(sightings: Sighting[]): Sighting | null {
  const usable = sightings
    .filter((s) => s.confidence !== 'possible' && s.minutesAgo < 360)
    .sort((a, b) => a.minutesAgo - b.minutesAgo);
  return usable[0] ?? null;
}

/**
 * Pull the highest-probability clusters out of the field by repeatedly taking
 * the best remaining cell and claiming everything within a search radius of it.
 */
function extractZones(grid: Grid, input: PredictionInput): SearchZone[] {
  const radius = input.species === 'cat' ? 70 : 110;
  const claimed = new Set<number>();
  const zones: SearchZone[] = [];
  const order = grid.cells
    .map((cell, index) => ({ cell, index }))
    .sort((a, b) => b.cell.p - a.cell.p);

  for (const { cell, index } of order) {
    if (zones.length >= 5) break;
    if (claimed.has(index)) continue;

    let mass = 0;
    let cx = 0;
    let cy = 0;
    grid.cells.forEach((other, otherIndex) => {
      if (claimed.has(otherIndex)) return;
      if (Math.hypot(other.x - cell.x, other.y - cell.y) > radius) return;
      claimed.add(otherIndex);
      mass += other.p;
      cx += other.x * other.p;
      cy += other.y * other.p;
    });

    if (mass < 0.012) continue;
    const centre = { x: cx / mass, y: cy / mass };
    const kind = terrainAt(centre);
    const zone = zoneAt(centre);
    const landmark = nearestLandmark(centre);

    zones.push({
      id: 'pending',
      rank: 0,
      centre,
      radius,
      probability: mass,
      terrain: kind,
      place: zone ? zone.name : `${landmark.metres} m from ${landmark.name}`,
      reason: zoneReason(centre, kind, input),
      advice: zoneAdvice(kind, input),
    });
  }

  // Peaks are found sharpest-first, but a broad plateau can hold more total
  // probability than a sharp spike. Rank by the mass actually in each zone.
  return zones
    .sort((a, b) => b.probability - a.probability)
    .map((zone, index) => ({ ...zone, rank: index + 1, id: `zone-${index + 1}` }));
}

function zoneReason(centre: Vec, kind: TerrainKind, input: PredictionInput): string {
  const bits: string[] = [];
  const nearAttractor = ATTRACTORS.map((a) => ({ a, d: distance(a.at, centre) }))
    .filter((x) => x.d < x.a.reach * 1.2)
    .sort((x, y) => x.d - y.d)[0];

  if (input.species === 'cat' && (kind === 'dense-housing' || kind === 'woodland')) {
    bits.push('dense cover at ground level, which is where cats settle');
  } else if (input.species === 'dog' && (kind === 'park' || kind === 'open')) {
    bits.push('open running ground a loose dog moves through quickly');
  } else if (kind === 'industrial') {
    bits.push('quiet, sheltered structures with few people');
  } else if (kind === 'garden') {
    bits.push('cover and food waste close together');
  }

  if (nearAttractor) bits.push(`${Math.round(nearAttractor.d)} m from ${nearAttractor.a.name.toLowerCase()}`);

  const crossings = BARRIERS.filter((b) => crossingsOf(input.lastSeen, centre, b) > 0);
  if (crossings.length === 0) {
    bits.push('reachable without crossing a road or the creek');
  } else {
    bits.push(`reached only by crossing ${crossings.map((b) => b.name).join(' and ')}`);
  }

  return bits.join('; ');
}

function zoneAdvice(kind: TerrainKind, input: PredictionInput): string {
  if (input.species === 'cat') {
    if (kind === 'dense-housing') {
      return 'Ask to check under decks, in sheds and open garages. Use a torch at ground level — look for eyeshine, not movement.';
    }
    if (kind === 'woodland' || kind === 'garden') {
      return 'Walk the edges slowly at dusk, stop often and listen. Leave a worn piece of your clothing and an open litter tray to hold the scent.';
    }
    return 'Move quietly, sit still for ten minutes at a time and call softly. Chasing will push her further out.';
  }
  if (kind === 'park' || kind === 'open') {
    return 'Cover this on foot with someone he knows. Crouch, turn side-on and call calmly — running towards him will start a chase.';
  }
  if (kind === 'industrial') {
    return 'Ask the yard to let a small group walk the perimeter. Check under loading docks, trailers and parked vehicles.';
  }
  return 'Door-knock this block and ask people to check garages and back gardens, then leave a flyer with your number.';
}

/** Radius from the anchor containing a given share of the probability mass. */
function containmentRings(cells: Cell[], anchor: Vec): { p50: number; p80: number; p95: number } {
  const byDistance = cells
    .map((c) => ({ d: distance(anchor, c), p: c.p }))
    .sort((a, b) => a.d - b.d);

  const radii: Record<string, number> = {};
  let cumulative = 0;
  const targets: [string, number][] = [['p50', 0.5], ['p80', 0.8], ['p95', 0.95]];
  let ti = 0;
  for (const item of byDistance) {
    cumulative += item.p;
    while (ti < targets.length && cumulative >= targets[ti][1]) {
      radii[targets[ti][0]] = item.d;
      ti += 1;
    }
    if (ti >= targets.length) break;
  }

  return {
    p50: Math.round(radii.p50 ?? 0),
    p80: Math.round(radii.p80 ?? 0),
    p95: Math.round(radii.p95 ?? 0),
  };
}

function scoreConfidence(
  input: PredictionInput,
  effectiveMinutes: number,
  zones: SearchZone[],
): Prediction['confidence'] {
  let score = 0.34;
  for (const s of input.sightings) {
    score += CONFIDENCE_WEIGHT[s.confidence] * Math.exp(-s.minutesAgo / 300) * 0.3;
  }
  // The longer the trail goes cold, the less any single spot can be trusted.
  score -= clamp(effectiveMinutes / 2400, 0, 0.22);
  // A field with one clear peak is more actionable than one smeared across the map.
  if (zones.length > 0) score += clamp(zones[0].probability - 0.16, -0.05, 0.16);
  score = clamp(score, 0.08, 0.94);

  const level: 'low' | 'moderate' | 'high' = score >= 0.65 ? 'high' : score >= 0.4 ? 'moderate' : 'low';
  const note =
    level === 'high'
      ? 'Recent sightings agree with each other, so the top zone is worth committing people to.'
      : level === 'moderate'
        ? 'Enough to prioritise, but send a second pair of eyes to zone two as well.'
        : 'Thin evidence so far. The map is behaviour and terrain only — one confirmed sighting will sharpen it sharply.';

  return { level, pct: Math.round(score * 100), note };
}

function describeDrivers(
  input: PredictionInput,
  ctx: {
    cues: ReadCues;
    reach: number;
    hideWeight: number;
    effectiveMinutes: number;
    temperamentNote: string;
    weatherNote: string;
    anchoredOnSighting: boolean;
  },
): Driver[] {
  const drivers: Driver[] = [];

  drivers.push({
    label: input.species === 'cat' ? 'Cats stay close' : 'Dogs cover ground',
    detail:
      input.species === 'cat'
        ? `Most lost cats are found within a few hundred metres, hidden and silent. After ${formatAge(ctx.effectiveMinutes)} the likely spread is about ${Math.round(ctx.reach)} m.`
        : `A loose dog keeps moving. After ${formatAge(ctx.effectiveMinutes)} the likely spread is about ${Math.round(ctx.reach)} m.`,
    weight: 1,
  });

  drivers.push({
    label: `Temperament: ${input.temperament}`,
    detail: `${input.name} ${ctx.temperamentNote}. About ${Math.round(ctx.hideWeight * 100)}% of the probability sits in the "gone to ground and staying put" pattern.`,
    weight: 0.85,
  });

  if (ctx.weatherNote) {
    drivers.push({ label: 'Weather', detail: capitalise(ctx.weatherNote) + '.', weight: 0.6 });
  }

  const roads = BARRIERS.filter((b) => b.kind !== 'creek').map((b) => b.name);
  drivers.push({
    label: 'Barriers',
    detail: `${roads.join(' and ')} and North Creek all cut the search area. Ground on the far side of them is heavily discounted — a ${input.species} rarely crosses a busy road under stress.`,
    weight: 0.75,
  });

  if (ctx.anchoredOnSighting) {
    drivers.push({
      label: 'Re-anchored on a sighting',
      detail: 'The map is now measured from the most recent credible sighting rather than the original report, and the clock restarted from there.',
      weight: 0.95,
    });
  } else if (input.sightings.length === 0) {
    drivers.push({
      label: 'No sightings yet',
      detail: 'Nothing has been reported, so this is behaviour and terrain only. The first confirmed sighting will redraw the map.',
      weight: 0.5,
    });
  }

  if (ctx.cues.cues.length > 0) {
    drivers.push({
      label: 'Read from what people wrote',
      detail: `${ctx.cues.cues.map((c) => `"${c.matched}" — ${c.effect}`).join('; ')}.`,
      weight: 0.98,
    });
  }

  const need = clamp(ctx.effectiveMinutes / 600, 0, 1.15);
  if (need > 0.35) {
    drivers.push({
      label: 'Hunger and thirst',
      detail: 'Long enough out that food and water sources now pull noticeably — bin alleys, compost and the creek shallows are weighted up.',
      weight: 0.55,
    });
  }

  return drivers.sort((a, b) => b.weight - a.weight);
}

function recommendActions(
  input: PredictionInput,
  effectiveMinutes: number,
  zones: SearchZone[],
  rings: { p50: number; p80: number; p95: number },
): Action[] {
  const actions: Action[] = [];
  const top = zones[0];

  if (top) {
    actions.push({
      when: 'Right now',
      text: `Send your first pair to ${top.place} — ${Math.round(top.probability * 100)}% of the likelihood sits in that one zone.`,
      urgency: 'now',
    });
  }

  actions.push({
    when: 'Right now',
    text: `Leave ${input.name}'s bed or a worn t-shirt and an open food tin at the last confirmed spot. Scent brings animals back to a point far more reliably than calling does.`,
    urgency: 'now',
  });

  if (input.species === 'cat') {
    actions.push({
      when: 'Tonight',
      text: 'Search again between midnight and 4am when it is quiet. Torch at ankle height, sweeping slowly — you are looking for eyeshine under decks and cars.',
      urgency: 'soon',
    });
  } else {
    actions.push({
      when: 'Next hour',
      text: 'Post the description to the neighbourhood feed and ask people not to call or chase him. A chased dog can double this search radius in twenty minutes.',
      urgency: 'now',
    });
  }

  actions.push({
    when: 'Next two hours',
    text: `Door-knock the ${rings.p80} m ring and ask people to check garages, sheds and back gardens. Most animals are found inside somewhere a neighbour had not thought to open.`,
    urgency: 'soon',
  });

  if (effectiveMinutes > 240) {
    actions.push({
      when: 'Today',
      text: 'Call the shelters and vets on the Adopt & Shelters page and file a found-report match. Ring again tomorrow — intake lists move faster than anyone updates them.',
      urgency: 'ongoing',
    });
  }

  actions.push({
    when: 'Ongoing',
    text: 'Every new sighting sharpens this map. Log even uncertain ones — the model weights them by how sure the reporter is.',
    urgency: 'ongoing',
  });

  return actions;
}

export function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round(minutes - h * 60);
    return m >= 5 ? `${h} hr ${m} min ago` : `${h} hr ago`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Highest probability in the field. */
export function peakProbability(grid: Grid): number {
  return grid.cells.reduce((max, c) => (c.p > max ? c.p : max), 0);
}
