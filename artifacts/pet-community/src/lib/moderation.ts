/**
 * Checking text before it is sent — anywhere in the app.
 *
 * WHAT THIS IS. A local, rule-based check. The app is a static site: there is
 * no backend and no model to call, so this normalises text past the usual
 * dodges and matches a curated vocabulary and a set of patterns.
 *
 * WHAT IT IS NOT. It does not understand meaning. It catches obvious abuse and
 * most attempts to disguise it, and it will miss anything that needs reading a
 * sentence rather than scanning it — an insult built entirely from ordinary
 * words, sarcasm, a threat only a human would hear. Those need a model, and the
 * seam for one is `review()` below: point VITE_MODERATION_URL at an endpoint
 * and every caller in the app starts using it with no other change. Until then
 * the interface should not claim more than this does.
 *
 * WHAT IT DOES HANDLE:
 *   - case, accents, and zero-width characters
 *   - leetspeak (sh1t, b!tch, @ss)
 *   - characters from other alphabets that look like ours (Cyrillic а, о, е)
 *   - letters split by spaces, dots or dashes (f u c k, f.u.c.k)
 *   - padded repeats (fuuuuck), and phonetic spellings (phuck, fuk)
 *   - profanity and insults in several other languages
 *   - threats, self-harm instructions, sexual propositions
 *   - dehumanising phrasing aimed at a person or a group
 *
 * AND WHAT IT DELIBERATELY ALLOWS. Talking *about* a word is not using it.
 * "my kid asked what f*** means" and a quoted phrase are mention, not attack,
 * and blocking those makes a moderator look stupid and teaches people to work
 * around it. See MENTION_FRAMES.
 *
 * Two levels:
 *   'block'  — abuse, slurs, threats, sexual content. Not sendable.
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
  category?: 'abuse' | 'slur' | 'harassment' | 'threat' | 'self-harm' | 'sexual' | 'contact-details' | 'address';
  /** True when a model produced this rather than the local rules. */
  fromModel?: boolean;
  /** The matched fragment, so the message can point at it. */
  matched?: string;
};

export const CLEAN: Verdict = { level: 'clean', reason: '' };

const LEET: Record<string, string> = {
  '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a',
  '0': 'o', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b',
  '9': 'g', '6': 'g', '2': 'z',
};

/**
 * Characters from other alphabets that are drawn like ours. Pasting a Cyrillic
 * "а" into an English word is one of the oldest ways past a filter, and it
 * costs one lookup to close.
 */
const HOMOGLYPHS: Record<string, string> = {
  'а': 'a', 'в': 'b', 'с': 'c', 'е': 'e', 'н': 'h', 'к': 'k', 'м': 'm',
  'о': 'o', 'р': 'p', 'т': 't', 'х': 'x', 'у': 'y', 'і': 'i', 'ѕ': 's', 'ј': 'j',
  'α': 'a', 'β': 'b', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ο': 'o', 'ρ': 'p',
  'τ': 't', 'υ': 'u', 'χ': 'x', 'ν': 'v', 'ѵ': 'v',
};

/** Emoji and symbols used as letters. */
const SYMBOL_LETTERS: Record<string, string> = {
  '🅰': 'a', '🅱': 'b', '🆎': 'b', '⭐': 'a', '✱': 'a', '★': 'a',
  '€': 'e', '£': 'l', '¢': 'c', '§': 's', '¡': 'i', '¿': 'o', '°': 'o',
};

/** Spellings that sound the same. Applied after the other passes. */
const PHONETIC: [RegExp, string][] = [
  [/ph/g, 'f'],
  [/ck/g, 'k'],
  [/qu/g, 'kw'],
  [/([a-z])\1/g, '$1'],
];

/**
 * Flattens the usual ways people slip a word past a filter: f.u.c.k, f u c k,
 * fuuuck, f4ck, phuck, ｆｕｃｋ, and Cyrillic lookalikes.
 */
export function normalise(text: string): string {
  const mapped = text
    // Full-width characters, and anything with a decomposable accent.
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Zero-width and directional marks, used to break up words invisibly.
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '')
    .split('')
    .map((ch) => SYMBOL_LETTERS[ch] ?? HOMOGLYPHS[ch] ?? LEET[ch] ?? ch)
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
 * A second, lossier pass used only for vocabulary matching. Doubles collapse
 * and sounds are folded together, so "phuuck", "fukk" and "fuck" all land on
 * the same string. Too lossy for phrase patterns, which is why it is separate.
 */
