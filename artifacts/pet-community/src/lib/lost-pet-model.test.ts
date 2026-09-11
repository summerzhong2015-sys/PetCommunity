/**
 * Behavioural tests for the lost-pet search model.
 *
 * The model is not just "does it compile" code — it makes claims about how lost
 * animals behave, and those claims are what these assertions pin down: cats stay
 * closer than dogs, frightened animals travel further, roads and the creek
 * suppress the ground beyond them, a credible sighting re-anchors the whole
 * field, and the search radius grows and then saturates rather than running away.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:model
 */

import { predict, peakProbability, type PredictionInput, type Sighting } from './lost-pet-model.ts';
import { distance, terrainAt, type Vec } from './neighborhood-map.ts';

let pass = 0, fail = 0;
const results: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; results.push(`  ok   ${name}`); }
  else { fail++; results.push(`  FAIL ${name} ${detail}`); }
}
function approx(a: number, b: number, tol: number) { return Math.abs(a - b) <= tol; }

const base = (over: Partial<PredictionInput> = {}): PredictionInput => ({
  name: 'Pip', species: 'dog', size: 'small', temperament: 'shy',
  lastSeen: { x: -120, y: 190 }, minutesSinceLastSeen: 60,
  home: { x: -300, y: -200 }, sightings: [], weather: 'clear', timeOfDay: 'day',
  ...over,
});

// --- 1. field is a normalised probability distribution ---
{
  const p = predict(base());
  const sum = p.grid.cells.reduce((s, c) => s + c.p, 0);
  check('field sums to 1', approx(sum, 1, 1e-9), `sum=${sum}`);
  check('all cells non-negative & finite', p.grid.cells.every(c => c.p >= 0 && Number.isFinite(c.p)));
  check('grid covers the map', p.grid.cells.length === p.grid.cols * p.grid.rows);
}

// --- 2. cats stay closer than dogs ---
{
  const cat = predict(base({ species: 'cat', minutesSinceLastSeen: 180 }));
  const dog = predict(base({ species: 'dog', minutesSinceLastSeen: 180 }));
  check('cat 80% radius < dog 80% radius', cat.rings.p80 < dog.rings.p80,
    `cat=${cat.rings.p80} dog=${dog.rings.p80}`);
  check('cat 80% radius is realistically small (<400m)', cat.rings.p80 < 400, `${cat.rings.p80}`);
}

// --- 3. the search radius grows with time, and saturates ---
{
  const t = [15, 60, 240, 720, 2880].map(m => predict(base({ minutesSinceLastSeen: m })).rings.p80);
  check('radius grows over the first hours', t[0] < t[1] && t[1] < t[2], t.join(','));
  const earlyGrowth = t[2] - t[1];
  const lateGrowth = t[4] - t[3];
  check('growth decelerates (saturating, not linear)', lateGrowth < earlyGrowth,
    `early=${earlyGrowth} late=${lateGrowth}`);
  const peak = Math.max(...t);
  check('once saturated the radius holds (no collapse)', t[3] > peak * 0.9 && t[4] > peak * 0.9, t.join(','));
  check('a large dog is flagged as having outgrown the map',
    predict(base({ size: 'large', minutesSinceLastSeen: 720 })).beyondMap === true);
  check('a cat a few hours out is still inside the map',
    predict(base({ species: 'cat', minutesSinceLastSeen: 240 })).beyondMap === false);
}

// --- 4. temperament moves the radius the right way ---
{
  const friendly = predict(base({ temperament: 'friendly', minutesSinceLastSeen: 180 })).rings.p80;
  const shy = predict(base({ temperament: 'shy', minutesSinceLastSeen: 180 })).rings.p80;
  const skittish = predict(base({ temperament: 'skittish', minutesSinceLastSeen: 180 })).rings.p80;
  check('friendly < shy < skittish radius', friendly < shy && shy < skittish,
    `${friendly}/${shy}/${skittish}`);
}

