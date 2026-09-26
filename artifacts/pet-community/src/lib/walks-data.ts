/**
 * Neighbourhood walking routes.
 *
 * The card stays a picture and a name. Everything factual — surface, climb,
 * shade, water, off-leash, how busy it gets, the stops along the way, the
 * warnings, parking, what neighbours have said — opens when you click, so the
 * grid reads as three places rather than three spreadsheets.
 */

export type Busyness = 'quiet' | 'steady' | 'busy';

export type BusySlot = {
  /** A short label for the window, e.g. "Early". */
  label: string;
  level: Busyness;
};

export type WalkStop = {
  /** How far in, e.g. "0.0 km". */
  at: string;
  name: string;
  note: string;
};

export type NeighbourNote = {
  by: string;
  text: string;
};

import type { SceneKind } from '@/components/walk-scene';

export type Walk = {
  id: string;
  /** Which drawn scene heads the card — the fallback if the photo will not load. */
  scene: SceneKind;
  /** A photograph of the route. */
  photo?: string;
  name: string;
  neighborhood: string;
  distance: string;
  duration: string;
  level: string;
  description: string;
  /** The time of day the route is at its best. */
  best: string;
  /** Neighbours out on it right now. */
  active: number;

  // --- at a glance, shown on the card ---
  surface: string;
  climb: string;
  shade: string;
  /** Somewhere to drink, for either of you. */
  water: string;
  offLeash: string;
  /** Roughly how busy it gets across the day. */
  busy: BusySlot[];
  /** Short, scannable: who this route suits. */
  suits: string[];

  // --- behind a click ---
  stops: WalkStop[];
  headsUp: string[];
  parking: string;
  accessibility: string;
  notes: NeighbourNote[];

  saved?: boolean;
};