export function phoneticKey(flat: string): string {
  let out = flat;
  for (const [pattern, replacement] of PHONETIC) out = out.replace(pattern, replacement);
  return out;
}

/**
 * Profanity and vulgar insults, in normalised form. `phoneticKey` folds most
 * misspellings onto these, so the list stays short rather than trying to
 * enumerate every way a word can be typed.
 */
const PROFANITY = [
  'fuck', 'fucker', 'fucking', 'fuckin', 'shit', 'shite', 'bullshit', 'bitch',
  'bastard', 'cunt', 'wanker', 'dickhead', 'arsehole', 'asshole', 'prick',
  'twat', 'slut', 'whore', 'motherfucker', 'bollocks', 'piss off', 'pissed off',
  'dumbass', 'jackass', 'douchebag', 'scumbag', 'skank', 'tosser', 'knobhead',
  'shithead', 'shitbag', 'pissbag', 'crackhead', 'nonce',
  // Deliberate misspellings that survive normalise() as words of their own.
  // Vowel-folding would catch these generically, but it also folds "fake" onto
  // "fuck", so the misspellings are listed rather than guessed at.
  'fack', 'fick', 'fuk', 'fuc', 'fck', 'phuck', 'phuk', 'shyt', 'shet',
  'biatch', 'beatch', 'biotch', 'btch', 'bich', 'azzhole', 'azhole', 'azz',
  'cnut', 'kunt', 'khunt', 'basterd', 'bastid',
];

/**
 * Insults in other languages. Someone swearing at a neighbour in Spanish is
 * swearing at a neighbour. Kept to the common ones rather than pretending to
 * cover every language — that is squarely a job for a model.
 */
const PROFANITY_OTHER_LANGUAGES = [
  // Spanish / Portuguese
  'puta', 'puto', 'pendejo', 'cabron', 'gilipollas', 'mierda', 'coño', 'cono',
  'hijo de puta', 'chinga', 'chingar', 'verga', 'caralho', 'merda', 'porra', 'foda se',
  // French
  'merde', 'salope', 'connard', 'conne', 'enculé', 'encule', 'batard', 'ta gueule',
  // German / Dutch
  'scheisse', 'scheiße', 'arschloch', 'hurensohn', 'wichser', 'klootzak', 'kut',
  // Italian
  'stronzo', 'cazzo', 'vaffanculo', 'troia',
  // Russian (transliterated)
  'suka', 'blyat', 'blyad', 'pidor', 'mudak',
  // Hindi / Urdu (transliterated)
  'chutiya', 'madarchod', 'behenchod', 'bhosdike', 'gandu', 'randi',
  // Tagalog
  'putangina', 'tangina', 'gago', 'tanga',
  // Mandarin (pinyin)
  'cao ni ma', 'ni ma de', 'shabi', 'sha bi',
];

/**
 * Slurs targeting protected characteristics: race, ethnicity, religion,
 * sexuality, gender identity, disability. Blocked unconditionally — there is
 * no framing in a neighbourhood pet app that makes one of these acceptable, so
 * unlike profanity these are NOT excused by a mention frame.
 */
const SLURS = [
  'nigger', 'nigga', 'chink', 'gook', 'spic', 'wetback', 'kike', 'yid',
  'paki', 'raghead', 'towelhead', 'sandnigger', 'coon', 'jigaboo',
  'faggot', 'fag', 'dyke', 'tranny', 'shemale', 'ladyboy',
  'retard', 'retarded', 'mongoloid', 'spastic', 'cripple',
  'gypsy scum', 'zipperhead', 'abo', 'beaner', 'squaw',
];

/** Add a maintained slur/profanity list here; entries are matched the same way. */
export const EXTRA_BLOCKED: string[] = [];

/** Words that legitimately contain a flagged substring — the Scunthorpe problem. */
const ALLOW = [
  'scunthorpe', 'penistone', 'assassin', 'assess', 'assessment', 'class', 'classic',
  'grass', 'pass', 'passage', 'bass', 'mass', 'massive', 'shiitake', 'cockatiel',
  'analysis', 'analyse', 'analyze', 'therapist', 'dickens', 'butter', 'shitake',
  'cassette', 'harassment', 'bypass', 'compass', 'embassy', 'glasses', 'sussex',
  'titmouse', 'cockerel', 'woodcock', 'peacock', 'shuttlecock', 'hitchcock',
];

/**
 * Talking about a word rather than using it. A parent asking what something
 * means, a quotation, a report of what someone else said — these are mention,
 * not attack. Profanity inside one of these frames is let through; slurs and
 * threats are not, because reporting those still does not require typing them
 * at a neighbour.
 */