// --- 5. a sighting re-anchors the map and pulls mass to it ---
{
  const far: Vec = { x: 340, y: 250 };
  const without = predict(base({ minutesSinceLastSeen: 120 }));
  const sighting: Sighting = { id: 's1', at: far, minutesAgo: 10, confidence: 'confirmed', note: '', reporter: 'x' };
  const withS = predict(base({ minutesSinceLastSeen: 120, sightings: [sighting] }));

  check('anchor moves to the sighting', distance(withS.anchor, far) < 1,
    `anchor=${JSON.stringify(withS.anchor)}`);
  check('clock restarts from the sighting', withS.effectiveMinutes === 10);

  const massNear = (p: typeof without) =>
    p.grid.cells.filter(c => distance({ x: c.x, y: c.y }, far) < 120).reduce((s, c) => s + c.p, 0);
  check('probability mass concentrates at the sighting', massNear(withS) > massNear(without) * 3,
    `${massNear(without).toFixed(4)} -> ${massNear(withS).toFixed(4)}`);
  check('top zone lands near the sighting', distance(withS.zones[0].centre, far) < 150,
    `d=${distance(withS.zones[0].centre, far).toFixed(0)}`);
}

// --- 6. confidence responds to evidence ---
{
  const none = predict(base()).confidence.pct;
  const one = predict(base({ sightings: [
    { id: 'a', at: { x: -100, y: 220 }, minutesAgo: 15, confidence: 'confirmed', note: '', reporter: 'x' }] })).confidence.pct;
  const stale = predict(base({ sightings: [
    { id: 'a', at: { x: -100, y: 220 }, minutesAgo: 900, confidence: 'possible', note: '', reporter: 'x' }] })).confidence.pct;
  check('a fresh confirmed sighting raises confidence', one > none, `${none} -> ${one}`);
  check('a stale vague sighting barely moves it', stale < one, `${stale} vs ${one}`);
  check('confidence stays in 0-100', [none, one, stale].every(v => v >= 0 && v <= 100));
}

// --- 7. barriers actually suppress the far side ---
{
  // Ridge Road runs roughly along y=0. Anchor north of it, compare mirrored cells.
  // Anchor at (0,80). North Creek sits near y=236 at x=0 and Ridge Road near
  // y=4, so (0,180) crosses nothing and (0,-20) crosses only Ridge Road.
  // Both cells are 100 m out and both sit on 'open' ground.
  const p = predict(base({ species: 'cat', lastSeen: { x: 0, y: 80 }, minutesSinceLastSeen: 300 }));
  const cellAt = (x: number, y: number) =>
    p.grid.cells.reduce((best, c) =>
      Math.hypot(c.x - x, c.y - y) < Math.hypot(best.x - x, best.y - y) ? c : best, p.grid.cells[0]);
  const near = cellAt(0, 180);
  const across = cellAt(0, -20);
  check('both comparison cells are open ground',
    terrainAt({ x: 0, y: 180 }) === 'open' && terrainAt({ x: 0, y: -20 }) === 'open');
  check('cell across Ridge Road is suppressed vs an equidistant cell on the same side',
    across.p < near.p * 0.6, `same-side=${near.p.toExponential(2)} across=${across.p.toExponential(2)}`);
  // And the creek should bite harder than the road for a cat.
  const acrossCreek = cellAt(0, 300);
  check('the creek suppresses a cat more than the road does',
    acrossCreek.p < across.p, `road=${across.p.toExponential(2)} creek=${acrossCreek.p.toExponential(2)}`);
}

// --- 8. terrain preference differs by species ---
{
  const at = (p: any, x: number, y: number) =>
    p.grid.cells.reduce((best: any, c: any) =>
      Math.hypot(c.x - x, c.y - y) < Math.hypot(best.x - x, best.y - y) ? c : best, p.grid.cells[0]);
  // Compare housing (cover) vs open meadow, both ~equidistant from an anchor between them.
  const anchor = { x: 60, y: 60 };
  const cat = predict(base({ species: 'cat', lastSeen: anchor, minutesSinceLastSeen: 240 }));
  const dog = predict(base({ species: 'dog', lastSeen: anchor, minutesSinceLastSeen: 240 }));
  const housing = { x: 110, y: -120 };  // Oak Terrace, dense-housing
  const meadow  = { x: 110, y: 240 };   // Riverside meadow, open
  check('housing is dense-housing terrain', terrainAt(housing) === 'dense-housing', terrainAt(housing));
  check('meadow is open terrain', terrainAt(meadow) === 'open', terrainAt(meadow));
  const catRatio = at(cat, housing.x, housing.y).p / at(cat, meadow.x, meadow.y).p;
  const dogRatio = at(dog, housing.x, housing.y).p / at(dog, meadow.x, meadow.y).p;
  check('cats favour cover over open ground more than dogs do', catRatio > dogRatio,
    `cat=${catRatio.toFixed(2)} dog=${dogRatio.toFixed(2)}`);
}

