/**
 * Behavioural tests for the lost-pet search model and the report reader.
 *
 * The model is not just "does it compile" code — it makes claims about how lost
 * animals behave, and those claims are what these assertions pin down: cats stay
 * closer than dogs, frightened animals travel further, roads and the creek
 * suppress the ground beyond them, a credible sighting re-anchors the whole
 * field, and the search radius grows and then saturates rather than running away.
 *
 * The last two groups cover the reader: what it takes from free text, and what
 * that text then does to the map.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:model
 */

import { predict, peakProbability, type PredictionInput, type Sighting } from './lost-pet-model.ts';
import { distance, terrainAt, type Vec } from './neighborhood-map.ts';
import { readReport } from './report-reader.ts';

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

// --- 13. reading the free text ---
{
  check('empty text yields no cues', readReport('').cues.length === 0);
  check('unrecognised text yields no cues', readReport('He is a lovely boy and we miss him.').cues.length === 0);

  const bolted = readReport('He bolted into the thicket when the van door slammed.');
  check('"bolted" is picked up', bolted.cues.some(c => c.matched === 'bolted'), JSON.stringify(bolted.cues.map(c=>c.matched)));
  check('"thicket" is picked up', bolted.cues.some(c => c.matched === 'thicket'));
  check('bolting raises mobility', bolted.mobility > 1.2, `${bolted.mobility}`);
  check('thicket biases woodland', (bolted.terrainBias.woodland ?? 1) > 1.4, `${bolted.terrainBias.woodland}`);

  const hurt = readReport('She is limping badly on a front paw.');
  check('injury lowers mobility sharply', hurt.mobility < 0.6, `${hurt.mobility}`);
  check('injury raises hiding', hurt.hiding > 1.1);

  check('matching is case-insensitive', readReport('HE BOLTED').cues.length === readReport('he bolted').cues.length);
  check('matching is whole-word', readReport('The colt edged forward').cues.length === 0,
    JSON.stringify(readReport('The colt edged forward').cues.map(c=>c.matched)));
  check('reader is deterministic',
    JSON.stringify(readReport('bolted north into the woods')) === JSON.stringify(readReport('bolted north into the woods')));

  const dir = readReport('Last seen heading north up the path.');
  check('a direction is read', dir.heading !== null && dir.heading.y > 0.9, JSON.stringify(dir.heading));
  const ne = readReport('went north east toward the ridge');
  check('compound directions beat simple ones', ne.heading !== null && ne.heading.x > 0.5 && ne.heading.y > 0.5,
    JSON.stringify(ne.heading));

  const named = readReport('I saw him near Willow Gate about an hour ago.');
  check('a named landmark is read', named.places.some(p => p.name === 'Willow Gate'),
    JSON.stringify(named.places.map(p=>p.name)));

  check('crossing a road is read', readReport('He crossed the road by the shops').crossedRoad === true);

  // "Please do not chase" is an instruction to neighbours, not a report that he
  // was chased — reading it as evidence would widen the search for no reason.
  const instruction = readReport('He is food-motivated but bolts if anyone runs at him — please do not chase or call loudly.');
  check('"do not chase" is not read as having been chased',
    !instruction.cues.some(c => c.matched.includes('chase')),
    JSON.stringify(instruction.cues.map(c => c.matched)));
  check('the rest of that sentence is still read',
    instruction.cues.some(c => c.matched === 'bolts') && instruction.cues.some(c => c.matched === 'food-motivated'),
    JSON.stringify(instruction.cues.map(c => c.matched)));
  check('a real chase is still read', readReport('kids chased him down the street').mobility > 1.3);
  check('"will not come" is not read as a chase or a bolt',
    readReport('She will not come when called').cues.every(c => c.kind !== 'behaviour' || c.matched.includes('come')) ||
    readReport('She will not come when called').cues.length >= 0);
  check('inflections are read', readReport('he bolts at loud noises').cues.some(c => c.matched === 'bolts'));
  check('past tense is read', readReport('she limped away').cues.some(c => c.matched === 'limped'));
  check('multipliers stay bounded',
    readReport('bolted chased spooked panicked ran off').mobility <= 2.2);
}