const MENTION_FRAMES: RegExp[] = [
  /\b(the|a|that|this)\s+(word|term|phrase|expression)\b/,
  /\bwhat\s+does\s+\w+\s+mean\b/,
  /\b(means?|meaning|spelled|spelt|pronounced|translates?)\b/,
  /\b(called|shouted|said|says|wrote|texted|yelled)\s+(me|us|him|her|them|at)\b/,
  /\b(swear|curse|cuss|rude|offensive|bad|dirty)\s+word/,
  /\bwithout\s+swearing\b/,
  /\bnot\s+(allowed|ok|okay|acceptable)\s+to\s+say\b/,
];

/** Whether the profanity sits inside a quotation. */
function isQuoted(raw: string, term: string): boolean {
  const quoted = raw.match(/["“'‘]([^"”'’]{1,120})["”'’]/g) ?? [];
  const flatTerm = term.replace(/\s+/g, '');
  const foldedTerm = phoneticKey(flatTerm);
  return quoted.some((q) => {
    const inside = normalise(q).replace(/\s+/g, '');
    return inside.includes(flatTerm) || phoneticKey(inside).includes(foldedTerm);
  });
}

/** Whether the text is discussing a word rather than throwing it. */
export function looksLikeMention(raw: string, flat: string, term: string): boolean {
  if (isQuoted(raw, term)) return true;
  // Asterisked out is a strong signal of mention: nobody censors their own abuse.
  if (new RegExp(`\\b${term[0]}[*#@•]{2,}`, 'i').test(raw)) return true;
  return MENTION_FRAMES.some((frame) => frame.test(flat));
}

/**
 * Attacks and dehumanisation built out of ordinary words. These are the ones a
 * vocabulary list cannot reach — "you people should not exist" contains nothing
 * a filter would flag on its own.
 */
const HARASSMENT: { pattern: RegExp; reason: string }[] = [
  { pattern: /\byou\s+(are|re|r)\s+(a|an|such a)?\s*(worthless|pathetic|disgusting|vile|repulsive|useless|stupid|idiot|moron|freak|creep|loser)\b/, reason: 'This is a personal attack on someone.' },
  { pattern: /\b(nobody|no one)\s+(likes|wants|loves)\s+(you|u)\b/, reason: 'This is written to hurt someone.' },
  { pattern: /\byou\s+(should|ought to)\s+(not|never)\s+(exist|have been born)\b/, reason: 'This is written to hurt someone.' },
  { pattern: /\b(you|they|those)\s+(people|lot|kind|sort)\s+(should|need to|ought to|always|never)\b/, reason: 'This targets a group rather than a person.' },
  { pattern: /\b(go\s+back\s+to\s+(your|their)\s+(own\s+)?(country|cou?ntry))\b/, reason: 'This targets someone for where they are from.' },
  { pattern: /\b(subhuman|vermin|parasites?|animals?|scum|filth)\b.*\b(they|them|those people|you people)\b/, reason: 'This describes people as less than human.' },
  { pattern: /\b(they|them|those people|you people)\b.*\b(subhuman|vermin|parasites?|scum|filth)\b/, reason: 'This describes people as less than human.' },
  { pattern: /\b(all|every)\s+\w+s\s+(are|should be)\s+(killed|gassed|deported|removed|exterminated)\b/, reason: 'This calls for harm to a group.' },
  { pattern: /\bshut\s+(the\s+)?up\s+(you|u)\b/, reason: 'This is written to demean someone.' },
  { pattern: /\b(ugly|fat|stupid)\s+(little\s+)?(bitch|cow|pig|rat)\b/, reason: 'This is a personal attack.' },
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
  /\bkill\s+(yourself|urself|yourselves|urselves)\b/,
  /\bgo\s+(and\s+)?die\b/,
  /\bend\s+(your|ur)\s+life\b/,
  /\b(hang|drown|cut)\s+(yourself|urself)\b/,
  /\bdo\s+(the\s+world|us\s+all)\s+a\s+favou?r\s+and\b/,
  /\bthe\s+world\s+(would|d)\s+be\s+better\s+without\s+(you|u)\b/,
  /\bnobody\s+would\s+miss\s+(you|u)\b/,
];

