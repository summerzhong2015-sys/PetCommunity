/**
 * Tests for the walk routes.
 *
 * Every route is expected to carry the same set of facts, because the opened
 * panel lays them out in a fixed grid — one walk missing its water line or its
 * climb leaves a hole rather than a shorter panel. These check that each route
 * is actually filled in, that the stops run start to finish in order, and that
 * no two routes say the same thing.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:walks
 */

import { BUSY_LABEL, busyBars, defaultWalks, type Walk } from './walks-data.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

check('there are routes to show', defaultWalks.length >= 3, `${defaultWalks.length}`);

const ids = defaultWalks.map((w) => w.id);
check('ids are unique', new Set(ids).size === ids.length);

const GLANCE: (keyof Walk)[] = ['surface', 'climb', 'shade', 'water', 'offLeash', 'best', 'description'];

for (const walk of defaultWalks) {
  for (const field of GLANCE) {
    const value = walk[field];
    check(`${walk.name}: ${String(field)} is filled in`,
      typeof value === 'string' && value.trim().length > 8, `${String(value)}`);
  }

  check(`${walk.name}: suits is a short scannable list`,
    walk.suits.length >= 3 && walk.suits.length <= 5 && walk.suits.every((s) => s.length <= 16),
    walk.suits.join('/'));

  check(`${walk.name}: busyness covers the day`,
    walk.busy.length === 3 && walk.busy.every((b) => b.label.length > 0 && b.level in BUSY_LABEL));

  check(`${walk.name}: has stops in order, start to finish`, walk.stops.length >= 4);
  check(`${walk.name}: the last stop is the full distance`,
    walk.stops[walk.stops.length - 1].at === walk.distance,
    `${walk.stops[walk.stops.length - 1].at} vs ${walk.distance}`);
  check(`${walk.name}: the first stop is the start`, walk.stops[0].at === '0.0 km');

  const distances = walk.stops.map((s) => Number.parseFloat(s.at));
  check(`${walk.name}: stop distances only go forward`,
    distances.every((d, i) => i === 0 || d > distances[i - 1]), distances.join(' '));

  check(`${walk.name}: every stop says something useful`,
    walk.stops.every((s) => s.note.trim().length > 15 && s.name.trim().length > 2));

  check(`${walk.name}: warns about something`, walk.headsUp.length >= 2 && walk.headsUp.every((h) => h.length > 20));
  check(`${walk.name}: says how to get there`, walk.parking.trim().length > 15);
  check(`${walk.name}: says how accessible it is`, walk.accessibility.trim().length > 15);
  check(`${walk.name}: has a drawn scene`, ['creek', 'park', 'ridge'].includes(walk.scene), walk.scene);
  check(`${walk.name}: carries neighbour notes`,
    walk.notes.length >= 2 && walk.notes.every((n) => n.by.trim() !== '' && n.text.trim().length > 20));
  check(`${walk.name}: nobody is quoted twice on one route`,
    new Set(walk.notes.map((n) => n.by)).size === walk.notes.length);
}

check('every route is drawn as a different place',
  new Set(defaultWalks.map((w) => w.scene)).size === defaultWalks.length,
  defaultWalks.map((w) => w.scene).join(' '));

// Routes should read as different places, not one place described three ways.
for (const field of ['surface', 'climb', 'water', 'offLeash'] as const) {
  const values = defaultWalks.map((w) => w[field]);
  check(`routes differ on ${field}`, new Set(values).size === values.length, values.join(' | '));
}

// The bar meter.
{
  check('quiet fills one bar of three', busyBars('quiet') === 1);
  check('steady fills two', busyBars('steady') === 2);
  check('busy fills three', busyBars('busy') === 3);
  check('every level has a label', Object.keys(BUSY_LABEL).length === 3);
  check('no level overflows the meter',
    (['quiet', 'steady', 'busy'] as const).every((l) => busyBars(l) >= 1 && busyBars(l) <= 3));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
