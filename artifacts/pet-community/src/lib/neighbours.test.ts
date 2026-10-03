/**
 * Tests for neighbour distance.
 *
 * This is the one piece of the app that touches where someone lives, so the
 * things worth proving are: it only ever works from the coarse landmark list,
 * an unknown or unshared area yields nothing rather than a guess, and the
 * circle the page promises is the circle it actually applies.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:neighbours
 */

import { LANDMARKS } from './neighborhood-map.ts';
import { CIRCLE_METRES, areaNamed, describeDistance, metresBetween, withinCircle } from './neighbours.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

check('there are areas to choose from', LANDMARKS.length >= 6, `${LANDMARKS.length}`);
check('every area has a name and a position',
  LANDMARKS.every((l) => l.name.length > 2 && Number.isFinite(l.at.x) && Number.isFinite(l.at.y)));
check('area names are unique', new Set(LANDMARKS.map((l) => l.name)).size === LANDMARKS.length);

{
  const a = LANDMARKS[0], b = LANDMARKS[1];
  check('a known pair has a distance', typeof metresBetween(a.name, b.name) === 'number');
  check('distance to yourself is nothing', metresBetween(a.name, a.name) === 0);
  check('distance is symmetric',
    metresBetween(a.name, b.name) === metresBetween(b.name, a.name));

  const expected = Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y);
  check('distance is the straight line between the two areas',
    Math.abs((metresBetween(a.name, b.name) ?? -1) - expected) < 0.001);
}

// Nothing is inferred from an area the app does not know.
{
  check('an unknown area gives nothing', metresBetween('Somewhere else', LANDMARKS[0].name) === null);
  check('an unknown other area gives nothing', metresBetween(LANDMARKS[0].name, '') === null);
  check('an empty area gives nothing', metresBetween('', '') === null);
  check('nothing is never inside the circle', !withinCircle(null));
  check('areaNamed refuses a name it does not hold', areaNamed('12 Nowhere Lane') === undefined);
}

// The circle the page promises.
{
  check('the circle matches what Nearby says', CIRCLE_METRES === 2000);
  check('right on the edge counts as inside', withinCircle(CIRCLE_METRES));
  check('a metre past the edge is outside', !withinCircle(CIRCLE_METRES + 1));
  // Murrayville is about 5.5 km across its longest line, so the circle no
  // longer swallows the whole map — the cemetery and James Hill Park really
  // are more than 2 km apart. What has to hold is that the filter is doing
  // something real: every area has company, and the far corners do not.
  check('every area has at least two others inside its circle', LANDMARKS.every((a) => {
    const inside = LANDMARKS.filter((b) => b.id !== a.id && withinCircle(metresBetween(a.name, b.name)));
    return inside.length >= 2;
  }));
  const pairs = LANDMARKS.flatMap((a) => LANDMARKS.map((b) => metresBetween(a.name, b.name) ?? 0));
  check('the furthest two areas are outside each other\'s circle',
    Math.max(...pairs) > CIRCLE_METRES, `${Math.round(Math.max(...pairs))} m`);
  check('the core of the neighbourhood is well inside it',
    withinCircle(metresBetween('Five Corners', 'the 48th Avenue shops')));
}

// Phrasing: blunt on purpose.
{
  check('very close is not given a number', describeDistance(40) === 'a few doors away');
  check('under a kilometre reads in kilometres', describeDistance(300) === '0.3 km');
  check('distances round to one decimal', describeDistance(1237) === '1.2 km');
  check('nothing is reported to the metre', !/\d{3,} ?m\b/.test(describeDistance(372)));
  check('a long way still reads simply', describeDistance(4820) === '4.8 km');
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
