/**
 * Who you can see, and who has to be asked first.
 *
 * The rule is the one a neighbourhood actually runs on: the people whose
 * patch overlaps yours are simply there — you pass them on the street, you
 * know their dog's name before you know theirs. Everybody else is a stranger,
 * and a stranger gets a knock on the door, not a look through the window.
 *
 * So: inside your circle, a full card. Outside it, a name and a rough
 * distance, and the only thing you can do is ask. Nothing about somebody out
 * of range — not their pet, not their notes, not where they walk — is shown
 * until they say yes.
 *
 * Being listed at all is opt-in. Nobody appears here who has not ticked the
 * box on their own profile.
 */

import { CIRCLE_METRES } from './neighbours.ts';
import { metresBetweenPoints } from './area.ts';
import type { Vec } from './neighborhood-map.ts';
import type { PortraitSpec } from './portrait-spec.ts';

export type Person = {
  id: string;
  name: string;
  initials: string;
  pet: string;
  /** Breed and age, as one line. */
  detail: string;
  note: string;
  /** Where they set off from. */
  at: Vec;
  /** The landmark they are nearest, which is all anybody else is told. */
  area: string;
  photo?: string;
  avatar?: string;
  portrait?: PortraitSpec;
  /** The wash behind their photo while it loads. */
  color?: string;
  /** True for the row that is you. */
  isYou?: boolean;
};

export type Seen = Person & { metres: number | null };

/** Everyone, sorted by how close they are, with the distance worked out once. */
export function measure(people: Person[], from: Vec | null): Seen[] {
  return people
    .map((person) => ({ ...person, metres: from ? metresBetweenPoints(from, person.at) : null }))
    .sort((a, b) => (a.metres ?? Infinity) - (b.metres ?? Infinity));
}

/**
 * Split into the people you can see and the people you would have to ask.
 *
 * With no pin of your own there is no circle to be inside, so nobody is a
 * stranger yet — everyone shows, and the page asks you to set your spot.
 */
export function visible(people: Seen[]): { near: Seen[]; far: Seen[] } {
  const near: Seen[] = [];
  const far: Seen[] = [];
  for (const person of people) {
    if (person.isYou || person.metres === null || person.metres <= CIRCLE_METRES) near.push(person);
    else far.push(person);
  }
  return { near, far };
}

/**
 * What a stranger is allowed to know about you: a name, roughly how far, and
 * nothing else. Everything a card would normally carry is stripped here
 * rather than hidden with CSS, so it never reaches the page at all.
 */
export function asStranger(person: Seen): { id: string; name: string; initials: string; metres: number | null } {
  return { id: person.id, name: person.name, initials: person.initials, metres: person.metres };
}
