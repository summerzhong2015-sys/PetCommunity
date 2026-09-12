/**
 * Reads the free text people actually write — the report, and each sighting —
 * and pulls out the few things that change where an animal is likely to be.
 *
 * This is lexical, not a language model: a curated vocabulary of the phrases
 * owners and neighbours really use, matched on word boundaries. That matters
 * for how it is presented — every cue it finds is returned with the words that
 * produced it and a plain statement of what it changed, so the map can show its
 * reading rather than asking to be trusted. Nothing is inferred silently, and
 * text it does not recognise simply has no effect.
 *
 * Deterministic and side-effect free, so it can be tested directly.
 */

import { LANDMARKS, type TerrainKind, type Vec } from './neighborhood-map.ts';

export type CueKind = 'behaviour' | 'condition' | 'direction' | 'terrain' | 'place' | 'crossing';

export type Cue = {
  kind: CueKind;
  /** The words in the text that produced this cue. */
  matched: string;
  /** What it changed, in plain language, for the reader. */
  effect: string;
};

export type ReadCues = {
  cues: Cue[];
  /** Multiplier on how far the animal roams. 1 is no change. */
  mobility: number;
  /** Multiplier on how strongly it goes to ground. 1 is no change. */
  hiding: number;
  /** Unit vector it was said to be heading, if a direction was given. */
  heading: Vec | null;
  /** Per-terrain multipliers, for ground the text points at. */
  terrainBias: Partial<Record<TerrainKind, number>>;
  /** Landmarks named in the text. */
  places: { name: string; at: Vec }[];
  /** Set when the text says it got across a road, which the model otherwise treats as unlikely. */
  crossedRoad: boolean;
};

export const NO_CUES: ReadCues = {
  cues: [],
  mobility: 1,
  hiding: 1,
  heading: null,
  terrainBias: {},
  places: [],
  crossedRoad: false,
};

type Rule = {
  /** Alternatives, matched whole-word and case-insensitively. */
  any: string[];
  kind: CueKind;
  mobility?: number;
  hiding?: number;
  terrain?: Partial<Record<TerrainKind, number>>;
  crossedRoad?: boolean;
  effect: string;
};

/**
 * The vocabulary. Phrases are the ones that actually turn up in lost-pet
 * reports; each carries the smallest change that is defensible.
 */
