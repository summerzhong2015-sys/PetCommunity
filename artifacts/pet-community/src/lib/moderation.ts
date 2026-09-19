/**
 * Checking a message before it is sent.
 *
 * This is a local, rule-based check — not a language model. The app is a static
 * site with no backend and no API key, so there is nothing to call. What it
 * does instead is normalise the text past the usual dodges (spacing, leetspeak,
 * repeated letters) and match a curated vocabulary and a set of patterns.
 *
 * `review` is async and returns a verdict, so a real model can be dropped in
 * behind the same call without the UI changing. Until then, be honest in the
 * interface about what it is: it catches the obvious, and it will miss things a
 * person would catch.
 *
 * Two levels, deliberately:
 *   'block'  — abuse, threats, slurs. Not sendable.
 *   'warn'   — a phone number, an address, an email. Sendable once confirmed,
 *              because sharing your own contact details is your call, and this
 *              app promises neighbours that exact addresses stay private.
 *
 * Pure and deterministic, so it can be tested directly.
 */

export type Verdict = {
  level: 'clean' | 'warn' | 'block';
  /** What to show the person. Empty when clean. */
  reason: string;
  /** Which rule fired, for the UI and for tests. */
  category?: 'abuse' | 'threat' | 'self-harm' | 'sexual' | 'contact-details' | 'address';
  /** The matched fragment, so the message can point at it. */
  matched?: string;
};

export const CLEAN: Verdict = { level: 'clean', reason: '' };

const LEET: Record<string, string> = {
  '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a',
  '0': 'o', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b',
};

/**
 * Flattens the usual ways people slip a word past a filter: f.u.c.k, f u c k,
 * fuuuck, f4ck. Keeps a single space between words so phrases still match.
 */
export function normalise(text: string): string {
  const mapped = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('')
    .map((ch) => LEET[ch] ?? ch)
    .join('');

  return mapped
    // letters split by punctuation or single spaces: f.u.c.k -> fuck
    .replace(/\b(?:[a-z][^a-z0-9]{1,2}){2,}[a-z]\b/g, (run) => run.replace(/[^a-z0-9]/g, ''))
    // Runs of three or more collapse to one: fuuuuck -> fuck. Genuine doubles
    // are left alone — collapsing those turned "will" into "wil" and quietly
    // broke every pattern that contained an ordinary word.
    .replace(/([a-z])\1{2,}/g, '$1')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common profanity, in normalised (de-doubled) form. Deliberately does not
 * include slurs: those belong in a maintained list rather than hand-typed here.
 * Point EXTRA_BLOCKED at one to extend this.
 */
const PROFANITY = [
  'fuck', 'fucker', 'fucking', 'shit', 'shite', 'bitch', 'bastard', 'cunt',
  'wanker', 'dickhead', 'arsehole', 'asshole', 'prick', 'twat', 'slut', 'whore',
  'motherfucker', 'bollocks', 'piss off', 'pissed off',
  // Obfuscations that come out the other side of normalise() as their own word.
  'fack', 'fuk', 'fck', 'shyt', 'biatch', 'azzhole',
];

/** Add a maintained slur/profanity list here; entries are matched the same way. */
export const EXTRA_BLOCKED: string[] = [];

/** Words that legitimately contain a flagged substring — the Scunthorpe problem. */
const ALLOW = [
  'scunthorpe', 'penistone', 'assassin', 'assess', 'assessment', 'class', 'classic',
  'grass', 'pass', 'passage', 'bass', 'mass', 'massive', 'shiitake', 'cockatiel',
  'analysis', 'analyse', 'analyze', 'therapist', 'dickens', 'butter',
];

const THREATS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(i|we)\s+(will|am going to|gonna|ll)\s+(kill|hurt|beat|stab|shoot|smash|batter)\s+(you|u|him|her|them|your)\b/, reason: 'This reads as a threat of violence.' },
  { pattern: /\b(kill|hurt|beat)\s+(you|u)\b.*\b(if|when|unless)\b/, reason: 'This reads as a threat.' },
  { pattern: /\bi know where you live\b/, reason: 'This reads as an attempt to intimidate.' },
  { pattern: /\bwatch your back\b/, reason: 'This reads as a threat.' },
  { pattern: /\byou(r| are|re)?\s+(dead|finished)\b/, reason: 'This reads as a threat.' },
  { pattern: /\b(come|coming)\s+(to|for)\s+your\s+(house|home|address)\b/, reason: 'This reads as an attempt to intimidate.' },
  { pattern: /\b(poison|hurt|kick|kill)\s+(your|that|the)\s+(dog|cat|pet|animal)\b/, reason: 'This threatens an animal.' },
];

