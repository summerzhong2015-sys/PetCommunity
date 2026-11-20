import { strict as assert } from 'node:assert';
import { describeShared } from './shared-status.ts';

assert.equal(describeShared('shared').tone, 'good');
assert.equal(describeShared('loading').tone, 'waiting');
assert.equal(describeShared('offline').tone, 'alone');
assert.equal(describeShared('local').tone, 'alone');

// Every line says something, and none of them promise an audience that is
// not there.
for (const status of ['shared', 'loading', 'offline', 'local'] as const) {
  const line = describeShared(status);
  assert.ok(line.label.length > 0 && line.detail.length > 0, status);
  if (status !== 'shared') assert.ok(!/neighbours see/.test(line.label), status);
}

console.log('shared-status ok');