export const defaultWalks: Walk[] = [
  {
    id: 'w1',
    scene: 'creek',
    photo: '1663185777535-86bf6a489607',
    name: 'Creekside Loop',
    neighborhood: 'North Creek',
    distance: '2.8 km',
    duration: '35 min',
    level: 'Easy',
    description:
      'A shady, mostly flat loop beside the creek with three wide spots for off-leash play. The south gate can get muddy after rain.',
    best: 'Early morning',
    active: 4,

    surface: 'Packed gravel, one boardwalk stretch',
    climb: 'Flat — about 14 m total',
    shade: 'Shaded most of the way',
    water: 'Two fountains, creek access throughout',
    offLeash: 'Three fenced clearings',
    busy: [
      { label: 'Early', level: 'quiet' },
      { label: 'Midday', level: 'steady' },
      { label: 'Evening', level: 'busy' },
    ],
    suits: ['Older dogs', 'Puppies', 'Swimmers', 'Strollers'],

    stops: [
      { at: '0.0 km', name: 'North Creek trailhead', note: 'Bag dispenser and the first fountain are right at the gate.' },
      { at: '0.6 km', name: 'The wide bend', note: 'First off-leash clearing. Good sightlines, fenced on three sides.' },
      { at: '1.4 km', name: 'Boardwalk', note: 'Narrow — 90 seconds of single file. Slippery in the first frost.' },
      { at: '2.1 km', name: 'Willow bank', note: 'Shallow entry to the water. Where most dogs decide to swim.' },
      { at: '2.8 km', name: 'South gate', note: 'Back to the start. The mud sits here after rain.' },
    ],
    headsUp: [
      'The south gate turns to deep mud for a day or two after heavy rain.',
      'Cyclists use the boardwalk as a shortcut between 5 and 6.',
      'Goose family nests on the willow bank through spring — give them the far side.',
    ],
    parking: 'Free roadside along North Creek Road; fills by 8 on weekends.',
    accessibility: 'Step-free the whole way. The boardwalk is 1.2 m wide — passable but tight for two.',
    notes: [
      { by: 'Maya C.', text: 'Take it anticlockwise. You get the shade on the way out and the sun coming back.' },
      { by: 'Theo A.', text: 'Basil learned to swim at the willow bank. Bring a towel — the car will thank you.' },
    ],
  },
  {
    id: 'w2',
    scene: 'park',
    photo: '1686470590549-5180acd912ec',
    name: 'Maple Park Circuit',
    neighborhood: 'Maple Park',
    distance: '1.6 km',
    duration: '20 min',
    level: 'Easy',
    description:
      'A bright neighborhood circuit past the community garden and two water fountains. Great for a quick hello-heavy walk.',
    best: 'Lunch break',
    active: 7,

    surface: 'Paved path, one cobbled block',
    climb: 'Flat — about 6 m total',
    shade: 'Open and sunny; little shade at midday',
    water: 'Two fountains with low bowls',
    offLeash: 'None — leashed throughout',
    busy: [
      { label: 'Early', level: 'steady' },
      { label: 'Midday', level: 'busy' },
      { label: 'Evening', level: 'steady' },
    ],
    suits: ['Short legs', 'Wheelchairs', 'Sociable dogs', 'Quick loops'],

    stops: [
      { at: '0.0 km', name: 'North gate', note: 'Benches and the first fountain. The usual meeting spot.' },
      { at: '0.4 km', name: 'Community garden', note: 'Dogs stay on the path side. Gate is often propped open.' },
      { at: '0.9 km', name: 'Cobbled block', note: 'Sixty metres of uneven stone. Rough on soft paws.' },
      { at: '1.6 km', name: 'Back to the north gate', note: 'Second fountain and shade under the maples.' },
    ],
    headsUp: [
      'The cobbled block is hard going for small paws and stroller wheels alike.',
      'Sun-trap at midday — the path itself gets hot enough to matter in summer.',
      'Saturday market takes the north gate over until about eleven.',
    ],
    parking: 'Maple Park lot, free for two hours.',
    accessibility: 'Fully step-free and wide, apart from the cobbled block, which has a paved bypass on the garden side.',
    notes: [
      { by: 'Nora W.', text: 'The most hellos per minute of anywhere around here. Not the walk for a nervous dog.' },
      { by: 'Priya R.', text: 'Skip the cobbles in summer — hot stone. The garden-side bypass is shaded.' },
    ],
  },
  {
    id: 'w3',
    scene: 'ridge',
    photo: '1788432215849-98752641f650',
    name: 'Hilltop Lookout',
    neighborhood: 'East Ridge',
    distance: '4.2 km',
    duration: '55 min',
    level: 'Rolling',
    description:
      'A steady climb rewarded with a wide view over the neighborhood. Bring water; the last fountain is at the lower trailhead.',
    best: 'Golden hour',
    active: 2,

    surface: 'Dirt trail, loose stone near the top',
    climb: 'Steady — about 120 m of climb',
    shade: 'Shaded to the halfway bench, open above it',
    water: 'None past the trailhead — carry your own',
    offLeash: 'Upper meadow only, when the gate is shut',
    busy: [
      { label: 'Early', level: 'quiet' },
      { label: 'Midday', level: 'quiet' },
      { label: 'Evening', level: 'steady' },
    ],
    suits: ['Fit dogs', 'Long legs', 'A view', 'Quiet'],

    stops: [
      { at: '0.0 km', name: 'Lower trailhead', note: 'Last fountain and the last bin. Fill up here.' },
      { at: '1.1 km', name: 'Halfway bench', note: 'Shade ends about here. Good place to judge whether to carry on.' },
      { at: '2.4 km', name: 'Loose stone', note: 'Three hundred metres of scree. Slow and deliberate.' },
      { at: '3.0 km', name: 'The lookout', note: 'The view, and the upper meadow gate for off-leash.' },
      { at: '4.2 km', name: 'Back down', note: 'Same way. The descent is harder on knees than the climb.' },
    ],
    headsUp: [
      'No water past the trailhead. In summer that matters more than the climb does.',
      'The scree section is genuinely slippery in the wet — worth turning back.',
      'Dark comes early under the ridge. Bring a light if you go for golden hour.',
    ],
    parking: 'Small lot at the lower trailhead, eight spaces. Street parking on Ridge Way otherwise.',
    accessibility: 'Not step-free. Uneven trail throughout and a scree section near the top.',
    notes: [
      { by: 'Maya C.', text: 'Go up for sunset, come down in the light you have left. Do not linger at the top.' },
      { by: 'Sam O.', text: 'My spaniel is wrecked for the rest of the day after this one, in the best way.' },
    ],
  },
];

export const BUSY_LABEL: Record<Busyness, string> = {
  quiet: 'Quiet',
  steady: 'Steady',
  busy: 'Busy',
};

/** How many bars of three to fill for a busyness level. */
export function busyBars(level: Busyness): number {
  return level === 'quiet' ? 1 : level === 'steady' ? 2 : 3;
}
