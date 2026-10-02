/**
 * Tests for the avatar frames.
 *
 * Decorative does not mean it can be wrong. A frame that eats the face, a
 * scallop that does not close, or a saved id that no longer exists all show up
 * on someone's own picture, which is the last place to find a bug.
 *
 * Run with:  node --experimental-strip-types src/lib/avatar-frame.test.ts
 */

import {
  DEFAULT_FRAME, FRAMES,
  circleSubpath, framePadding, normaliseFrame, ringPoints, scallopPath, scallopRing,
  type FrameId,
} from './avatar-frame.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

// --- the catalogue --------------------------------------------------------
{
  check('there is more than one thing to choose from', FRAMES.length >= 5, String(FRAMES.length));
  const ids = FRAMES.map((f) => f.id);
  check('no id appears twice', new Set(ids).size === ids.length, ids.join(','));
  check('plain is one of the options', ids.includes('none'));
  check('the default is a real frame', ids.includes(DEFAULT_FRAME));
  for (const frame of FRAMES) {
    check(`${frame.id} has a label`, frame.label.trim().length > 0);
    check(`${frame.id} has a hint`, frame.hint.trim().length > 0);
    check(`${frame.id} reads like a person wrote it`, frame.label === frame.label.trim() && !/^frame/i.test(frame.label));
  }
}

// --- a saved choice survives, and rubbish does not crash ------------------
{
  for (const frame of FRAMES) {
    check(`${frame.id} round-trips`, normaliseFrame(frame.id) === frame.id);
  }
  const rubbish = [undefined, null, '', 'sparkles', 42, {}, [], true, 'NONE', ' ring'];
  for (const value of rubbish) {
    check(`falls back on ${JSON.stringify(value)}`, normaliseFrame(value) === DEFAULT_FRAME);
  }
}

// --- padding: enough room for the art, never enough to hide the pet -------
{
  check('plain takes no room at all', framePadding('none') === 0);
  for (const frame of FRAMES) {
    const pad = framePadding(frame.id);
    check(`${frame.id} padding is sane`, pad >= 0 && pad <= 14, String(pad));
    if (frame.id !== 'none') {
      check(`${frame.id} leaves room for its art`, pad >= 5, String(pad));
      check(`${frame.id} still shows most of the photo`, 100 - pad * 2 >= 70, String(100 - pad * 2));
    }
  }
  check('an unknown id costs nothing', framePadding('mystery' as FrameId) === 0);
}

// --- ringPoints: evenly spaced, on the circle, never empty ----------------
{
  for (const count of [1, 2, 3, 8, 10, 16, 24]) {
    const points = ringPoints(count, 40);
    check(`${count} points asked for, ${count} returned`, points.length === count);
    const offCircle = points.filter((p) => Math.abs(Math.hypot(p.x - 50, p.y - 50) - 40) > 1e-6);
    check(`${count} points all sit on the circle`, offCircle.length === 0, JSON.stringify(offCircle[0] ?? {}));
  }
  const eight = ringPoints(8, 40);
  const gaps = eight.map((p, i) => (i === 0 ? 45 : p.angle - eight[i - 1].angle));
  check('they are evenly spaced', gaps.every((g) => Math.abs(g - 45) < 1e-9), gaps.join(','));
  check('the first one is at the top', Math.abs(eight[0].x - 50) < 1e-9 && eight[0].y < 50);

  check('zero points still gives you one', ringPoints(0, 40).length === 1);
  check('a negative count still gives you one', ringPoints(-4, 40).length === 1);
  check('a fractional count is rounded', ringPoints(6.4, 40).length === 6);
  check('a different centre moves them', ringPoints(4, 10, 20, 30)[0].x === 20);
}

// --- the scallop path -----------------------------------------------------
{
  const path = scallopPath();
  check('it starts with a move', path.startsWith('M '));
  check('it closes', path.trimEnd().endsWith('Z'));
  check('it is all curves after the move', (path.match(/Q /g) ?? []).length === 16, path.slice(0, 40));
  check('no NaN got in', !/NaN|Infinity|undefined/.test(path));

  const numbers = path.match(/-?\d+\.?\d*/g)!.map(Number);
  check('every number is finite', numbers.every(Number.isFinite));
  check('it stays inside the box', numbers.every((n) => n >= -1 && n <= 101), String(numbers.find((n) => n < -1 || n > 101)));

  const bumpy = scallopPath(24, 40, 6);
  check('more bumps, more curves', (bumpy.match(/Q /g) ?? []).length === 24);
  const flat = scallopPath(16, 44, 0);
  check('no depth still draws a closed shape', flat.startsWith('M ') && flat.trimEnd().endsWith('Z'));

  const pad = framePadding('scallop');
  check('the scallop clears the inset photo', 44 + 5 > 50 - pad, `${44 + 5} vs ${50 - pad}`);
}

// --- the scallop must be a band, not a disc ------------------------------
// It was a disc once, and it covered the entire face. Never again.
{
  const hole = circleSubpath(39.5);
  check('the hole is its own subpath', hole.startsWith('M ') && hole.trimEnd().endsWith('Z'));
  check('the hole is drawn with arcs', (hole.match(/ a /g) ?? []).length === 2, hole);
  check('the hole has no NaN', !/NaN|undefined/.test(hole));
  check('a zero radius still draws something', circleSubpath(0).length > 0);

  const ring = scallopRing();
  check('the band has two subpaths', (ring.match(/M /g) ?? []).length === 2, ring.slice(0, 30));
  check('the band closes twice', (ring.match(/Z/g) ?? []).length === 2);
  // The hole has to be wider than the photo underneath, or the band covers it.
  check('the hole clears the photo', 39.5 < 50 - framePadding('scallop') + 2, String(50 - framePadding('scallop')));
  check('the hole sits inside the petals', 39.5 < 43);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
