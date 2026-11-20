/**
 * Saying out loud whether the app is talking to the shared store.
 *
 * Until now the only time anybody was told was in the toast after posting,
 * which is too late and gone in four seconds. If what you do is not reaching
 * other people, that is the single most useful thing the page can tell you,
 * so it says so where you can see it.
 */

import type { SharedStatus } from './shared.ts';

export type StatusLine = {
  /** What the line says. */
  label: string;
  /** The longer version, for a title attribute or a screen reader. */
  detail: string;
  /** How worried to look. */
  tone: 'good' | 'waiting' | 'alone';
};

export function describeShared(status: SharedStatus): StatusLine {
  switch (status) {
    case 'shared':
      return {
        label: 'Shared with your circle',
        detail: 'You are seeing what your neighbours see, and they can see what you add.',
        tone: 'good',
      };
    case 'loading':
      return {
        label: 'Looking for updates',
        detail: 'Checking the shared copy for anything your neighbours have added.',
        tone: 'waiting',
      };
    case 'offline':
      return {
        label: 'Offline — showing the last copy',
        detail: 'The shared copy cannot be reached. Anything you add is kept here and sent when it comes back.',
        tone: 'alone',
      };
    case 'local':
    default:
      return {
        label: 'This browser only',
        detail: 'Nothing here is reaching anybody else yet. What you add stays on this device.',
        tone: 'alone',
      };
  }
}