// --- 9. weather shrinks the roam radius ---
{
  const clear = predict(base({ minutesSinceLastSeen: 240, weather: 'clear' })).rings.p80;
  const rain = predict(base({ minutesSinceLastSeen: 240, weather: 'rain' })).rings.p80;
  check('rain shrinks the search radius', rain < clear, `clear=${clear} rain=${rain}`);
}

// --- 10. zones are sane and ordered ---
{
  const p = predict(base({ minutesSinceLastSeen: 200 }));
  check('at least one zone found', p.zones.length >= 1, `${p.zones.length}`);
  check('zones ordered by descending probability',
    p.zones.every((z, i) => i === 0 || z.probability <= p.zones[i - 1].probability),
    p.zones.map(z => z.probability.toFixed(3)).join(','));
  check('zone probabilities sum to <= 1', p.zones.reduce((s, z) => s + z.probability, 0) <= 1.0000001);
  check('every zone has a reason and advice', p.zones.every(z => z.reason.length > 10 && z.advice.length > 10));
  check('rings are ordered p50 < p80 < p95', p.rings.p50 <= p.rings.p80 && p.rings.p80 <= p.rings.p95,
    JSON.stringify(p.rings));
  check('actions and drivers produced', p.actions.length >= 4 && p.drivers.length >= 3);
  check('peak probability is positive', peakProbability(p.grid) > 0);
}

// --- 10b. cumulative-mass shading field ---
{
  const p = predict(base({ minutesSinceLastSeen: 200 }));
  const qs = p.grid.cells.map(c => c.q);
  check('q is bounded to 0..1', qs.every(q => q >= -1e-9 && q <= 1 + 1e-9));
  check('the most likely cell has q ~ 1',
    Math.abs(Math.max(...qs) - 1) < 1e-9, `${Math.max(...qs)}`);
  // Ordering by p must match ordering by q.
  const sorted = [...p.grid.cells].sort((a, b) => b.p - a.p);
  check('q decreases monotonically with p',
    sorted.every((c, i) => i === 0 || c.q <= sorted[i - 1].q + 1e-12));
  // A diffuse dog field and a tight cat field should both have a small hot core.
  const hotShare = (pred: typeof p) => pred.grid.cells.filter(c => c.q > 0.8).length / pred.grid.cells.length;
  const dogHot = hotShare(p);
  const catHot = hotShare(predict(base({ species: 'cat', minutesSinceLastSeen: 200 })));
  check('hot core stays a small share of the map for both species',
    dogHot < 0.35 && catHot < 0.35, `dog=${dogHot.toFixed(3)} cat=${catHot.toFixed(3)}`);
}

// --- 11. determinism ---
{
  const a = predict(base({ minutesSinceLastSeen: 137 }));
  const b = predict(base({ minutesSinceLastSeen: 137 }));
  check('same input gives identical field', a.grid.cells.every((c, i) => c.p === b.grid.cells[i].p));
}

// --- 12. edge cases ---
{
  const zero = predict(base({ minutesSinceLastSeen: 0 }));
  check('t=0 produces a valid field', approx(zero.grid.cells.reduce((s, c) => s + c.p, 0), 1, 1e-9));
  const week = predict(base({ minutesSinceLastSeen: 60 * 24 * 7 }));
  check('a week out still produces a valid field', approx(week.grid.cells.reduce((s, c) => s + c.p, 0), 1, 1e-9));
  check('a week out has lower confidence than an hour out',
    week.confidence.pct < predict(base({ minutesSinceLastSeen: 60 })).confidence.pct + 1);
}

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
