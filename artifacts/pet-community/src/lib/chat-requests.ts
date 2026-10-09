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

/**
 * Reading a conversation back out of storage.
 *
 * Threads are saved in the browser, and the shape of a thread has changed
 * since the first version of this app: `state` did not exist, so a thread
 * saved back then comes back without one. `canSend` asks whether the state is
 * 'open', `undefined` is not 'open', and the result was that every old
 * conversation sat there saying "waiting for them to accept" with no way to
 * type into it and no request to actually withdraw. It looked like the
 * withdraw button was broken. It was the data that was old.
 *
 * So nothing is trusted on the way in. A thread with messages in it and no
 * state is a conversation that was already happening, and it opens.
 */
export function normaliseThread(value: unknown): Thread | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<Thread> & Record<string, unknown>;
  if (typeof raw.id !== 'string' || raw.id === '') return null;

  const messages: Message[] = Array.isArray(raw.messages)
    ? (raw.messages as unknown[]).filter((m): m is Message => {
        const message = m as Partial<Message>;
        return (message?.from === 'me' || message?.from === 'them') && typeof message.text === 'string';
      }).map((m) => ({ from: m.from, text: m.text, time: typeof m.time === 'string' ? m.time : '' }))
    : [];

  const known: ThreadState[] = ['pending', 'open', 'declined'];
  const state: ThreadState = known.includes(raw.state as ThreadState)
    ? (raw.state as ThreadState)
    // No state saved: if there is a conversation here, it is open. If there is
    // nothing but an opener, it was still a request.
    : messages.length > 0
      ? 'open'
      : typeof raw.opener === 'string' && raw.opener.trim() !== ''
        ? 'pending'
        : 'open';

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'A neighbour';
  return {
    id: raw.id,
    neighbourId: typeof raw.neighbourId === 'string' ? raw.neighbourId : undefined,
    name,
    initials: typeof raw.initials === 'string' && raw.initials.trim()
      ? raw.initials
      : name.slice(0, 2).toUpperCase(),
    pet: typeof raw.pet === 'string' ? raw.pet : '',
    preview: typeof raw.preview === 'string' ? raw.preview : messages[messages.length - 1]?.text ?? '',
    messages,
    state,
    opener: typeof raw.opener === 'string' ? raw.opener : undefined,
    requestedAt: typeof raw.requestedAt === 'number' && Number.isFinite(raw.requestedAt) ? raw.requestedAt : undefined,
  };
}

/** Everything in storage, with anything unreadable dropped rather than crashing. */
export function readThreads(value: unknown, fallback: Thread[]): Thread[] {
  if (!Array.isArray(value)) return fallback;
  const threads = value.map(normaliseThread).filter((t): t is Thread => t !== null);
  return threads.length > 0 ? threads : fallback;
}

/**
 * Take back something you sent.
 *
 * Only your own messages, and the preview follows whatever is left so the
 * list does not go on quoting a line that is no longer in the conversation.
 */
export function unsend(thread: Thread, index: number): Thread {
  const message = thread.messages[index];
  if (!message || message.from !== 'me') return thread;
  const messages = thread.messages.filter((_, i) => i !== index);
  return {
    ...thread,
    messages,
    preview: messages[messages.length - 1]?.text ?? 'You took back the last message',
  };
}
