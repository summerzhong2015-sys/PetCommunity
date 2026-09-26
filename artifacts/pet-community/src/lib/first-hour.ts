/**
 * What actually helps in the first hour a pet is missing.
 *
 * Not filler. The advice here follows what search-and-rescue volunteers and
 * shelters consistently say, and the two things that matter most are both
 * counter-intuitive, which is exactly why they are worth putting in front of
 * someone who is panicking:
 *
 *   1. Most cats have not gone anywhere. They are within a few gardens,
 *      silent, wedged somewhere small. Searching further afield first is the
 *      common mistake.
 *   2. Calling and chasing pushes a frightened animal further away. A scared
 *      dog runs from its own name in a voice it has not heard before.
 *
 * So the steps are ordered by what to do first, and they change with the
 * species and the temperament the owner already told us about — a confident
 * dog and a panicking cat need nearly opposite advice.
 */

import type { Species, Temperament } from './lost-pet-model.ts';

export type Step = {
  /** Short enough to scan while upset. */
  title: string;
  detail: string;
  /** The ones that are most often got wrong. */
  emphasis?: boolean;
};

/** Steps everyone should do, in order. */
function universal(name: string): Step[] {
  return [
    {
      title: 'Search the house again, properly',
      detail: `More pets are found inside than anywhere else. Under beds, behind the boiler, inside wardrobes and drawers, in the back of cupboards, behind the washing machine. Move things rather than looking at them.`,
      emphasis: true,
    },
    {
      title: 'Prop the door open and put their bed outside',
      detail: `Their bed, blanket, litter tray if they have one, and something you have worn today. Scent brings an animal back far more reliably than a voice does. Leave water out — food too, unless it will draw foxes.`,
      emphasis: true,
    },
    {
      title: 'Ask the immediate neighbours to check sheds and garages',
      detail: `Not to look out for ${name} — to physically open sheds, garages, greenhouses and cars. Animals get shut in within minutes of a door being open, and nobody checks their own shed unless asked.`,
    },
    {
      title: 'Phone the microchip registry and the nearest vets',
      detail: `Register ${name} as missing with the chip company first — it is the one thing that works while you sleep. Then the vets and shelters within a few miles, because a found animal is taken to one of those.`,
    },
  ];
}

function bySpecies(species: Species, name: string): Step[] {
  if (species === 'cat') {
    return [
      {
        title: 'Search close, and search low',
        detail: `A frightened cat usually goes no further than a few gardens and then stops moving. Check under decking, in bushes at ground level, beneath cars and inside anything with a gap. Take a torch even in daylight — eyes reflect.`,
        emphasis: true,
      },
      {
        title: 'Go out again at 2am',
        detail: `A hiding cat waits for quiet. The small hours are the most productive time to search, and the most likely time ${name} will break cover and answer.`,
      },
    ];
  }
  return [
    {
      title: 'Cover ground, and follow the roads',
      detail: `A dog can be two or three miles away within the hour, and tends to follow paths, roads and people rather than cutting across country. Ask anyone out walking, and check where dogs usually gather.`,
    },
    {
      title: 'Get a message to the dog walkers',
      detail: `The people out at the same times as you are the ones most likely to see ${name}. They are worth more than a hundred posts to strangers.`,
    },
  ];
}

function byTemperament(temperament: Temperament, name: string): Step[] {
  if (temperament === 'friendly') {
    return [
      {
        title: 'Calling is worth trying',
        detail: `${name} goes to people, so a normal, cheerful voice may well work. Bring the noise that means food — a treat bag, a familiar tin.`,
      },
    ];
  }
  return [
    {
      title: 'Do not call, and do not chase',
      detail: `${name} bolts when approached. Shouting and running are the two things that turn a pet hiding two streets away into a pet two miles away. If you see ${name}: stop, crouch, look away, and put food down. Let them come.`,
      emphasis: true,
    },
    {
      title: 'Tell everyone else not to chase either',
      detail: `Well-meaning neighbours running towards a frightened animal do real damage. Say it in the alert, and say it first.`,
      emphasis: true,
    },
  ];
}

/** The checklist for one animal, most important first. */
export function firstHour(input: { name: string; species: Species; temperament: Temperament }): Step[] {
  const name = input.name.trim() || 'they';
  return [
    ...byTemperament(input.temperament, name),
    ...universal(name),
    ...bySpecies(input.species, name),
  ];
}

/** The single line worth putting at the very top. */
export function headlineAdvice(species: Species, temperament: Temperament): string {
  if (temperament !== 'friendly') return 'Do not call out and do not chase — it pushes them further away.';
  if (species === 'cat') return 'Start with your own house and the gardens either side. Most cats are found within a few doors.';
  return 'Check the house and garden first, then follow the roads and paths outward.';
}
