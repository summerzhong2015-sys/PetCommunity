/**
 * Who "you" are, as far as the shared copy is concerned.
 *
 * A random id kept in this browser. It is enough to answer "was this mine?" —
 * which the app needs for your giving history, your own posts, and the
 * donor count — without anybody having to make an account, and without a name,
 * an email or anything else about you reaching the server.
 *
 * It is not a login and it is not a claim about identity: clear your browser
 * and you are a new neighbour. That is the right trade for a demo, and the
 * app says so rather than implying otherwise.
 */

import { newId } from './shared.ts';

const KEY = 'pc-visitor';

let cached: string | null = null;

export function visitorId(): string {
  if (cached) return cached;
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && existing.length > 4) {
      cached = existing;
      return existing;
    }
    const fresh = newId('neighbour');
    localStorage.setItem(KEY, fresh);
    cached = fresh;
    return fresh;
  } catch {
    // Private windows and blocked storage: you are still somebody for this
    // page's lifetime, just not across reloads.
    cached = cached ?? newId('neighbour');
    return cached;
  }
}

/** Whether a shared item came from this browser. */
export function isMine(item: { by?: unknown }): boolean {
  return typeof item.by === 'string' && item.by === visitorId();
}