const RULES: Rule[] = [
  // How it left — the single biggest influence on how far it got.
  {
    any: ['bolted', 'bolts', 'bolting', 'bolt', 'ran off', 'runs off', 'run off', 'ran away', 'runs away', 'took off', 'takes off', 'darted', 'darts', 'fled', 'flees', 'sprinted', 'legged it', 'shot off'],
    kind: 'behaviour', mobility: 1.4, hiding: 1.1,
    effect: 'left at speed, so the search area is wider',
  },
  {
    any: ['spooked', 'spooks', 'panicked', 'panics', 'panicking', 'terrified', 'frightened off', 'startled', 'startles'],
    kind: 'behaviour', mobility: 1.3, hiding: 1.25,
    effect: 'frightened, so travels further and hides harder',
  },
  {
    any: ['chased', 'chases', 'chasing', 'someone chased', 'kids chased', 'being chased'],
    kind: 'behaviour', mobility: 1.45,
    effect: 'was chased, which pushes an animal much further out',
  },
  {
    any: ['friendly', 'came to me', 'came right up', 'wagging', 'let me pet', 'let me stroke', 'approachable', 'sociable', 'came over'],
    kind: 'behaviour', mobility: 0.75, hiding: 0.65,
    effect: 'approaches people, so is usually picked up close by',
  },
  {
    any: ['shy', 'timid', 'nervous', 'wary', 'skittish', 'scared', 'will not come', "won't come", 'does not come', "doesn't come"],
    kind: 'behaviour', hiding: 1.25,
    effect: 'keeps away from people, so more likely to be hiding than walking',
  },
  {
    any: ['hiding', 'hides', 'hid', 'tucked', 'curled up', 'under a car', 'under the deck', 'under a deck', 'in a bush', 'went to ground'],
    kind: 'behaviour', hiding: 1.4,
    terrain: { 'dense-housing': 1.5, woodland: 1.3 },
    effect: 'already gone to ground, so cover is weighted up',
  },

  {
    any: ['food motivated', 'food-motivated', 'greedy', 'always hungry', 'will do anything for food', 'loves food'],
    kind: 'behaviour', mobility: 0.85,
    terrain: { commercial: 1.3, garden: 1.3 },
    effect: 'food-motivated, so bins, compost and a tin left out draw them in',
  },

  // Condition — an animal that cannot move far has not moved far.
  {
    any: ['limping', 'limped', 'limps', 'limp', 'injured', 'hurt', 'bleeding', 'lame', 'sore', 'broken leg', 'hit by a car', 'unwell', 'sick'],
    kind: 'condition', mobility: 0.45, hiding: 1.3,
    effect: 'hurt, so cannot have got far and will be tucked out of sight',
  },
  {
    any: ['elderly', 'arthritic', 'very old', 'deaf', 'blind', 'poor sight', 'poor hearing'],
    kind: 'condition', mobility: 0.6,
    effect: 'limited mobility or senses, so a much tighter radius',
  },
  {
    any: ['puppy', 'kitten', 'very young'],
    kind: 'condition', mobility: 0.5, hiding: 1.2,
    effect: 'very young, so short range and quick to hide',
  },
  {
    any: ['pregnant', 'nursing', 'heavily pregnant'],
    kind: 'condition', mobility: 0.55, hiding: 1.35,
    effect: 'will be looking for somewhere enclosed and quiet, close by',
  },

  // Ground it was heading into.
  {
    any: ['thicket', 'woods', 'wood', 'trees', 'bushes', 'bush', 'hedge', 'undergrowth', 'brambles', 'scrub', 'forest'],
    kind: 'terrain', terrain: { woodland: 1.8 },
    effect: 'wooded cover is weighted up',
  },
  {
    any: ['park', 'field', 'meadow', 'green', 'playing field', 'lawn', 'open ground'],
    kind: 'terrain', terrain: { park: 1.6, open: 1.4 },
    effect: 'open parkland is weighted up',
  },
  {
    any: ['garden', 'allotment', 'compost', 'greenhouse', 'vegetable patch'],
    kind: 'terrain', terrain: { garden: 1.7 },
    effect: 'gardens and allotments are weighted up',
  },
  {
    any: ['garage', 'shed', 'deck', 'porch', 'crawl space', 'under the house', 'driveway', 'alley', 'back yard', 'backyard', 'houses', 'gardens'],
    kind: 'terrain', terrain: { 'dense-housing': 1.7 },
    effect: 'sheds, decks and garages are weighted up',
  },
  {
    any: ['depot', 'yard', 'industrial', 'warehouse', 'loading bay', 'containers', 'lorries', 'trucks'],
    kind: 'terrain', terrain: { industrial: 1.7 },
    effect: 'the depot and industrial ground are weighted up',
  },
  {
    any: ['shops', 'courtyard', 'cafe', 'café', 'bins', 'restaurant', 'car park', 'parking'],
    kind: 'terrain', terrain: { commercial: 1.6 },
    effect: 'the parade and bin areas are weighted up',
  },
  {
    any: ['creek', 'river', 'stream', 'water', 'brook', 'canal'],
    kind: 'terrain', terrain: { woodland: 1.2 },
    effect: 'the creek line is weighted up',
  },

  // Roads. The model treats a crossing as unlikely; a report that says it
  // happened is evidence that beats the prior.
  {
    any: ['crossed the road', 'crossed the street', 'across the road', 'over the road', 'crossed ridge road', 'other side of the road'],
    kind: 'crossing', crossedRoad: true,
    effect: 'already across a road, so ground beyond it is no longer discounted',
  },
];

