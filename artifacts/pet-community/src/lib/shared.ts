/**
 * The shared copy of what the neighbourhood has done.
 *
 * Everything in this app used to live in the browser it happened in: you could
 * donate and watch the total move, but only you ever saw it move. This is the
 * layer that makes it real — one list per thing that other people should see,
 * read from the server and appended to by anybody.
 *
 * Three rules it works by:
 *
 * 1. It never blocks the page. The local copy renders immediately and the
 *    shared copy merges in when it arrives, so a slow network looks like a
 *    slightly late update rather than a blank screen.
 * 2. It always works. If the shared store is not set up, or the network is
 *    gone, every write still lands in this browser and the app behaves exactly
 *    as it did before. `status` says which of the two you are looking at, so
 *    the interface can be honest about it rather than implying an audience
 *    that is not there.
 * 3. Nothing personal goes in it. Your profile, your saved animals, your
 *    drafts stay on your machine. Without real accounts, sharing those would
 *    be a privacy mistake rather than a feature.
 */

export type SharedCollection = 'posts' | 'comments' | 'donations' | 'lost' | 'sightings' | 'reunions';

/** Anything shared carries an id, so a late echo of your own write is not a duplicate. */
export type SharedItem = { id: string } & Record<string, unknown>;

export type SharedStatus = 'local' | 'loading' | 'shared' | 'offline';

export const ENDPOINT = '/api/state';

/** How often to look for other people's changes. Often enough to feel live, rare enough to be free. */
export const POLL_MS = 20_000;

/** Local mirror, so a reload shows your own work even when the store is unreachable. */
export function localKey(collection: SharedCollection): string {
  return `pc-shared-${collection}`;
}

/**
 * Merge what the server has with what this browser has.
 *
 * The server wins on anything it knows about, because that is the copy
 * everyone else can see; our own unsent items are kept and appended so a
 * donation made while offline is not silently lost. Order is by `at` when the
 * items carry one, so two people's writes interleave by time rather than by
 * who happened to sync last.
 */
export function merge(mine: SharedItem[], theirs: SharedItem[]): SharedItem[] {
  const seen = new Map<string, SharedItem>();
  for (const item of theirs) if (item && typeof item.id === 'string') seen.set(item.id, item);
  for (const item of mine) if (item && typeof item.id === 'string' && !seen.has(item.id)) seen.set(item.id, item);
  return [...seen.values()].sort((a, b) => {
    const at = typeof a.at === 'number' ? a.at : 0;
    const bt = typeof b.at === 'number' ? b.at : 0;
    return at - bt;
  });
}

/** Only things that could have come from us: an object with a string id. */
export function readList(value: unknown): SharedItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SharedItem =>
      Boolean(item) && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string',
  );
}

/** A plain id that does not need a library. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
