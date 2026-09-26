/**
 * Taking a photo off someone's phone or laptop and making it small enough to
 * keep.
 *
 * Profiles live in this browser's storage, which is a handful of megabytes for
 * the whole app — a single photo straight off a phone camera is often larger
 * than that on its own, and writing one would not just fail, it would take the
 * rest of the profile down with it. So every picture is redrawn at a sane size
 * and re-encoded before it is stored, and the result is checked against a
 * budget before it is handed back.
 */

/** The longest edge we keep. Avatars are never shown larger than this. */
export const MAX_EDGE = 384;

/** Refuse anything that would crowd out the rest of the profile. */
export const MAX_STORED_BYTES = 180_000;

/** What a file picker should offer, and what we will actually decode. */
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

/** Anything above this we will not even try to decode. */
export const MAX_SOURCE_BYTES = 25_000_000;

export type Rejection = { ok: false; reason: string };
export type Accepted = { ok: true };

/**
 * Whether a chosen file is worth trying to read, with a reason a person can
 * act on rather than a code.
 */
export function checkFile(file: { type: string; size: number; name: string }): Accepted | Rejection {
  if (!file.type.startsWith('image/')) {
    return { ok: false, reason: 'That is not an image — pick a photo from your album.' };
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return { ok: false, reason: 'That photo is enormous. Try one under about 25 MB.' };
  }
  if (file.size === 0) {
    return { ok: false, reason: 'That file is empty.' };
  }
  return { ok: true };
}

/**
 * The size to redraw at: fits inside a square of `max` without stretching, and
 * never scales a small picture up.
 */
export function fitWithin(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: max, height: max };
  }
  const longest = Math.max(width, height);
  if (longest <= max) return { width: Math.round(width), height: Math.round(height) };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * The square to take out of the middle of a photo.
 *
 * Avatars are round, so a portrait shot cropped from the top would be a chin.
 * The centre is the least-wrong default when nobody has said what matters.
 */
export function centreCrop(width: number, height: number): { x: number; y: number; size: number } {
  const size = Math.max(1, Math.min(width, height));
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), size };
}

/** Roughly how many bytes a data URL takes up. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return dataUrl.length;
  const payload = dataUrl.length - comma - 1;
  const padding = dataUrl.endsWith('==') ? 2 : dataUrl.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((payload * 3) / 4) - padding);
}

/** Whether an encoded photo is small enough to keep. */
export function withinBudget(dataUrl: string): boolean {
  return dataUrlBytes(dataUrl) <= MAX_STORED_BYTES;
}

/**
 * Quality steps to try, largest first. A photo that will not fit at the best
 * quality is re-encoded rather than refused.
 */
export const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45];
