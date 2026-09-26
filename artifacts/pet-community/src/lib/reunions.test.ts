/**
 * Tests for taking a found animal off the lost-pet board.
 *
 * The board mixes a module constant (the seeded alerts) with cases reported in
 * this browser, so a reunion is held in its own small map and folded in when
 * the list is built. What must hold: a reunion moves a case out of the active
 * list without editing the case, an undo puts it straight back, and junk in
 * storage never takes the page down with it.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:reunions
 */

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

// A minimal localStorage, since these helpers read and write one.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
};

const { LOST_CASES, loadReunions, saveReunions, withReunion, allCases } = await import('./lost-pet-data.ts');
type Case = (typeof LOST_CASES)[number];

const seededActive = LOST_CASES.filter((c) => c.status === 'Active');
check('the demo ships with at least two active alerts', seededActive.length >= 2, `${seededActive.length}`);

const subject = seededActive[0];

// --- folding a reunion in ---------------------------------------------------
{
  const closed = withReunion(subject, { [subject.id]: { at: 1_700_000_000_000, note: 'By the garden gate.' } });
  check('a reunion flips the status', closed.status === 'Reunited', closed.status);
  check('a reunion records when', closed.foundAt === 1_700_000_000_000);
  check('a reunion keeps the note', closed.foundNote === 'By the garden gate.');
  check('everything else is untouched', closed.petName === subject.petName && closed.lastSeenPlace === subject.lastSeenPlace);
  check('the original case is not mutated', subject.status === 'Active');
}

{
  const untouched = withReunion(subject, {});
  check('no reunion means no change', untouched === subject);
}

{
  const other = withReunion(subject, { 'some-other-id': { at: 1, note: '' } });
  check('a reunion for a different case is ignored', other === subject);
}

{
  const blank = withReunion(subject, { [subject.id]: { at: 5, note: '   ' } });
  check('a whitespace note is dropped rather than shown empty', blank.foundNote === undefined, String(blank.foundNote));
}

// --- what the board shows --------------------------------------------------
function split(cases: Case[]) {
  return {
    active: cases.filter((c) => c.status === 'Active'),
    reunited: cases.filter((c) => c.status === 'Reunited'),
  };
}

{
  const before = split(LOST_CASES.map((c) => withReunion(c, {})));
  const reunions = { [subject.id]: { at: Date.now(), note: '' } };
  const after = split(LOST_CASES.map((c) => withReunion(c, reunions)));

  check('marking one found shortens the active list by exactly one',
    after.active.length === before.active.length - 1, `${before.active.length} -> ${after.active.length}`);
  check('the found animal is gone from the active list',
    !after.active.some((c) => c.id === subject.id));
  check('the found animal appears under reunited',
    after.reunited.some((c) => c.id === subject.id));
  check('no case is lost in the move',
    after.active.length + after.reunited.length === LOST_CASES.length);
  check('nobody else moved',
    before.active.filter((c) => c.id !== subject.id).every((c) => after.active.some((a) => a.id === c.id)));
}

{
  // Undo is just dropping the key again.
  const reunions: Record<string, { at: number; note: string }> = { [subject.id]: { at: 1, note: 'x' } };
  delete reunions[subject.id];
  check('reopening puts the case back as active', withReunion(subject, reunions).status === 'Active');
}

// --- storage round-trip ----------------------------------------------------
{
  store.clear();
  check('an empty store reads as no reunions', Object.keys(loadReunions()).length === 0);

  saveReunions({ l1: { at: 42, note: 'hello' } });
  const read = loadReunions();
  check('a saved reunion reads back', read.l1?.at === 42 && read.l1?.note === 'hello');

  store.set('pc-reunions', 'not json at all');
  check('unparseable storage reads as none', Object.keys(loadReunions()).length === 0);

  store.set('pc-reunions', '[1,2,3]');
  check('an array in storage reads as none', Object.keys(loadReunions()).length === 0);

  store.set('pc-reunions', 'null');
  check('a null in storage reads as none', Object.keys(loadReunions()).length === 0);
}

{
  store.clear();
  saveReunions({ [subject.id]: { at: 7, note: 'home' } });
  const all = allCases();
  const found = all.find((c) => c.id === subject.id);
  check('allCases applies reunions from storage', found?.status === 'Reunited', String(found?.status));
  check('allCases still returns every case', all.length >= LOST_CASES.length);
  store.clear();
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
