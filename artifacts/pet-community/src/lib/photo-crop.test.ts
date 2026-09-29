/**
 * Tests for the avatar cropper.
 *
 * The window must never escape the photo, never exceed it, and must not jump
 * somewhere else when you zoom — that last one is the difference between a
 * cropper that feels right and one people give up on. Phone-camera aspect
 * ratios are used throughout rather than convenient squares.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:crop
 */

import {
  MAX_ZOOM, MIN_ZOOM,
  centredOffset, clampZoom, cropFor, offsetAfterZoom, previewTransform, windowSize,
} from './photo-crop.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

/** Real shapes: landscape phone, portrait phone, square, panorama, tiny. */
const SHAPES: [number, number, string][] = [
  [4032, 3024, 'landscape phone'],
  [3024, 4032, 'portrait phone'],
  [1000, 1000, 'square'],
  [6000, 1200, 'panorama'],
  [80, 120, 'tiny portrait'],
];

// --- zoom -----------------------------------------------------------------
{
  check('zoom clamps at the bottom', clampZoom(0.2) === MIN_ZOOM);
  check('zoom clamps at the top', clampZoom(99) === MAX_ZOOM);
  check('a sensible zoom is kept', clampZoom(2.5) === 2.5);
  check('nonsense zoom falls back to the minimum', clampZoom(Number.NaN) === MIN_ZOOM);
  check('the range is worth having', MAX_ZOOM - MIN_ZOOM >= 2);
}

// --- the window never escapes --------------------------------------------
for (const [w, h, label] of SHAPES) {
  for (const zoom of [1, 1.5, 2, 3, 4]) {
    // Try to push it well outside in every direction.
    for (const [ox, oy] of [[-9999, -9999], [9999, 9999], [0, 0], [w / 2, h / 2], [-1, h * 2]] as const) {
      const crop = cropFor(w, h, zoom, ox, oy);
      check(`${label} @${zoom}: stays inside the photo`,
        crop.x >= 0 && crop.y >= 0 && crop.x + crop.size <= w && crop.y + crop.size <= h,
        JSON.stringify(crop));
      check(`${label} @${zoom}: is square and real`,
        crop.size > 0 && Number.isInteger(crop.size));
      check(`${label} @${zoom}: never exceeds the shorter edge`,
        crop.size <= Math.min(w, h), `${crop.size} vs ${Math.min(w, h)}`);
    }
  }
}

// --- zoom 1 shows as much as possible -------------------------------------
for (const [w, h, label] of SHAPES) {
  const crop = cropFor(w, h, 1, 0, 0);
  check(`${label}: fully zoomed out fills the shorter edge`, crop.size === Math.min(w, h), `${crop.size}`);
  const zoomed = cropFor(w, h, 4, 0, 0);
  check(`${label}: zooming in shows less`, zoomed.size < crop.size || Math.min(w, h) <= 4);
}

// --- centring -------------------------------------------------------------
{
  const wide = centredOffset(4032, 3024, 1);
  check('a wide photo centres horizontally', wide.x === 504 && wide.y === 0);
  const tall = centredOffset(3024, 4032, 1);
  check('a tall photo centres vertically', tall.y === 504 && tall.x === 0);
  const square = centredOffset(1000, 1000, 1);
  check('a square photo needs no centring', square.x === 0 && square.y === 0);

  for (const [w, h, label] of SHAPES) {
    for (const zoom of [1, 2, 3.5]) {
      const o = centredOffset(w, h, zoom);
      const crop = cropFor(w, h, zoom, o.x, o.y);
      check(`${label} @${zoom}: the centred window is inside`,
        crop.x >= 0 && crop.y >= 0 && crop.x + crop.size <= w && crop.y + crop.size <= h);
    }
  }
}

// --- zooming keeps the same thing in frame --------------------------------
// The one that makes a cropper feel broken if it is wrong.
for (const [w, h, label] of SHAPES) {
  const start = centredOffset(w, h, 1);
  let x = start.x, y = start.y;
  const before = cropFor(w, h, 1, x, y);
  const centreBefore = { x: before.x + before.size / 2, y: before.y + before.size / 2 };

  const moved = offsetAfterZoom(w, h, 1, 2.5, x, y);
  const after = cropFor(w, h, 2.5, moved.x, moved.y);
  const centreAfter = { x: after.x + after.size / 2, y: after.y + after.size / 2 };

  // Allowing a pixel of rounding, and whatever the edge clamp had to take.
  const drift = Math.hypot(centreAfter.x - centreBefore.x, centreAfter.y - centreBefore.y);
  check(`${label}: zooming in keeps the centre`, drift <= Math.max(2, Math.min(w, h) * 0.02), `${drift.toFixed(1)}px`);

  const back = offsetAfterZoom(w, h, 2.5, 1, moved.x, moved.y);
  const returned = cropFor(w, h, 1, back.x, back.y);
  check(`${label}: zooming back out returns to the same view`,
    Math.abs(returned.x - before.x) <= 2 && Math.abs(returned.y - before.y) <= 2,
    `${returned.x},${returned.y} vs ${before.x},${before.y}`);
}

// --- the preview maths ----------------------------------------------------
{
  const crop = cropFor(4032, 3024, 2, 900, 600);
  const t = previewTransform(4032, 3024, crop, 240);

  check('the crop scales to fill the viewport', Math.abs(crop.size * t.scale - 240) < 0.001);
  check('the photo is offset so the crop lands at the corner',
    Math.abs(t.left + crop.x * t.scale) < 0.001 && Math.abs(t.top + crop.y * t.scale) < 0.001);
  check('the photo is drawn at least as large as the viewport',
    t.width >= 240 - 0.001 && t.height >= 240 - 0.001, `${t.width}x${t.height}`);
  check('offsets pull the photo up and left, never down and right', t.left <= 0 && t.top <= 0);

  const whole = previewTransform(1000, 1000, cropFor(1000, 1000, 1, 0, 0), 240);
  check('a square photo at zoom 1 exactly fills the viewport',
    Math.abs(whole.width - 240) < 0.001 && whole.left === 0);
}

// --- nothing crashes ------------------------------------------------------
{
  for (const [w, h] of [[0, 0], [-5, 10], [Number.NaN, 100], [1, 1]] as const) {
    const crop = cropFor(w, h, 2, 10, 10);
    check(`survives a ${w}x${h} photo`, crop.size >= 1 && crop.x >= 0 && crop.y >= 0, JSON.stringify(crop));
  }
  check('windowSize never returns zero', windowSize(0, 0, 4) >= 1);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
