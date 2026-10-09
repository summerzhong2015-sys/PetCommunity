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
    name: 'The Nicomekl Loop',
    neighborhood: 'the Nicomekl trail',
    distance: '2.8 km',
    duration: '35 min',
    level: 'Easy',
    description:
      'Flat, shady and beside the water the whole way, with three clearings wide enough to let a dog off. After rain the south gate turns to proper mud, so wear the boots you do not mind.',
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
      { at: '0.0 km', name: 'Nicomekl trailhead', note: 'Bags and the first fountain are right at the gate. Fill up now, not later.' },
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
    parking: 'Free on the road by the trailhead. It is full by eight on a Saturday.',
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
    name: 'Old Yale Park Circuit',
    neighborhood: 'Old Yale Park',
    distance: '1.6 km',
    duration: '20 min',
    level: 'Easy',
    description:
      'The sociable one. A bright loop past the community garden with a fountain at either end — you will not get round it without talking to somebody.',
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
    parking: 'the Old Yale Park lot, free for two hours.',
    accessibility: 'Fully step-free and wide, apart from the cobbled block, which has a paved bypass on the garden side.',
    notes: [
      { by: 'Nora W.', text: 'The most hellos per minute of anywhere around here. Not the walk for a nervous dog.' },
      { by: 'Priya R.', text: 'Skip the cobbles in summer — hot stone. The garden-side bypass is shaded.' },
    ],
  },
  {
    id: 'w3',
    scene: 'park',
    photo: '1785611067420-0b043b8b2b7b',
    name: 'The W.C. Blair Fields',
    neighborhood: 'W.C. Blair Recreation Centre',
    distance: '2.4 km',
    duration: '30 min',
    level: 'Easy',
    description:
      'Twice round the playing fields behind the rec centre, which is as much space as anywhere round here gives you. Quiet on a weekday morning, and full of under-tens from four o\u2019clock.',
    best: 'Weekday mornings',
    active: 3,

    surface: 'Grass and a paved perimeter path',
    climb: 'Flat, give or take a drainage hump',
    shade: 'A row of firs down the east side; the rest is open',
    water: 'Fountain by the rec centre doors, on when the building is',
    offLeash: 'The far field before 9am, by long habit rather than by sign',
    busy: [
      { label: 'Early', level: 'quiet' },
      { label: 'Midday', level: 'steady' },
      { label: 'Evening', level: 'busy' },
    ],
    suits: ['Ball chasers', 'Recall practice', 'Big dogs', 'Rainy days'],

    stops: [
      { at: '0.0 km', name: 'Rec centre doors', note: 'Fountain and the only bin. Water bowl tucked round the side.' },
      { at: '0.5 km', name: 'The far field', note: 'Where everyone lets their dog off early on. Fenced on two sides, open to the car park on the third.' },
      { at: '1.2 km', name: 'The fir row', note: 'The only real shade. Worth the detour in July.' },
      { at: '2.4 km', name: 'Back round', note: 'Second lap if nobody is ready to go home.' },
    ],
    headsUp: [
      'Soccer takes both fields on Saturday mornings from about half eight.',
      'It drains badly at the north end \u2014 that corner is a bog for two days after heavy rain.',
      'The gap to the car park is wide open. Not the place for a dog whose recall is still a work in progress.',
    ],
    parking: 'The rec centre lot, free, and big enough except on swim-lesson evenings.',
    accessibility: 'The perimeter path is paved and step-free. The fields themselves are uneven and soft underfoot.',
    notes: [
      { by: 'Theo A.', text: 'Best thrown-ball space in Murrayville. Get there before the kids do.' },
      { by: 'Nora W.', text: 'Penny will not cross the wet corner, so we go clockwise all winter.' },
    ],
  },
  {
    id: 'w4',
    scene: 'park',
    photo: '1770910230325-190f06dcd4ee',
    name: 'The School Run',
    neighborhood: 'James Hill Park',
    distance: '1.2 km',
    duration: '15 min',
    level: 'Easy',
    description:
      'The loop half of Murrayville walks before work: up past James Hill, round the park behind it, back down Old Yale. Short enough before breakfast, and you will know half the faces by Friday.',
    best: 'Before half eight',
    active: 9,

    surface: 'Pavement throughout',
    climb: 'A gentle rise up to the school and back down',
    shade: 'Street trees most of the way',
    water: 'Fountain in the park, off from November to March',
    offLeash: 'None \u2014 school grounds and a road at either end',
    busy: [
      { label: 'Early', level: 'busy' },
      { label: 'Midday', level: 'quiet' },
      { label: 'Evening', level: 'steady' },
    ],
    suits: ['Before work', 'Puppies', 'Short legs', 'Pavement only'],

    stops: [
      { at: '0.0 km', name: 'Old Yale Road', note: 'Start anywhere along it. Most people join at the corner shop.' },
      { at: '0.4 km', name: 'James Hill Elementary', note: 'Keep to the far pavement at drop-off. It is not the morning to say hello.' },
      { at: '0.7 km', name: 'James Hill Park', note: 'Benches, the fountain, and the one patch of grass on the route.' },
      { at: '1.2 km', name: 'Back to Old Yale', note: 'Done before the kettle has boiled.' },
    ],
    headsUp: [
      'Between 8:15 and 8:45 the pavement by the school belongs to children and backpacks. Go the other way round or go earlier.',
      'The park fountain is turned off for the winter. Carry water from November.',
      'Cars reverse out of driveways along here without looking. Inside edge of the pavement.',
    ],
    parking: 'Street parking on Old Yale Road, but this is a walk-from-home route for most people.',
    accessibility: 'Step-free and kerb-dropped the whole way. One narrow stretch where the hedge has grown out.',
    notes: [
      { by: 'Maya C.', text: 'Juniper has learned which house has the cat in the window. We now stop there every single morning.' },
      { by: 'Priya R.', text: 'Go at 7:45 and you get the whole thing to yourself. Go at 8:20 and you get forty children.' },
    ],
  },
  {
    id: 'w5',
    scene: 'park',
    photo: '1774711521738-7856170d7658',
    name: 'The Cemetery Round',
    neighborhood: 'Murrayville Cemetery',
    distance: '1.8 km',
    duration: '25 min',
    level: 'Easy',
    description:
      'Slow, quiet and mostly empty \u2014 old trees, older headstones, and nobody in a hurry. The walk to take when your dog is nervous, or elderly, or you are.',
    best: 'Late afternoon',
    active: 1,

    surface: 'Paved lanes inside, pavement on the way there',
    climb: 'Barely \u2014 a long shallow rise along 44 Avenue',
    shade: 'Heavy. The cedars are over a century old',
    water: 'A tap by the gate, spring to autumn',
    offLeash: 'No. Leads on, and it matters more here than most places',
    busy: [
      { label: 'Early', level: 'quiet' },
      { label: 'Midday', level: 'quiet' },
      { label: 'Evening', level: 'quiet' },
    ],
    suits: ['Older dogs', 'Nervous dogs', 'Thinking', 'Shade'],

    stops: [
      { at: '0.0 km', name: 'The 214 Street gate', note: 'Tap and a bench just inside. The gate is heavy; it swings back.' },
      { at: '0.6 km', name: 'The cedar lane', note: 'The oldest part, and the coolest spot in Murrayville in August.' },
      { at: '1.1 km', name: 'The far corner', note: 'Open grass and the only sun. Where most dogs decide to lie down.' },
      { at: '1.8 km', name: 'Back to the gate', note: 'Out the way you came in.' },
    ],
    headsUp: [
      'It is a working cemetery. If there is a service on, come back another day \u2014 that is the whole etiquette.',
      'Clear up without being asked and without being seen. This is somebody\u2019s family.',
      'The lanes have no lighting at all. In December it is dark by four.',
    ],
    parking: 'A few spaces inside the gate. Leave them for people visiting.',
    accessibility: 'Paved and step-free, though the lanes are old and the surface has lifted in places.',
    notes: [
      { by: 'Nora W.', text: 'The only place Penny will walk the whole way without pulling. Something about how quiet it is.' },
      { by: 'Sam O.', text: 'Take the cedar lane in a heatwave. It is five degrees cooler under there, no exaggeration.' },
    ],
  },
  {
    id: 'w6',
    scene: 'creek',
    photo: '1730807125694-6833192896ee',
    name: 'The Arboretum Wander',
    neighborhood: 'Derek Doubleday Arboretum',
    distance: '2.1 km',
    duration: '30 min',
    level: 'Easy',
    description:
      'Soft ground, labelled trees and enough turns that a dog thinks it is a longer walk than it is. The best place around here to practise recall without an audience.',
    best: 'Mid-morning',
    active: 2,

    surface: 'Bark mulch and packed dirt',
    climb: 'Flat the whole way \u2014 no steps, no rise',
    shade: 'Almost all of it, which cuts both ways in winter',
    water: 'None on site \u2014 carry your own',
    offLeash: 'Not officially. Most people have a long line instead',
    busy: [
      { label: 'Early', level: 'quiet' },
      { label: 'Midday', level: 'quiet' },
      { label: 'Evening', level: 'steady' },
    ],
    suits: ['Training', 'Sniffing', 'Hot days', 'Nervous dogs'],

    stops: [
      { at: '0.0 km', name: 'Fraser Highway entrance', note: 'Pull in off the highway. The noise drops away within thirty seconds.' },
      { at: '0.5 km', name: 'The pond', note: 'Fenced, and the fence is low. Worth a hand on the lead going past.' },
      { at: '1.3 km', name: 'The labelled grove', note: 'Every tree named. Good excuse to let a dog take as long as it wants.' },
      { at: '2.1 km', name: 'Back to the gate', note: 'The loop joins itself, so you cannot really get it wrong.' },
    ],
    headsUp: [
      'Mulch holds water. A day after rain it is soft enough to pull a boot off.',
      'The highway is right there behind the trees. It sounds further away than it is \u2014 do not trust an off-lead dog near the edge.',
      'Mosquitoes by the pond from June. They find you in about a minute.',
    ],
    parking: 'Small lot off Fraser Highway. Six or seven spaces.',
    accessibility: 'Mostly flat but the mulch is soft \u2014 hard going for wheels, and worse when wet.',
    notes: [
      { by: 'Theo A.', text: 'Where we taught Basil to come back. Quiet enough that there is nothing more interesting than you.' },
      { by: 'Camille J.', text: 'I bring Miso here in the carrier, of all things. She likes the smell of it.' },
    ],
  },
  {
    id: 'w7',
    scene: 'park',
    photo: '1733259658566-26e3f86b4eaf',
    name: 'Five Corners and Back',
    neighborhood: 'Five Corners',
    distance: '1.4 km',
    duration: '20 min',
    level: 'Easy',
    description:
      'The errand walk. Down Old Yale on the original concrete, round the Hall, and back along 48th with a coffee if the queue is short. More stopping than walking, which is the point.',
    best: 'Saturday morning',
    active: 5,

    surface: 'Pavement, and one block of the old concrete road',
    climb: 'Flat, bar the camber on 48th',
    shade: 'Patchy \u2014 shop awnings and three big maples',
    water: 'Bowls outside the coffee place and the bakery',
    offLeash: 'None. Roads on five sides, which is rather the name',
    busy: [
      { label: 'Early', level: 'steady' },
      { label: 'Midday', level: 'busy' },
      { label: 'Evening', level: 'steady' },
    ],
    suits: ['Sociable dogs', 'Errands', 'Coffee', 'Short walks'],

    stops: [
      { at: '0.0 km', name: 'Five Corners', note: 'Where 216th, 48th and Old Yale all meet. Cross carefully; the sightlines are poor.' },
      { at: '0.3 km', name: 'The old concrete', note: 'The last original panels of the province\u2019s first concrete road. Hard underfoot and worth a look.' },
      { at: '0.6 km', name: 'Murrayville Hall', note: 'Bench out front, in the sun until about two.' },
      { at: '1.4 km', name: 'Back along 48th', note: 'Water bowls outside the coffee place. Most walks end here for twenty minutes.' },
    ],
    headsUp: [
      'Five Corners is a genuinely awkward junction. Short lead, and wait for a proper gap.',
      'Saturday late morning the pavement outside the shops is packed. Lovely if your dog likes people, miserable if not.',
      'The old concrete gets glassy in the wet.',
    ],
    parking: 'Street parking around the Hall, two hours free.',
    accessibility: 'Step-free with dropped kerbs, apart from the old concrete block, which is uneven. Pavement bypass alongside.',
    notes: [
      { by: 'Priya R.', text: 'Not a walk so much as a social round. We get maybe four hundred metres of actual walking out of it.' },
      { by: 'Maya C.', text: 'Juniper knows exactly which doorway the biscuits come from and will not be talked out of it.' },
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

/** How many routes the page shows before you ask for the rest. */
export const FEATURED_WALKS = 5;

/**
 * The busiest routes first.
 *
 * "Popular" here means how many neighbours are out on it now, which is the
 * only popularity this app actually knows. A route you have saved counts as
 * yours and comes first regardless — the one you keep going back to should
 * not drop below the fold because nobody else happens to be on it today.
 * Ties keep the original order so the list does not shuffle itself about.
 */
export function byPopularity(walks: Walk[]): Walk[] {
  return walks
    .map((walk, index) => ({ walk, index }))
    .sort((a, b) => {
      if (Boolean(a.walk.saved) !== Boolean(b.walk.saved)) return a.walk.saved ? -1 : 1;
      if (a.walk.active !== b.walk.active) return b.walk.active - a.walk.active;
      return a.index - b.index;
    })
    .map((entry) => entry.walk);
}
