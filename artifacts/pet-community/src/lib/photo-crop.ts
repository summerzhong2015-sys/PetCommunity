/**
 * Choosing which part of a photo becomes the avatar.
 *
 * The picker used to take a square out of the middle and that was that, which
 * is fine for a head-on portrait and wrong for almost everything else — a dog
 * lying at the left of a wide photo ends up as a square of grass.
 *
 * So the crop is now a window the person moves and resizes over their photo.
 * The maths here is the part worth getting right and worth testing: the window
 * must never leave the image, must never be bigger than the image, and must
 * behave the same whether the photo is wide, tall, tiny or enormous.
 *
 * Coordinates are in source-image pixels throughout. `zoom` is how much of the
 * shorter edge the window covers: zoom 1 fits the whole of it, zoom 3 shows a
 * third of it. Offsets are the window's top-left corner.
 */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export type Crop = { x: number; y: number; size: number };

/** Keep a zoom inside the range the slider offers. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** The side length of the crop window at a given zoom. */
export function windowSize(width: number, height: number, zoom: number): number {
  const w = Number.isFinite(width) ? width : 1;
  const h = Number.isFinite(height) ? height : 1;
  const shortest = Math.max(1, Math.min(w, h));
  return Math.max(1, Math.round(shortest / clampZoom(zoom)));
}

/**
 * The crop, clamped so it always sits fully inside the photo.
 *
 * Clamping rather than refusing is deliberate: dragging a picture should feel
 * like it stops at the edge, not like it rejected you.
 */
export function cropFor(
  width: number,
  height: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): Crop {
  // A non-finite dimension has to become a number here, not propagate through
  // Math.round as NaN and come out the far end as a crop of null pixels.
  const w = Number.isFinite(width) ? Math.max(1, Math.round(width)) : 1;
  const h = Number.isFinite(height) ? Math.max(1, Math.round(height)) : 1;
  const size = Math.min(windowSize(w, h, zoom), w, h);
  const maxX = w - size;
  const maxY = h - size;
  const x = Math.round(Math.min(maxX, Math.max(0, Number.isFinite(offsetX) ? offsetX : 0)));
  const y = Math.round(Math.min(maxY, Math.max(0, Number.isFinite(offsetY) ? offsetY : 0)));
  return { x, y, size };
}

/** Where the window sits if nobody has moved it: the middle. */
export function centredOffset(width: number, height: number, zoom: number): { x: number; y: number } {
  const size = Math.min(windowSize(width, height, zoom), width, height);
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2) };
}

/**
 * Keep the same part of the photo in the middle of the window when zooming.
 *
 * Without this, zooming in jumps somewhere else and you have to drag back —
 * the single thing that makes a cropper feel broken.
 */
export function offsetAfterZoom(
  width: number,
  height: number,
  fromZoom: number,
  toZoom: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } {
  const before = cropFor(width, height, fromZoom, offsetX, offsetY);
  const centreX = before.x + before.size / 2;
  const centreY = before.y + before.size / 2;
  const after = Math.min(windowSize(width, height, toZoom), width, height);
  const next = cropFor(width, height, toZoom, centreX - after / 2, centreY - after / 2);
  return { x: next.x, y: next.y };
}

/**
 * How to draw the photo inside a square preview of `viewport` pixels, so the
 * chosen crop fills it exactly. Returns CSS pixel values.
 */
export function previewTransform(
  width: number,
  height: number,
  crop: Crop,
  viewport: number,
): { scale: number; left: number; top: number; width: number; height: number } {
  const scale = viewport / Math.max(1, crop.size);
  return {
    scale,
    left: -crop.x * scale,
    top: -crop.y * scale,
    width: width * scale,
    height: height * scale,
  };
}
