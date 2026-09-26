/**
 * Asking a neighbour if you can message them.
 *
 * A conversation does not start because you decided it should. You send a
 * request with a short hello, it sits waiting, and it becomes a thread only if
 * they say yes. That ordering is the whole point — it is what stops an inbox
 * being a place strangers can put things.
 *
 * WHAT IS REAL AND WHAT IS NOT: everything here — the request, the waiting, the
 * accepted thread, the decline — is the real shape and is what a server would
 * drive. But there is no server and no other people yet, so nobody is on the
 * other end to press accept. `SIMULATED_REPLY_MS` is the demo standing in for
 * a neighbour, and the app says so on screen rather than letting it look like
 * someone answered. When there is a backend, `accept` and `decline` get called
 * by it instead of by a timer and nothing else here changes.
 */

export type ThreadState = 'pending' | 'open' | 'declined';

export type Message = { from: 'them' | 'me'; text: string; time: string };

export type Thread = {
  id: string;
  /** The neighbour this is with, when it began as a request. */
  neighbourId?: string;
  name: string;
  initials: string;
  pet: string;
  preview: string;
  messages: Message[];
  state: ThreadState;
  /** What you wrote when you asked. */
  opener?: string;
  requestedAt?: number;
};

/** How long the demo waits before a neighbour "answers". */
export const SIMULATED_REPLY_MS = 6000;

/** The longest a hello can be. Long enough to say why, short enough to read. */
export const OPENER_LIMIT = 240;

/**
 * Who you can still ask: everyone in the circle you do not already have a
 * thread with, pending or open. A declined request does not hide someone
 * forever — people change their minds — but it is not offered first either.
 */
export function askable<T extends { id: string }>(neighbours: T[], threads: Thread[]): T[] {
  const spokenFor = new Set(
    threads.filter((t) => t.state !== 'declined').map((t) => t.neighbourId).filter(Boolean) as string[],
  );
  return neighbours.filter((n) => !spokenFor.has(n.id));
}

/** Whether a hello is worth sending. */
export function checkOpener(text: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'Say something first — even just hello.' };
  if (trimmed.length > OPENER_LIMIT) {
    return { ok: false, reason: `That is a bit long for a first hello. Keep it under ${OPENER_LIMIT} characters.` };
  }
  return { ok: true };
}

export type NeighbourLike = {
  id: string;
  name: string;
  initials: string;
  pet: string;
};

/** A request, waiting on them. */
export function requestThread(neighbour: NeighbourLike, opener: string, now = Date.now()): Thread {
  const text = opener.trim();
  return {
    id: `req-${neighbour.id}-${now}`,
    neighbourId: neighbour.id,
    name: neighbour.name,
    initials: neighbour.initials,
    pet: neighbour.pet,
    preview: 'Waiting for them to accept',
    messages: [],
    state: 'pending',
    opener: text,
    requestedAt: now,
  };
}

/**
 * They said yes. The hello you sent becomes the first message — it was already
 * written, and making someone retype it would be daft.
 */
export function accept(thread: Thread, time: string): Thread {
  if (thread.state !== 'pending') return thread;
  const opener = thread.opener?.trim();
  const messages: Message[] = opener ? [{ from: 'me', text: opener, time }] : [];
  return {
    ...thread,
    state: 'open',
    messages,
    preview: opener ?? 'Say hello',
  };
}

/** They said no. The hello is dropped rather than kept on file. */
export function decline(thread: Thread): Thread {
  if (thread.state !== 'pending') return thread;
  return { ...thread, state: 'declined', opener: undefined, preview: 'Not right now', messages: [] };
}

/** Threads worth showing in the inbox, newest request first. */
export function inbox(threads: Thread[]): Thread[] {
  return threads
    .filter((t) => t.state !== 'declined')
    .sort((a, b) => {
      if (a.state !== b.state) return a.state === 'pending' ? -1 : 1;
      return (b.requestedAt ?? 0) - (a.requestedAt ?? 0);
    });
}

/** Whether a thread can be typed into yet. */
export function canSend(thread: Thread | undefined): boolean {
  return thread?.state === 'open';
}