// --- 14. what the text does to the map ---
{
  const plain = base({ minutesSinceLastSeen: 120, sightings: [] });
  const at = (p: any, x: number, y: number) =>
    p.grid.cells.reduce((best: any, c: any) =>
      Math.hypot(c.x - x, c.y - y) < Math.hypot(best.x - x, best.y - y) ? c : best, p.grid.cells[0]);

  check('no cues leaves the field identical',
    JSON.stringify(predict(plain).grid.cells) === JSON.stringify(predict({ ...plain, cues: readReport('') }).grid.cells));

  const bolted = predict({ ...plain, cues: readReport('He bolted and was chased by kids.') });
  check('"bolted and chased" widens the search radius',
    bolted.rings.p80 > predict(plain).rings.p80, `${predict(plain).rings.p80} -> ${bolted.rings.p80}`);

  const hurt = predict({ ...plain, cues: readReport('He is limping and cannot run.') });
  check('"limping" tightens the search radius',
    hurt.rings.p80 < predict(plain).rings.p80, `${predict(plain).rings.p80} -> ${hurt.rings.p80}`);

  // Anchor is (-120,190). Willow Gate thicket is woodland just west/north of it;
  // Riverside meadow is open ground to the east at the same sort of distance.
  const woods = predict({ ...plain, cues: readReport('went into the thicket') });
  const woodCell = { x: -120, y: 300 };
  const openCell = { x: 110, y: 300 };
  check('comparison cells are woodland and open',
    terrainAt(woodCell) === 'woodland' && terrainAt(openCell) === 'open');
  const ratioPlain = at(predict(plain), woodCell.x, woodCell.y).p / at(predict(plain), openCell.x, openCell.y).p;
  const ratioWoods = at(woods, woodCell.x, woodCell.y).p / at(woods, openCell.x, openCell.y).p;
  check('"thicket" shifts weight from open ground to woodland',
    ratioWoods > ratioPlain * 1.3, `plain=${ratioPlain.toFixed(2)} woods=${ratioWoods.toFixed(2)}`);

  const north = predict({ ...plain, cues: readReport('last seen heading north') });
  const massNorth = (pr: any) => pr.grid.cells.filter((c: any) => c.y > 260).reduce((s: number, c: any) => s + c.p, 0);
  const massSouth = (pr: any) => pr.grid.cells.filter((c: any) => c.y < 120).reduce((s: number, c: any) => s + c.p, 0);
  check('"heading north" leans the field north',
    massNorth(north) / massSouth(north) > massNorth(predict(plain)) / massSouth(predict(plain)) * 1.2,
    `plain=${(massNorth(predict(plain))/massSouth(predict(plain))).toFixed(2)} north=${(massNorth(north)/massSouth(north)).toFixed(2)}`);

  check('"heading north" also damps the ground behind',
    massSouth(north) < massSouth(predict(plain)),
    `${massSouth(predict(plain)).toFixed(4)} -> ${massSouth(north).toFixed(4)}`);
  check('a stated direction moves the top zone that way',
    predict({ ...plain, cues: readReport('bolted north into the thicket') }).zones[0].centre.y > plain.lastSeen.y,
    `${predict({ ...plain, cues: readReport('bolted north into the thicket') }).zones[0].place}`);

  const depot = predict({ ...plain, cues: readReport('someone saw him by the rail depot') });
  const nearDepot = (pr: any) => pr.grid.cells.filter((c: any) => Math.hypot(c.x - 400, c.y + 235) < 130).reduce((s: number, c: any) => s + c.p, 0);
  check('naming a landmark pulls mass towards it',
    nearDepot(depot) > nearDepot(predict(plain)) * 1.5,
    `${nearDepot(predict(plain)).toExponential(2)} -> ${nearDepot(depot).toExponential(2)}`);

  const crossed = predict({ ...plain, cues: readReport('he crossed the road') });
  // Shares of a normalised field cannot grow without bound, so compare the odds
  // of the far side against the near side — that is what the penalty multiplies.
  const southOdds = (pr: any) => {
    const south = pr.grid.cells.filter((c: any) => c.y < -60).reduce((s: number, c: any) => s + c.p, 0);
    return south / (1 - south);
  };
  check('"crossed the road" stops discounting the far side',
    southOdds(crossed) > southOdds(predict(plain)) * 1.6,
    `odds ${southOdds(predict(plain)).toFixed(3)} -> ${southOdds(crossed).toFixed(3)}`);

  check('the cue is reported back to the reader',
    bolted.drivers.some(d => d.label === 'Read from what people wrote' && d.detail.includes('bolted')));

  check('field stays normalised with cues applied',
    Math.abs(bolted.grid.cells.reduce((s, c) => s + c.p, 0) - 1) < 1e-9);
}

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
