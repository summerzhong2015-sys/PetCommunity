/**
 * Tests for the walk-from pin.
 *
 * The two things that matter: a stored pin is never more precise than the grid
 * promises, and the sentence describing it is actually true — right landmark,
 * right direction, rounded distance. A compass word that lies is worse than no
 * compass word.
 *
 * Run with:  node --experimental-strip-types src/lib/area.test.ts
 */

import {
  AREA_STEP, AT_LANDMARK_METRES,
  areaLabel, bearingWord, clampToMap, describeArea, metresBetweenPoints,
  nearestLandmark, pointFor, readArea, roughMetres, snapArea,
} from './area.ts';
import { LANDMARKS, MAP_MAX_X, MAP_MAX_Y, MAP_MIN_X, MAP_MIN_Y } from './neighborhood-map.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

// --- the pin stays on the map --------------------------------------------
{
  const outside = [
    { x: 9999, y: 0 }, { x: -9999, y: 0 }, { x: 0, y: 9999 }, { x: 0, y: -9999 },
    { x: 5000, y: -5000 },
  ];
  for (const point of outside) {
    const inside = clampToMap(point);
    check(`${JSON.stringify(point)} is pulled onto the map`,
      inside.x >= MAP_MIN_X && inside.x <= MAP_MAX_X && inside.y >= MAP_MIN_Y && inside.y <= MAP_MAX_Y,
      JSON.stringify(inside));
  }
  for (const junk of [{ x: Number.NaN, y: 10 }, { x: 10, y: Number.POSITIVE_INFINITY }]) {
    const inside = clampToMap(junk as never);
    check(`${JSON.stringify(junk)} does not produce a NaN pin`,
      Number.isFinite(inside.x) && Number.isFinite(inside.y), JSON.stringify(inside));
  }
}

// --- rounding: never keep more than was promised --------------------------
{
  const samples = [
    { x: 12, y: -37 }, { x: -412, y: 388 }, { x: 0, y: 0 }, { x: 599, y: -449 }, { x: 137.6, y: 92.4 },
  ];
  for (const point of samples) {
    const snapped = snapArea(point);
    check(`${JSON.stringify(point)} lands on the grid`,
      snapped.x % AREA_STEP === 0 && snapped.y % AREA_STEP === 0, JSON.stringify(snapped));
    check(`${JSON.stringify(point)} does not move far`,
      metresBetweenPoints(snapped, clampToMap(point)) <= AREA_STEP, JSON.stringify(snapped));
  }
  check('snapping twice changes nothing',
    JSON.stringify(snapArea(snapArea({ x: 137.6, y: 92.4 }))) === JSON.stringify(snapArea({ x: 137.6, y: 92.4 })));
}

// --- reading a stored pin back --------------------------------------------
{
  for (const junk of [undefined, null, 'somewhere', 42, {}, { x: 1 }, { x: 'a', y: 'b' }, { x: Number.NaN, y: 0 }, []]) {
    check(`rubbish pin ${JSON.stringify(junk)} is dropped`, readArea(junk) === undefined);
  }
  const read = readArea({ x: 137.6, y: -92.4 });
  check('a real pin survives', read !== undefined && read.x % AREA_STEP === 0 && read.y % AREA_STEP === 0, JSON.stringify(read));
  check('an unrounded stored pin is rounded on the way in',
    JSON.stringify(readArea({ x: 137.6, y: -92.4 })) === JSON.stringify(snapArea({ x: 137.6, y: -92.4 })));
}

// --- the nearest landmark -------------------------------------------------
{
  for (const landmark of LANDMARKS) {
    const found = nearestLandmark(landmark.at);
    check(`${landmark.name} finds itself`, found.id === landmark.id, found.name);
    check(`${landmark.name} is zero metres from itself`, found.metres === 0);
    check(`${landmark.name} is its own label`, areaLabel(landmark.at) === landmark.name);
  }
  const spots = [{ x: 0, y: 0 }, { x: -500, y: -400 }, { x: 580, y: 410 }, { x: 25, y: 180 }];
  for (const spot of spots) {
    const found = nearestLandmark(spot);
    const closer = LANDMARKS.filter((l) => metresBetweenPoints(spot, l.at) < found.metres - 1e-9);
    check(`nothing is closer to ${JSON.stringify(spot)} than ${found.name}`, closer.length === 0, closer.map((l) => l.name).join(','));
  }
}

