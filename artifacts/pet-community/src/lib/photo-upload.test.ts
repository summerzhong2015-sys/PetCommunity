/**
 * Tests for accepting a photo from someone's album.
 *
 * The failure that matters is not a bad crop, it is a photo big enough to fill
 * the browser's storage quota and take the whole profile down with it. So the
 * budget, the resizing and the rejections all get checked, including the sizes
 * real phone cameras actually produce.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:photo
 */

import {
  ACCEPTED_TYPES, MAX_EDGE, MAX_SOURCE_BYTES, MAX_STORED_BYTES, QUALITY_STEPS,
  centreCrop, checkFile, dataUrlBytes, fitWithin, withinBudget,
} from './photo-upload.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

// --- what we accept -------------------------------------------------------
{
  check('a normal photo is fine', checkFile({ type: 'image/jpeg', size: 3_200_000, name: 'IMG_4021.jpg' }).ok);
  check('a png is fine', checkFile({ type: 'image/png', size: 900_000, name: 'a.png' }).ok);
  check('an iphone heic is fine', checkFile({ type: 'image/heic', size: 2_000_000, name: 'a.heic' }).ok);

  const pdf = checkFile({ type: 'application/pdf', size: 1000, name: 'a.pdf' });
  check('a document is refused', !pdf.ok);
  check('and says what to do instead', !pdf.ok && pdf.reason.includes('photo'));

  const huge = checkFile({ type: 'image/jpeg', size: MAX_SOURCE_BYTES + 1, name: 'raw.jpg' });
  check('an enormous file is refused', !huge.ok);
  check('and the message names a size', !huge.ok && /MB/.test(huge.reason));

  check('an empty file is refused', !checkFile({ type: 'image/jpeg', size: 0, name: 'a.jpg' }).ok);
  check('every accepted type is an image', ACCEPTED_TYPES.every((t) => t.startsWith('image/')));
  check('the picker offers heic, which is what iphones give you', ACCEPTED_TYPES.includes('image/heic'));
}

// --- resizing -------------------------------------------------------------
{
  // A 12-megapixel phone photo.
  const phone = fitWithin(4032, 3024);
  check('a phone photo comes down to the long edge', Math.max(phone.width, phone.height) === MAX_EDGE,
    `${phone.width}x${phone.height}`);
  check('and keeps its shape',
    Math.abs(phone.width / phone.height - 4032 / 3024) < 0.01, `${phone.width}x${phone.height}`);

  const portrait = fitWithin(3024, 4032);
  check('a portrait photo comes down too', Math.max(portrait.width, portrait.height) === MAX_EDGE);
  check('and stays taller than it is wide', portrait.height > portrait.width);

  const small = fitWithin(120, 90);
  check('a small picture is not blown up', small.width === 120 && small.height === 90);

  const exact = fitWithin(MAX_EDGE, MAX_EDGE);
  check('one already at the limit is left alone', exact.width === MAX_EDGE && exact.height === MAX_EDGE);

  const panorama = fitWithin(8000, 400);
  check('a panorama is bounded by its long edge', panorama.width === MAX_EDGE);
  check('and never collapses to nothing', panorama.height >= 1, `${panorama.height}`);

  for (const [w, h] of [[0, 0], [-10, 50], [Number.NaN, 100], [Infinity, 100]] as const) {
    const r = fitWithin(w, h);
    check(`nonsense size ${w}x${h} still yields something drawable`,
      Number.isFinite(r.width) && Number.isFinite(r.height) && r.width > 0 && r.height > 0);
  }
}

// --- the crop -------------------------------------------------------------
{
  const wide = centreCrop(4032, 3024);
  check('a wide photo crops to its height', wide.size === 3024);
  check('and takes from the middle', wide.x === 504 && wide.y === 0);

  const tall = centreCrop(3024, 4032);
  check('a tall photo crops to its width', tall.size === 3024);
  check('taking from the middle, not the top', tall.y === 504);

  const square = centreCrop(500, 500);
  check('a square photo is not moved', square.x === 0 && square.y === 0 && square.size === 500);

  for (const [w, h] of [[4032, 3024], [3024, 4032], [500, 500], [1, 9]] as const) {
    const c = centreCrop(w, h);
    check(`crop ${w}x${h} stays inside the photo`, c.x >= 0 && c.y >= 0 && c.x + c.size <= w && c.y + c.size <= h);
  }
}

// --- the storage budget ---------------------------------------------------
{
  check('an empty payload is nothing', dataUrlBytes('data:image/jpeg;base64,') === 0);
  check('four base64 characters are three bytes', dataUrlBytes('data:image/jpeg;base64,AAAA') === 3);
  check('one pad character is counted', dataUrlBytes('data:image/jpeg;base64,AAA=') === 2);
  check('two pad characters are counted', dataUrlBytes('data:image/jpeg;base64,AA==') === 1);

  const small = `data:image/jpeg;base64,${'A'.repeat(40_000)}`;
  check('a small photo fits', withinBudget(small), `${dataUrlBytes(small)}`);

  const big = `data:image/jpeg;base64,${'A'.repeat(400_000)}`;
  check('a large photo does not', !withinBudget(big), `${dataUrlBytes(big)}`);

  check('the budget leaves room for the rest of the profile', MAX_STORED_BYTES < 250_000);
  check('but is enough for a decent avatar', MAX_STORED_BYTES > 60_000);
}

// --- re-encoding ----------------------------------------------------------
{
  check('there is more than one quality to try', QUALITY_STEPS.length >= 3);
  check('they go from best to worst',
    QUALITY_STEPS.every((q, i) => i === 0 || q < QUALITY_STEPS[i - 1]), QUALITY_STEPS.join(','));
  check('all are sensible jpeg qualities', QUALITY_STEPS.every((q) => q > 0.3 && q <= 1));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
