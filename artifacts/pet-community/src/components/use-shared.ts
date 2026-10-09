/**
 * The hook the pages use: one shared list, and a way to add to it.
 *
 * Reads the shared copy on mount, polls for other people's changes, and keeps
 * writing to this browser as well so nothing is ever lost to a bad network.
 * The page gets `status` so it can say which copy it is showing rather than
 * implying an audience that is not there.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ENDPOINT, POLL_MS, localKey, merge, newId, readList,
  type SharedCollection, type SharedItem, type SharedStatus,
} from '@/lib/shared';

function readLocal(collection: SharedCollection): SharedItem[] {
  try {
    return readList(JSON.parse(localStorage.getItem(localKey(collection)) ?? '[]'));
  } catch {
    return [];
  }
}

function writeLocal(collection: SharedCollection, items: SharedItem[]): void {
  try {
    localStorage.setItem(localKey(collection), JSON.stringify(items));
  } catch {
    /* storage can be full or blocked; the page still works */
  }
}

export function useShared(collection: SharedCollection) {
  const [items, setItems] = useState<SharedItem[]>(() => readLocal(collection));
  const [status, setStatus] = useState<SharedStatus>('loading');
  const alive = useRef(true);

  const pull = useCallback(async () => {
    try {
      const response = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
      if (response.status === 501) {
        // No store connected yet. Not an error — this is the app as it was.
        if (alive.current) setStatus('local');
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { ok?: boolean; state?: Record<string, unknown> };
      if (!body.ok || !body.state) throw new Error('unusable');
      const theirs = readList(body.state[collection]);
      if (!alive.current) return;
      setItems((mine) => {
        const merged = merge(mine, theirs);
        writeLocal(collection, merged);
        return merged;
      });
      setStatus('shared');
    } catch {
      if (alive.current) setStatus((current) => (current === 'shared' ? 'offline' : current === 'loading' ? 'local' : current));
    }
  }, [collection]);

  useEffect(() => {
    alive.current = true;
    void pull();
    const timer = window.setInterval(() => void pull(), POLL_MS);
    // Coming back to the tab is the moment you most want to be up to date.
    const onFocus = () => void pull();
    window.addEventListener('focus', onFocus);
    return () => {
      alive.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [pull]);

  /**
   * Add something. It appears immediately, is written to this browser, and is
   * sent on to everybody else. If that last part fails it stays yours and the
   * next successful pull will not wipe it.
   */
  const add = useCallback(
    async (item: Omit<SharedItem, 'id' | 'at'> & { id?: string; at?: number }) => {
      const complete: SharedItem = { ...item, id: item.id ?? newId(collection), at: item.at ?? Date.now() };
      setItems((mine) => {
        const next = merge([...mine, complete], []);
        writeLocal(collection, next);
        return next;
      });
      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection, item: complete }),
        });
        if (response.status === 501) { setStatus('local'); return complete; }
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { ok?: boolean; items?: unknown };
        if (body.ok && alive.current) {
          const theirs = readList(body.items);
          setItems((mine) => {
            const merged = merge(mine, theirs);
            writeLocal(collection, merged);
            return merged;
          });
          setStatus('shared');
        }
      } catch {
        if (alive.current) setStatus((current) => (current === 'local' ? 'local' : 'offline'));
      }
      return complete;
    },
    [collection],
  );

  return { items, add, status, refresh: pull };
}
