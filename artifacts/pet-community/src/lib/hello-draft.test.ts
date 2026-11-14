import { strict as assert } from 'node:assert';
import { initialsOf, readAddressee, writeAddressee } from './hello-draft.ts';

// A round trip keeps everyone's details intact.
{
  const stored = writeAddressee({ id: 'n3', name: 'Priya Rao', initials: 'PR', pet: 'Mango', detail: 'collie · 4' });
  const read = readAddressee(stored);
  assert.deepEqual(read, { id: 'n3', name: 'Priya Rao', initials: 'PR', pet: 'Mango', detail: 'collie · 4' });
}

// Someone from further out brings a name and little else.
{
  const read = readAddressee(writeAddressee({ id: 'p9', name: 'Tom Ellis' }));
  assert.equal(read?.initials, 'TE');
  assert.equal(read?.pet, '');
  assert.equal(read?.detail, '');
}

// Initials come from the first two words, never more.
assert.equal(initialsOf('mary jane watson'), 'MJ');
assert.equal(initialsOf('Sam'), 'S');
assert.equal(initialsOf('   '), '?');

// Nothing readable means nobody to address.
assert.equal(readAddressee(null), null);
assert.equal(readAddressee(''), null);
assert.equal(readAddressee('not json'), null);
assert.equal(readAddressee('[]'), null);
assert.equal(readAddressee('{"name":"No id"}'), null);
assert.equal(readAddressee('{"id":"n1"}'), null);
assert.equal(readAddressee('{"id":"n1","name":"   "}'), null);
assert.equal(readAddressee('{"id":1,"name":"Numbers"}'), null);

// A long field is cut rather than trusted.
{
  const read = readAddressee(writeAddressee({ id: 'n1', name: 'A'.repeat(400) }));
  assert.equal(read?.name.length, 120);
}

console.log('hello-draft ok');
