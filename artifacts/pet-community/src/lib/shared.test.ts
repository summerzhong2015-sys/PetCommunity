/**
 * Tests for the shared layer's rules.
 *
 * The merge is the part that can quietly lose somebody's work, so that is
 * where the tests are: your unsent donation must survive a refresh that does
 * not know about it yet, and the server's copy must win on anything it does
 * know about, because that is the copy everyone else can see.
 *
 * Run with:  node --experimental-strip-types src/lib/shared.test.ts
 */

import { POLL_MS, localKey, merge, newId, readList, type SharedItem } from './shared.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

const item = (id: string, at: number, extra: Record<string, unknown> = {}): SharedItem => ({ id, at, ...extra });

// --- merging mine with theirs --------------------------------------------
{
  const mine = [item('a', 1), item('b', 2)];
  const theirs = [item('a', 1, { amount: 40 }), item('c', 3)];
  const merged = merge(mine, theirs);

  check('everything is there once', merged.length === 3, String(merged.length));
  check('no duplicates', new Set(merged.map((i) => i.id)).size === merged.length);
  check('the shared copy wins on what it knows',
    merged.find((i) => i.id === 'a')?.amount === 40);
  check('my unsent work survives', merged.some((i) => i.id === 'b'));
  check('somebody else arrives too', merged.some((i) => i.id === 'c'));
  check('it reads in time order', merged.map((i) => i.id).join('') === 'abc', merged.map((i) => i.id).join(''));

  check('nothing plus nothing is nothing', merge([], []).length === 0);
  check('only mine is still mine', merge(mine, []).length === 2);
  check('only theirs is all theirs', merge([], theirs).length === 2);
  check('merging twice changes nothing',
    JSON.stringify(merge(merged, theirs)) === JSON.stringify(merged));
  check('items with no time still come through', merge([{ id: 'z' }], []).length === 1);
}

// --- what counts as an item ----------------------------------------------
{
  check('a list of items is read', readList([item('a', 1)]).length === 1);
  for (const junk of [null, undefined, 'list', 42, {}]) {
    check(`${JSON.stringify(junk)} is not a list`, readList(junk).length === 0);
  }
  check('entries without an id are dropped', readList([{ at: 1 }, item('a', 1), null, 'x']).length === 1);
  check('an id has to be a string', readList([{ id: 7 }]).length === 0);
}

// --- ids ------------------------------------------------------------------
{
  const ids = new Set(Array.from({ length: 500 }, () => newId('post')));
  check('ids do not collide', ids.size === 500, String(ids.size));
  check('ids say what they are', newId('donation').startsWith('donation-'));
}

// --- the small print ------------------------------------------------------
{
  check('polling is often enough to feel live', POLL_MS <= 30_000);
  check('polling is rare enough to be free', POLL_MS >= 10_000);
  check('each collection has its own local mirror',
    new Set(['posts', 'comments', 'donations', 'lost', 'sightings', 'reunions'].map((c) => localKey(c as never))).size === 6);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