const DIRECTIONS: { any: string[]; vector: Vec; name: string }[] = [
  { any: ['north', 'northward', 'northwards', 'uphill'], vector: { x: 0, y: 1 }, name: 'north' },
  { any: ['south', 'southward', 'southwards', 'downhill'], vector: { x: 0, y: -1 }, name: 'south' },
  { any: ['east', 'eastward', 'eastwards'], vector: { x: 1, y: 0 }, name: 'east' },
  { any: ['west', 'westward', 'westwards'], vector: { x: -1, y: 0 }, name: 'west' },
  { any: ['north east', 'northeast', 'north-east'], vector: { x: 0.707, y: 0.707 }, name: 'north-east' },
  { any: ['north west', 'northwest', 'north-west'], vector: { x: -0.707, y: 0.707 }, name: 'north-west' },
  { any: ['south east', 'southeast', 'south-east'], vector: { x: 0.707, y: -0.707 }, name: 'south-east' },
  { any: ['south west', 'southwest', 'south-west'], vector: { x: -0.707, y: -0.707 }, name: 'south-west' },
];

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const NEGATORS = [
  'do not', "don't", 'dont', 'does not', "doesn't", 'did not', "didn't",
  'never', 'avoid', 'please do not', 'please avoid', 'will not', "won't",
  'cannot', "can't", 'no need to', 'rather than', 'instead of', 'stop',
];

/**
 * True when the words just before a match turn it into an instruction or a
 * denial. Reports routinely say "please do not chase" and "he will not come",
 * and reading either as evidence would move the map the wrong way.
 */
function isNegated(haystack: string, index: number): boolean {
  const window = haystack.slice(Math.max(0, index - 28), index).toLowerCase();
  return NEGATORS.some((neg) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(neg)}[\\s\\p{L}]{0,12}$`, 'u').test(window));
}

/** Whole-word, case-insensitive. Multi-word phrases match across single spaces. */
function findPhrase(haystack: string, phrase: string): boolean {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(phrase).replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'giu');
  for (const match of haystack.matchAll(pattern)) {
    if (!isNegated(haystack, match.index ?? 0)) return true;
  }
  return false;
}

export function readReport(...texts: (string | undefined | null)[]): ReadCues {
  const text = texts.filter(Boolean).join('. ').trim();
  if (!text) return { ...NO_CUES, terrainBias: {}, places: [], cues: [] };

  const cues: Cue[] = [];
  let mobility = 1;
  let hiding = 1;
  let crossedRoad = false;
  const terrainBias: Partial<Record<TerrainKind, number>> = {};

  for (const rule of RULES) {
    const hit = rule.any.find((phrase) => findPhrase(text, phrase));
    if (!hit) continue;
    cues.push({ kind: rule.kind, matched: hit, effect: rule.effect });
    if (rule.mobility) mobility *= rule.mobility;
    if (rule.hiding) hiding *= rule.hiding;
    if (rule.crossedRoad) crossedRoad = true;
    for (const [kind, factor] of Object.entries(rule.terrain ?? {})) {
      const key = kind as TerrainKind;
      terrainBias[key] = (terrainBias[key] ?? 1) * (factor as number);
    }
  }

  // Direction of travel. "north east" and "north" both match the same text, so
  // the winner is the longest phrase that actually matched, not the first rule.
  let heading: Vec | null = null;
  const hits = DIRECTIONS.flatMap((dir) => {
    const matched = dir.any.filter((phrase) => findPhrase(text, phrase));
    return matched.length ? [{ dir, phrase: matched.sort((a, b) => b.length - a.length)[0] }] : [];
  }).sort((a, b) => b.phrase.length - a.phrase.length);

  if (hits.length > 0) {
    const { dir, phrase } = hits[0];
    heading = dir.vector;
    cues.push({
      kind: 'direction',
      matched: phrase,
      effect: `heading ${dir.name}, so the map leans that way`,
    });
  }

  // Named places. The landmark list is the app's own, so these are real points.
  const places: { name: string; at: Vec }[] = [];
  for (const landmark of LANDMARKS) {
    const words = landmark.name.replace(/^the /i, '');
    if (!findPhrase(text, words)) continue;
    places.push({ name: landmark.name, at: landmark.at });
    cues.push({
      kind: 'place',
      matched: words,
      effect: `${landmark.name} named, so that ground is weighted up`,
    });
  }

  // Two loud cues in the same direction should not compound without limit.
  mobility = Math.max(0.3, Math.min(2.2, mobility));
  hiding = Math.max(0.5, Math.min(2, hiding));

  return { cues, mobility, hiding, heading, terrainBias, places, crossedRoad };
}
