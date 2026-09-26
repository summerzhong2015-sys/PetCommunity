/**
 * The poster.
 *
 * At some point on the worst evening of their year, someone opens a Word
 * document and tries to make a missing-pet poster. It usually ends up with a
 * dark phone photo, the word LOST in a stretched font, and no useful detail.
 *
 * This builds the poster from what the alert already contains, and it is
 * opinionated about what belongs on one, because a poster is read at three
 * metres by someone walking past:
 *
 *   - The name and the photograph are the poster. Everything else is smaller.
 *   - One instruction, not a paragraph. "Do not chase" beats three sentences.
 *   - Where and when, in plain words, because "last seen Willow Gate, Tuesday
 *     evening" is what jogs a memory.
 *   - One way to get in touch, big enough to read from a car.
 *
 * Kept separate from the component so the wording can be tested.
 */

import type { LostCase } from './lost-pet-data.ts';
import { formatAge } from './lost-pet-model.ts';

export type Poster = {
  petName: string;
  /** "Small terrier mix · 4 years" style line. */
  descriptor: string;
  /** The single most important instruction. */
  instruction: string;
  /** Whether that instruction is a warning rather than an invitation. */
  instructionIsWarning: boolean;
  lastSeen: string;
  missingFor: string;
  markings: string;
  contact: string;
  /** Short enough to fit under the photo. */
  blurb: string;
  microchipped: boolean;
};

/** Trim a description down to something readable at a glance. */
export function posterBlurb(description: string, limit = 150): string {
  const clean = description.trim().replace(/\s+/g, ' ');
  if (clean.length <= limit) return clean;
  // Cut at a sentence end if there is one in range, otherwise at a word.
  const window = clean.slice(0, limit);
  const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
  if (sentence > limit * 0.5) return clean.slice(0, sentence + 1);
  const word = window.lastIndexOf(' ');
  return `${clean.slice(0, word > 0 ? word : limit).replace(/[,;:]$/, '')}…`;
}

/**
 * The one line in the largest type after the name.
 *
 * An animal that bolts needs the reader to do *less*, not more, and that is
 * the opposite of what a well-meaning stranger will do unprompted.
 */
export function posterInstruction(item: Pick<LostCase, 'temperament' | 'petName'>): {
  text: string;
  isWarning: boolean;
} {
  if (item.temperament === 'friendly') {
    return { text: 'Friendly — please hold on to them and call', isWarning: false };
  }
  if (item.temperament === 'shy') {
    return { text: 'Do not chase — call the number instead', isWarning: true };
  }
  return { text: 'DO NOT CHASE OR CALL OUT — they bolt', isWarning: true };
}

export function buildPoster(item: LostCase, minutesMissing: number): Poster {
  const instruction = posterInstruction(item);
  return {
    petName: item.petName,
    descriptor: [item.breed, item.size === 'small' ? 'small' : item.size === 'large' ? 'large' : null]
      .filter(Boolean)
      .join(' · '),
    instruction: instruction.text,
    instructionIsWarning: instruction.isWarning,
    lastSeen: item.lastSeenPlace,
    missingFor: formatAge(minutesMissing).replace(' ago', ''),
    markings: item.markings,
    contact: item.contact,
    blurb: posterBlurb(item.description),
    microchipped: item.microchipped,
  };
}
