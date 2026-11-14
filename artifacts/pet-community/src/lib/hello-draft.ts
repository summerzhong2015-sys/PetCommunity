/**
 * Who a hello is for.
 *
 * "Draft a friendly hello" on a neighbour's card used to put the text in
 * localStorage and send you to Messages, and nothing travelled with it except
 * the words. Messages then dropped that text into whichever conversation
 * happened to be open, so a hello written for one neighbour arrived addressed
 * to another. The person has to travel with the text, which is what this is.
 *
 * It is a handover between two pages in one browser, so it is small on
 * purpose: a name, their initials, their pet and a line of detail — the same
 * things the inbox needs to show a waiting request. It is read back through
 * `readAddressee`, which trusts nothing: a half-written or hand-edited value
 * reads as "no addressee", and Messages then behaves as if you had arrived
 * there yourself.
 */

export type Addressee = {
  id: string;
  name: string;
  initials: string;
  pet: string;
  detail: string;
};

/** The longest any one field can be. Beyond this it is not a name. */
const MAX_FIELD = 120;

function text(value: unknown, limit = MAX_FIELD): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

/** Initials for someone who did not bring their own. */
export function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.slice(0, 2).map((part) => part[0]).join('');
  return letters.toUpperCase();
}

export function writeAddressee(person: {
  id: string;
  name: string;
  initials?: string;
  pet?: string;
  detail?: string;
}): string {
  const name = text(person.name);
  return JSON.stringify({
    id: text(person.id),
    name,
    initials: text(person.initials) || initialsOf(name),
    pet: text(person.pet),
    detail: text(person.detail),
  });
}

/**
 * Read it back. An id and a name are the minimum — without them there is
 * nobody to address, and we would rather open an empty inbox than guess.
 */
export function readAddressee(raw: string | null | undefined): Addressee | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const row = parsed as Record<string, unknown>;
  const id = text(row.id);
  const name = text(row.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    initials: text(row.initials) || initialsOf(name),
    pet: text(row.pet),
    detail: text(row.detail),
  };
}
