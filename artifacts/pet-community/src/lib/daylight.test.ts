/**
 * Tests for the drifting sky.
 *
 * The thing that would actually break this feature is a palette that goes dark:
 * the app's text colour never changes, so a genuinely black night sky would
 * make the page header unreadable at 11pm and nobody would see it in testing
 * because tests usually run in the afternoon. So the first rule checked here is
 * that every minute of the day produces a light background.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:daylight
 */

import { hourOf, mix, orbPosition, sceneAt, showsStars, type Scene } from './daylight.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

const at = (h: number, m = 0) => new Date(2026, 0, 15, h, m, 0);

/** Rough perceived lightness, 0 black to 1 white. */
function luminance(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// --- mixing ---------------------------------------------------------------
{
  check('mix at 0 is the first colour', mix('#102030', '#a0b0c0', 0) === '#102030');
  check('mix at 1 is the second colour', mix('#102030', '#a0b0c0', 1) === '#a0b0c0');
  check('mix halfway lands between', mix('#000000', '#ffffff', 0.5) === '#808080', mix('#000000', '#ffffff', 0.5));
  check('mix clamps below zero', mix('#102030', '#a0b0c0', -3) === '#102030');
  check('mix clamps above one', mix('#102030', '#a0b0c0', 9) === '#a0b0c0');
  check('mix always returns six hex digits',
    [0, 0.1, 0.33, 0.5, 0.77, 1].every((t) => /^#[0-9a-f]{6}$/.test(mix('#0a1b2c', '#fdecdb', t))));
}

// --- the clock ------------------------------------------------------------
{
  check('hourOf reads the hour', Math.floor(hourOf(at(13, 30))) === 13);
  check('hourOf reads the minutes', Math.abs(hourOf(at(13, 30)) - 13.5) < 0.001);
  check('midnight is zero', hourOf(at(0, 0)) === 0);
}

// --- every minute of the day ----------------------------------------------
{
  const scenes: Scene[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) scenes.push(sceneAt(at(h, m)));
  }

  check('every minute produces a scene', scenes.length === 24 * 12);

  check('every colour is a valid hex',
    scenes.every((s) => [s.skyTop, s.skyLow, s.glow, s.hills, s.land, s.orb].every((c) => /^#[0-9a-f]{6}$/.test(c))));

  // The one that matters: text stays dark, so the sky must stay light.
  const darkest = scenes.reduce((low, s) => Math.min(low, luminance(s.skyTop), luminance(s.skyLow)), 1);
  check('the sky never goes dark enough to swallow the text', darkest > 0.6, `darkest ${darkest.toFixed(3)}`);

  const lightest = scenes.reduce((high, s) => Math.max(high, luminance(s.skyTop)), 0);
  check('the sky is never blown out white', lightest < 0.98, `lightest ${lightest.toFixed(3)}`);

  check('night is always between none and all',
    scenes.every((s) => s.night >= 0 && s.night <= 1));

  check('the land is always darker than the sky above it',
    scenes.every((s) => luminance(s.land) < luminance(s.skyLow)));

  check('the hills sit between the land and the sky',
    scenes.every((s) => luminance(s.land) <= luminance(s.hills) && luminance(s.hills) <= luminance(s.skyTop) + 0.02));
}

// --- it actually drifts ----------------------------------------------------
{
  const morning = sceneAt(at(9));
  const evening = sceneAt(at(20));
  check('morning and evening do not look the same', morning.skyLow !== evening.skyLow);
  check('night is higher in the evening than at nine', evening.night > morning.night);

  const noon = sceneAt(at(12));
  const golden = sceneAt(at(18));
  check('noon and golden hour differ', noon.skyLow !== golden.skyLow);

  // No jumps: five minutes apart should be a small step, all day long.
  let biggestStep = 0;
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const a = sceneAt(at(h, m));
      const next = m + 5 < 60 ? sceneAt(at(h, m + 5)) : sceneAt(at((h + 1) % 24, 0));
      biggestStep = Math.max(biggestStep, Math.abs(luminance(a.skyLow) - luminance(next.skyLow)));
    }
  }
  check('the colour never jumps between one minute and the next', biggestStep < 0.02, `biggest ${biggestStep.toFixed(4)}`);

  // Midnight wraps to the small hours rather than snapping to a new palette.
  const beforeMidnight = sceneAt(at(23, 55));
  const afterMidnight = sceneAt(at(0, 5));
  check('midnight is not a seam',
    Math.abs(luminance(beforeMidnight.skyTop) - luminance(afterMidnight.skyTop)) < 0.02);
}

// --- naming ---------------------------------------------------------------
{
  check('the small hours are night', sceneAt(at(3)).phase === 'night');
  check('seven is dawn', sceneAt(at(7)).phase === 'dawn');
  check('ten is morning', sceneAt(at(10)).phase === 'morning');
  check('one in the afternoon is midday', sceneAt(at(13)).phase === 'midday');
  check('six is golden', sceneAt(at(18)).phase === 'golden');
  check('half eight is dusk or night', ['dusk', 'night'].includes(sceneAt(at(20, 30)).phase));
  check('every scene is labelled', [0, 5, 9, 13, 18, 21].every((h) => sceneAt(at(h)).label.length > 2));
  check('midday does not linger into the afternoon', sceneAt(at(15)).label !== 'Midday');
}

// --- stars ----------------------------------------------------------------
{
  check('no stars at noon', !showsStars(sceneAt(at(12))));
  check('no stars mid-morning', !showsStars(sceneAt(at(10))));
  check('stars at eleven at night', showsStars(sceneAt(at(23))));
  check('stars in the small hours', showsStars(sceneAt(at(2))));
}

// --- the sun and moon arc --------------------------------------------------
{
  const positions = [];
  for (let h = 0; h < 24; h++) positions.push(orbPosition(at(h)));

  check('the orb stays inside the scene',
    positions.every((p) => p.x >= 0 && p.x <= 1 && p.y >= -0.1 && p.y <= 1), JSON.stringify(positions[0]));

  const dawn = orbPosition(at(7));
  const noon = orbPosition(at(13));
  const evening = orbPosition(at(19));
  check('the sun climbs from morning to midday', noon.y < dawn.y);
  check('the sun sinks from midday to evening', evening.y > noon.y);
  check('the sun crosses the sky left to right', dawn.x < noon.x && noon.x < evening.x);
  check('it is highest around the early afternoon',
    positions.slice(6, 20).every((p) => p.y >= noon.y - 0.001));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
