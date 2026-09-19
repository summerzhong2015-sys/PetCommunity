/** Neighbourhood walking routes. */

export type Walk = {
  id: string;
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
  saved?: boolean;
};

export const defaultWalks: Walk[] = [
  {
    id: 'w1',
    name: 'Creekside Loop',
    neighborhood: 'North Creek',
    distance: '2.8 km',
    duration: '35 min',
    level: 'Easy',
    description:
      'A shady, mostly flat loop beside the creek with three wide spots for off-leash play. The south gate can get muddy after rain.',
    best: 'Early morning',
    active: 4,
  },
  {
    id: 'w2',
    name: 'Maple Park Circuit',
    neighborhood: 'Maple Park',
    distance: '1.6 km',
    duration: '20 min',
    level: 'Easy',
    description:
      'A bright neighborhood circuit past the community garden and two water fountains. Great for a quick hello-heavy walk.',
    best: 'Lunch break',
    active: 7,
  },
  {
    id: 'w3',
    name: 'Hilltop Lookout',
    neighborhood: 'East Ridge',
    distance: '4.2 km',
    duration: '55 min',
    level: 'Rolling',
    description:
      'A steady climb rewarded with a wide view over the neighborhood. Bring water; the last fountain is at the lower trailhead.',
    best: 'Golden hour',
    active: 2,
  },
];
