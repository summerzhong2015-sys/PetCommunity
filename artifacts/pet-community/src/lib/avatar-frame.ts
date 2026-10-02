/**
 * A frame around a profile picture.
 *
 * Purely decorative, and that is the point — it is the one place in the app
 * where someone gets to make a choice that is about nothing except liking it.
 *
 * Every frame is drawn from the section's own tokens (`--accent`,
 * `--primary`), so a frame picked on the profile page still looks like it
 * belongs when the same avatar turns up in a green Walks tab or a plum Chip in
 * tab. Nothing here hardcodes a colour.
 *
 * Frames are geometry in a 0–100 square, so they scale to any avatar size
 * without a second set of numbers.
 */

export type FrameId = 'none' | 'ring' | 'scallop' | 'paws' | 'daisy' | 'stitch' | 'tag';

export type Frame = {
  id: FrameId;
  label: string;
  /** One line for the picker. */
  hint: string;
};

export const FRAMES: Frame[] = [
  { id: 'none', label: 'Plain', hint: 'Just the photo' },
  { id: 'ring', label: 'Ring', hint: 'A simple band' },
  { id: 'scallop', label: 'Scallop', hint: 'Soft petal edge' },
  { id: 'paws', label: 'Paw prints', hint: 'Prints around the rim' },
  { id: 'daisy', label: 'Daisy', hint: 'A flower border' },
  { id: 'stitch', label: 'Stitched', hint: 'Like a sewn patch' },
  { id: 'tag', label: 'Name tag', hint: 'A collar tag, with a loop' },
];

export const DEFAULT_FRAME: FrameId = 'none';

/** Only an id we actually draw. Anything else falls back rather than vanishing. */
export function normaliseFrame(value: unknown): FrameId {
  return FRAMES.some((f) => f.id === value) ? (value as FrameId) : DEFAULT_FRAME;
}

/**
 * How much room the frame needs around the picture, as a percentage of the
 * avatar's width. The photo is inset by this much so a frame never crops it.
 */
export function framePadding(id: FrameId): number {
  switch (id) {
    case 'none':
      return 0;
    case 'ring':
    case 'stitch':
      return 6;
    case 'scallop':
    case 'daisy':
      return 9;
    case 'paws':
      return 12;
    case 'tag':
      return 11;
    default:
      return 0;
  }
}

/** Points evenly around a circle, for the frames built from repeated shapes. */
export function ringPoints(count: number, radius: number, cx = 50, cy = 50, startAngle = -90): { x: number; y: number; angle: number }[] {
  const safeCount = Math.max(1, Math.round(count));
  return Array.from({ length: safeCount }, (_, i) => {
    const angle = startAngle + (360 / safeCount) * i;
    const radians = (angle * Math.PI) / 180;
    return {
      x: cx + Math.cos(radians) * radius,
      y: cy + Math.sin(radians) * radius,
      angle,
    };
  });
}

/** The scalloped outline, as an SVG path. */
export function scallopPath(bumps = 16, radius = 44, depth = 5): string {
  const points = ringPoints(bumps, radius);
  const parts: string[] = [];
  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length];
    if (i === 0) parts.push(`M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
    // A bulge outward between each pair of points.
    const midAngle = ((point.angle + 360 / bumps / 2) * Math.PI) / 180;
    const cx = 50 + Math.cos(midAngle) * (radius + depth);
    const cy = 50 + Math.sin(midAngle) * (radius + depth);
    parts.push(`Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`);
  });
  parts.push('Z');
  return parts.join(' ');
}

/**
 * A circle written as its own subpath, so it can punch a hole in the shape
 * before it under `fill-rule="evenodd"`. Without this a filled frame covers
 * the face it is supposed to be framing — which is exactly what the scallop
 * did until a render of it said otherwise.
 */
export function circleSubpath(radius: number, cx = 50, cy = 50): string {
  const r = Math.max(0.01, radius);
  return (
    `M ${(cx - r).toFixed(2)} ${cy.toFixed(2)} ` +
    `a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(r * 2).toFixed(2)} 0 ` +
    `a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-r * 2).toFixed(2)} 0 Z`
  );
}

/** The scallop as a band rather than a disc: petal edge, hollow middle. */
export function scallopRing(bumps = 16, radius = 43, depth = 6, hole = 39.5): string {
  return `${scallopPath(bumps, radius, depth)} ${circleSubpath(hole)}`;
}
