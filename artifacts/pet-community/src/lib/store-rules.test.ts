/**
 * The rules the shared store applies to anything a browser sends it.
 *
 * These live in `api/state.ts`, which is a serverless function rather than
 * part of the app, so the test reaches across to it rather than keeping a
 * second copy of the rules that could drift from the real one.
 */

import { strict as assert } from 'node:assert';
import { clean, sane } from '../../../../api/state.ts';

const now = Date.now();

// The bug this file exists for: a timestamp must survive being written.
assert.equal(clean(now), now);
assert.deepEqual(clean({ at: now, amount: 40 }), { at: now, amount: 40 });
assert.ok(now > 1e12, 'a present-day timestamp is past the old ceiling');

// Money, in the amounts this app deals in, is untouched.
assert.equal(clean(0), 0);
assert.equal(clean(-25), -25);
assert.equal(clean(100000), 100000);

// Nonsense becomes nothing, rather than a tidied-up version of itself.
assert.equal(clean(1e308), 0);
assert.equal(clean(Infinity), 0);
assert.equal(clean(-Infinity), 0);
assert.equal(clean(NaN), 0);

// Strings are still capped, and a small photo is still the exception.
assert.equal((clean('x'.repeat(5000)) as string).length, 2000);
assert.equal((clean('data:image/jpeg;base64,' + 'A'.repeat(20000)) as string).length, 14000);

// Reading: a row with an impossible number in it anywhere is dropped.
assert.equal(sane({ id: 'a', amount: 40, at: now }), true);
assert.equal(sane({ id: 'b', amount: 1e308, at: now }), false);
assert.equal(sane({ id: 'c', nested: { deep: [1, 2, Infinity] } }), false);
assert.equal(sane({ id: 'd', nested: { deep: [1, 2, 3] } }), true);
assert.equal(sane({ id: 'e', text: 'nothing numeric here', ok: true, missing: null }), true);
assert.equal(sane({ id: 'f', at: now }), true);

console.log('store-rules ok');
