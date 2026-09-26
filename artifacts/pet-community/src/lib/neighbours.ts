/**
 * How close a neighbour is, from the rough area each person chose.
 *
 * Nobody gives an address. Everyone picks a landmark they walk near — a park
 * gate, a street, a trailhead — and the distance between two people is the
 * distance between their two landmarks. That is deliberately blunt: it is
 * enough to say "about a kilometre away" and not enough to say where anyone
 * lives. Sharing even that much is opt-in.
 */

import { LANDMARKS } from './neighborhood-map.ts';

/** The circle the Nearby page describes. */
export const CIRCLE_METRES = 2000;

export function areaNamed(name: string): { name: string; at: { x: number; y: number } } | undefined {
  return LANDMARKS.find((l) => l.name === name);
}

/**
 * Metres between two named areas, or null if either is unknown.
 * Map coordinates are metres, the same units the search model uses.
 */
export function metresBetween(a: string, b: string): number | null {
  const from = areaNamed(a);
  const to = areaNamed(b);
  if (!from || !to) return null;
  return Math.hypot(from.at.x - to.at.x, from.at.y - to.at.y);
}

/**
 * A distance a person would say out loud. Rounded hard on purpose — "0.4 km"
 * rather than "372 m", because the precision would be false either way and the
 * blunter number is the honest one.
 */
export function describeDistance(metres: number): string {
  if (metres < 100) return 'a few doors away';
  if (metres < 1000) return `${(Math.round(metres / 100) / 10).toFixed(1)} km`;
  return `${(Math.round(metres / 100) / 10).toFixed(1)} km`;
}

/** Whether someone falls inside the circle the page promises. */
export function withinCircle(metres: number | null): boolean {
  return metres !== null && metres <= CIRCLE_METRES;
}