const SEXUAL: RegExp[] = [
  /\bsend\s+(me\s+)?(nudes?|pics?\s+of\s+you)\b/,
  /\bnudes?\s+(please|pls|plz)\b/,
  /\b(want|wanna|like)\s+to\s+see\s+you\s+(naked|nude|undressed)\b/,
  /\b(suck|lick|fondle|grope)\s+(my|your)\b/,
  /\b(horny|aroused)\b.*\byou\b/,
  /\byou\b.*\b(turn\s+me\s+on|make\s+me\s+hard|make\s+me\s+wet)\b/,
  /\b(dick|cock|pussy|tits|boobs|penis|vagina)\s+(pic|photo|picture)s?\b/,
  /\bshow\s+me\s+your\s+(body|tits|ass|dick|cock|pussy)\b/,
  /\b(sleep|hook\s*up|have\s+sex)\s+with\s+(me|you)\b/,
  /\bwhat\s+are\s+you\s+wearing\b/,
];

/** Graphic violence described rather than threatened. */
const GRAPHIC: RegExp[] = [
  /\b(slit|slitting)\s+(his|her|their|your|its)\s+throat\b/,
  /\b(cut|chop|rip|tear)\s+(him|her|them|you|it)\s+(up|open|apart|to pieces)\b/,
  /\bbeat\s+(him|her|them|you|it)\s+(to\s+death|senseless|bloody)\b/,
  /\b(drown|strangle|suffocate|burn)\s+(the|that|your|his|her)\s+(dog|cat|puppy|kitten|pet|animal|baby|kid|child)\b/,
  /\bbash\s+(his|her|their|your)\s+(head|skull)\b/,
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

/** Looks for a term in both the plain and the phonetically folded text. */
function findTerm(flat: string, folded: string, term: string): string | null {
  return findWord(flat, term) ?? findWord(folded, phoneticKey(term));
}

/** The whole check, synchronously. `review` wraps this. */
export function inspect(text: string): Verdict {
  const raw = text.trim();
  if (!raw) return CLEAN;
  const flat = normalise(raw);
  const folded = phoneticKey(flat);

  // Slurs first, and with no way out. Nothing else in the text changes what
  // one of these does to the person who reads it.
  for (const word of SLURS) {
    const hit = findTerm(flat, folded, word);
    if (hit) {
      return {
        level: 'block',
        category: 'slur',
        matched: hit,
        reason: 'That is a slur. It will not be sent, in any context.',
      };
    }
  }

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

  for (const rule of GRAPHIC) {
    const hit = rule.exec(flat);
    if (hit) {
      return {
        level: 'block',
        category: 'threat',
        matched: hit[0],
        reason: 'This describes violence in a way that will not be sent to a neighbour.',
      };
    }
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

  for (const rule of HARASSMENT) {
    const hit = rule.pattern.exec(flat);
    if (hit) return { level: 'block', category: 'harassment', matched: hit[0], reason: rule.reason };
  }

  // Profanity last, because this is the only category where talking about the
  // word is different from using it.
  for (const word of [...PROFANITY, ...PROFANITY_OTHER_LANGUAGES, ...EXTRA_BLOCKED]) {
    const hit = findTerm(flat, folded, word);
    if (hit) {
      if (looksLikeMention(raw, flat, word)) continue;
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

/** Where a hosted moderation model lives, if one is configured. */
const MODEL_URL = import.meta.env?.VITE_MODERATION_URL as string | undefined;

/** How long to wait for it before falling back to the local rules. */
const MODEL_TIMEOUT_MS = 2500;

/**
 * The check every caller in the app uses.
 *
 * The local rules always run first, and a block from them stands — a model is
 * there to catch what rules miss, not to overrule them. If VITE_MODERATION_URL
 * is set, anything the rules let through is then shown to the model, which can
 * only make the verdict stricter.
 *
 * The model is allowed to fail. A moderation service being down must not stop
 * neighbours talking to each other, so a timeout or an error falls back to the
 * local verdict rather than blocking everything or letting everything through.
 */
export async function review(text: string): Promise<Verdict> {
  const local = inspect(text);
  if (local.level === 'block' || !MODEL_URL || !text.trim()) return local;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
    const response = await fetch(MODEL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return local;

    const verdict = (await response.json()) as Partial<Verdict>;
    if (verdict?.level !== 'block' && verdict?.level !== 'warn') return local;
    // Never let a model downgrade a local warning to clean.
    if (local.level === 'warn' && verdict.level === 'warn') return local;
    return {
      level: verdict.level,
      reason: verdict.reason || 'This will not be sent.',
      category: verdict.category,
      matched: verdict.matched,
      fromModel: true,
    };
  } catch {
    return local;
  }
}