// --- compass words --------------------------------------------------------
{
  const origin = { x: 0, y: 0 };
  const cases: [number, number, string][] = [
    [0, 100, 'north'], [0, -100, 'south'], [100, 0, 'east'], [-100, 0, 'west'],
    [100, 100, 'north-east'], [-100, 100, 'north-west'], [100, -100, 'south-east'], [-100, -100, 'south-west'],
  ];
  for (const [x, y, word] of cases) {
    check(`(${x}, ${y}) is ${word}`, bearingWord(origin, { x, y }) === word, bearingWord(origin, { x, y }));
  }
  check('a point on top of itself still answers', typeof bearingWord(origin, origin) === 'string');
  check('due north and due south disagree',
    bearingWord(origin, { x: 0, y: 100 }) !== bearingWord(origin, { x: 0, y: -100 }));
  check('east of a landmark is west of the pin',
    bearingWord({ x: 0, y: 0 }, { x: 100, y: 0 }) === 'east' && bearingWord({ x: 100, y: 0 }, { x: 0, y: 0 }) === 'west');
}

// --- rounded distances ----------------------------------------------------
{
  check('a short hop is never rounded to zero', roughMetres(10) === `${AREA_STEP} m`, roughMetres(10));
  check('170 m rounds to 150 m', roughMetres(170) === '150 m', roughMetres(170));
  check('980 m stays in metres', roughMetres(980).endsWith(' m'), roughMetres(980));
  check('1200 m becomes km', roughMetres(1200) === '1.2 km', roughMetres(1200));
  for (const metres of [0, 1, 49, 51, 999, 1000, 2500]) {
    check(`${metres} m reads as something`, /\d/.test(roughMetres(metres)) && !/NaN/.test(roughMetres(metres)), roughMetres(metres));
  }
}

// --- the sentence ---------------------------------------------------------
{
  for (const landmark of LANDMARKS) {
    const here = describeArea(landmark.at);
    check(`standing at ${landmark.name} just names it`, here === `right by ${landmark.name}`, here);
  }
  // The cemetery, because it is the one landmark with nothing else within a
  // few hundred metres of it — so the sentence has to name it.
  const garden = LANDMARKS.find((l) => l.id === 'cemetery')!;
  const north = describeArea({ x: garden.at.x, y: garden.at.y + 300 });
  check('a spot north of a landmark says north', north.includes('north'), north);
  check('a spot north of a landmark names that landmark', north.includes(garden.name), north);
  const nudged = describeArea({ x: garden.at.x + AT_LANDMARK_METRES - 10, y: garden.at.y });
  check('just inside the landmark still counts as being there', nudged.startsWith('right by'), nudged);
  for (const spot of [{ x: 0, y: 0 }, { x: -600, y: -450 }, { x: 600, y: 450 }, { x: 123, y: -321 }]) {
    const line = describeArea(spot);
    check(`${JSON.stringify(spot)} reads cleanly`, !/undefined|NaN|null/.test(line), line);
  }
}

// --- pin or landmark, one set of units ------------------------------------
{
  const pin = { x: 100, y: 100 };
  check('a pin wins', JSON.stringify(pointFor(pin, 'Five Corners')) === JSON.stringify(pin));
  check('a landmark fills in',
    JSON.stringify(pointFor(undefined, 'Five Corners')) === JSON.stringify(LANDMARKS.find((l) => l.name === 'Five Corners')!.at));
  check('neither gives nothing', pointFor(undefined, undefined) === null);
  check('an unknown landmark gives nothing', pointFor(undefined, 'Atlantis') === null);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
