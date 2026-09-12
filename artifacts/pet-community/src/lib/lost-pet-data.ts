/**
 * Open lost-pet cases. Each one carries the map coordinates and behavioural
 * detail the search model needs, alongside the human-facing report.
 *
 * Cases neighbours file themselves are kept in this browser and merged with the
 * seeded ones, so a new report gets the same search map as an existing case.
 */

import type { PortraitSpec } from '@/components/pet-portrait';
import type { BuildSize, Sighting, Species, Temperament, Weather } from './lost-pet-model';
import type { Vec } from './neighborhood-map';

export type LostCase = {
  id: string;
  petName: string;
  species: Species;
  size: BuildSize;
  breed: string;
  temperament: Temperament;
  /** Minutes missing at the moment the app loaded; it ticks up from there. */
  missingForMinutes: number;
  /** Set on neighbour-filed cases, which are timestamped rather than seeded. */
  reportedAt?: number;
  lastSeen: Vec;
  lastSeenPlace: string;
  home: Vec;
  homePlace: string;
  description: string;
  markings: string;
  microchipped: boolean;
  owner: string;
  ownerInitials: string;
  contact: string;
  status: 'Active' | 'Reunited';
  sightings: Sighting[];
  weather: Weather;
  /** A likeness, so an alert reads as a missing animal rather than a form. */
  portrait: PortraitSpec;
};

/**
 * Fixed at module load so elapsed time advances in real time while the page is
 * open, rather than jumping around between renders.
 */
const LOADED_AT = Date.now();

const USER_CASES_KEY = 'pc-user-cases';

export function minutesMissing(item: LostCase): number {
  if (item.reportedAt) return (Date.now() - item.reportedAt) / 60000;
  return item.missingForMinutes + (Date.now() - LOADED_AT) / 60000;
}

export const LOST_CASES: LostCase[] = [
  {
    id: 'l1',
    petName: 'Pip',
    species: 'dog',
    size: 'small',
    breed: 'Small terrier mix',
    temperament: 'skittish',
    missingForMinutes: 96,
    lastSeen: { x: -120, y: 190 },
    lastSeenPlace: 'Willow Gate, by the north path',
    home: { x: -300, y: -200 },
    homePlace: 'Alder Street',
    description:
      'Slipped his harness when a delivery van door slammed. He is food-motivated but bolts if anyone runs at him — please do not chase or call loudly.',
    markings: 'White and tan, red harness still on, one ear folds over',
    microchipped: true,
    owner: 'Rowan Bell',
    ownerInitials: 'RB',
    contact: 'Message Rowan through PetCommunity',
    status: 'Active',
    weather: 'clear',
    portrait: {
      species: 'dog',
      coat: { base: '#E4D2B4', shade: '#B58F5E', accent: '#8A5A33', bg: '#F6EBD7' },
      marking: 'patch',
      ears: 'folded',
      mood: 'wary',
    },
    sightings: [
      {
        id: 's1',
        at: { x: -40, y: 252 },
        minutesAgo: 34,
        confidence: 'likely',
        note: 'Small tan dog with a red harness went into the thicket, moving fast. Did not stop when I spoke to him.',
        reporter: 'Nora Williams',
      },
      {
        id: 's2',
        at: { x: 72, y: 128 },
        minutesAgo: 61,
        confidence: 'possible',
        note: 'Something small and light-coloured crossed the courtyard near the bins. Only caught it out of the corner of my eye.',
        reporter: 'Theo Alvarez',
      },
    ],
  },
  {
    id: 'l2',
    petName: 'Miso',
    species: 'cat',
    size: 'small',
    breed: 'Orange tabby',
    temperament: 'shy',
    missingForMinutes: 1010,
    lastSeen: { x: -320, y: -235 },
    lastSeenPlace: 'Alder Street, back garden',
    home: { x: -360, y: -180 },
    homePlace: 'Alder Street',
    description:
      'Indoor cat, got out through a window left open overnight. She has never been outside alone. She will not come when called — she goes quiet and still when she is frightened.',
    markings: 'Green eyes, one clipped ear, no collar',
    microchipped: true,
    owner: 'Camille Jones',
    ownerInitials: 'CJ',
    contact: 'Message Camille through PetCommunity',
    status: 'Active',
    weather: 'rain',
    portrait: {
      species: 'cat',
      coat: { base: '#E3975C', shade: '#B97440', accent: '#A25A2A', bg: '#FAE9D5' },
      marking: 'tabby',
      ears: 'perky',
      mood: 'wary',
    },
    sightings: [],
  },
  {
    id: 'l3',
    petName: 'Juniper',
    species: 'dog',
    size: 'medium',
    breed: 'Retriever mix',
    temperament: 'friendly',
    missingForMinutes: 4180,
    lastSeen: { x: -400, y: 120 },
    lastSeenPlace: 'Maple Park south lawn',
    home: { x: -430, y: -140 },
    homePlace: 'Alder Street',
    description:
      'Home safe. A neighbour found her sitting outside the community garden gate ninety minutes after she went missing.',
    markings: 'Golden, blue collar with tag',
    microchipped: true,
    owner: 'Maya Chen',
    ownerInitials: 'MC',
    contact: 'Reunited — thank you to everyone who looked',
    status: 'Reunited',
    weather: 'clear',
    portrait: {
      species: 'dog',
      coat: { base: '#DFAE68', shade: '#B88742', accent: '#F5E8D0', bg: '#F8EEDB' },
      marking: 'solid',
      ears: 'floppy',
      mood: 'bright',
    },
    sightings: [
      {
        id: 's3',
        at: { x: -150, y: 110 },
        minutesAgo: 4090,
        confidence: 'confirmed',
        note: 'Found her by the garden gate, tail going. She walked home on the lead without a fuss.',
        reporter: 'Priya Raman',
      },
    ],
  },
];

export function loadUserCases(): LostCase[] {
  try {
    const raw = localStorage.getItem(USER_CASES_KEY);
    return raw ? (JSON.parse(raw) as LostCase[]) : [];
  } catch {
    return [];
  }
}

export function saveUserCases(cases: LostCase[]): void {
  try {
    localStorage.setItem(USER_CASES_KEY, JSON.stringify(cases));
  } catch {
    /* storage can be unavailable; the report still shows for this session */
  }
}

export function allCases(): LostCase[] {
  return [...loadUserCases(), ...LOST_CASES];
}

export function findCase(id: string): LostCase | undefined {
  return allCases().find((c) => c.id === id);
}

/** Crepuscular and night behaviour differ enough to be worth reading off the clock. */
export function timeOfDayNow(now = new Date()): 'day' | 'dusk' | 'night' {
  const hour = now.getHours();
  if (hour >= 21 || hour < 5) return 'night';
  if (hour >= 18 || hour < 7) return 'dusk';
  return 'day';
}