const SELF_HARM: RegExp[] = [
  /\bkys\b/,
  /\bkill\s+(yourself|urself|yourselves)\b/,
  /\bgo\s+die\b/,
  /\bend\s+your\s+life\b/,
];

const SEXUAL: RegExp[] = [
  /\bsend\s+(me\s+)?nudes?\b/,
  /\bnudes?\s+please\b/,
  /\b(want|wanna)\s+to\s+see\s+you\s+naked\b/,
];

/** Contact details. Not wrong to share — worth a second look before you do. */
const EMAIL = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
const PHONE = /(?:\+?\d[\s.-]?){6,}\d/;
const STREET = /\b\d{1,5}[a-z]?\s+[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*)?\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|close|crescent|terrace|way|place|pl|boulevard|blvd|row|walk|gardens|grove|mews|rise|hill|green|park)\b/i;
const POSTCODE = /\b[a-z]\d[a-z]\s?\d[a-z]\d\b/i;

function findWord(haystack: string, needle: string): string | null {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  const match = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).exec(haystack);
  if (!match) return null;
  // Skip a hit that sits inside a legitimate longer word.
  const around = haystack.slice(Math.max(0, match.index - 12), match.index + needle.length + 12);
  if (ALLOW.some((safe) => around.includes(safe))) return null;
  return needle;
}

/** The whole check, synchronously. `review` wraps this. */
export function inspect(text: string): Verdict {
  const raw = text.trim();
  if (!raw) return CLEAN;
  const flat = normalise(raw);

  for (const rule of SELF_HARM) {
    const hit = rule.exec(flat);
    if (hit) {
      return {
        level: 'block',
        category: 'self-harm',
        matched: hit[0],
        reason: 'This tells someone to harm themselves. It will not be sent.',
      };
    }
  }

  for (const rule of THREATS) {
    const hit = rule.pattern.exec(flat);
    if (hit) return { level: 'block', category: 'threat', matched: hit[0], reason: rule.reason };
  }

  for (const rule of SEXUAL) {
    const hit = rule.exec(flat);
    if (hit) {
      return {
        level: 'block',
        category: 'sexual',
        matched: hit[0],
        reason: 'This is not something to send a neighbour you do not know.',
      };
    }
  }

  for (const word of [...PROFANITY, ...EXTRA_BLOCKED]) {
    const hit = findWord(flat, word);
    if (hit) {
      return {
        level: 'block',
        category: 'abuse',
        matched: hit,
        reason: 'That language will not go to a neighbour. Say it another way.',
      };
    }
  }

  // Warnings: allowed, but worth a beat. This app promises neighbours that
  // exact addresses stay private, so an address in a message is worth flagging.
  const address = STREET.exec(raw) ?? POSTCODE.exec(raw);
  if (address) {
    return {
      level: 'warn',
      category: 'address',
      matched: address[0],
      reason: `That looks like a street address (${address[0].trim()}). Neighbours here only ever see approximate distances — send it only if you mean to.`,
    };
  }

  const contact = EMAIL.exec(raw) ?? PHONE.exec(raw);
  if (contact) {
    return {
      level: 'warn',
      category: 'contact-details',
      matched: contact[0].trim(),
      reason: `That looks like a phone number or email. It is fine to share your own — just not by accident.`,
    };
  }

  return CLEAN;
}

/**
 * Async so a hosted moderation model can replace the body without any caller
 * changing. Today it resolves immediately from the local rules.
 */
export async function review(text: string): Promise<Verdict> {
  return inspect(text);
}
