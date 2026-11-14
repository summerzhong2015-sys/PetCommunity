/**
 * Tests for who can see whom.
 *
 * The important one is the last block: a person out of range must not have
 * their pet, their notes or their whereabouts reach the page at all. Hiding
 * those with CSS would be a privacy bug dressed as a layout decision, so the
 * test checks the data itself.
 *
 * Run with:  node --experimental-strip-types src/lib/people.test.ts
 */

import { asStranger, measure, visible, type Person } from './people.ts';
import { CIRCLE_METRES } from './neighbours.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

const person = (id: string, x: number, y: number, extra: Partial<Person> = {}): Person => ({
  id, name: `${id} Person`, initials: 'XX', pet: 'Rex', detail: 'Terrier · 3 years',
  note: 'Out most mornings', at: { x, y }, area: 'Five Corners', ...extra,
});

const me = { x: 0, y: 0 };

// --- measuring ------------------------------------------------------------
{
  const people = [person('far', 3000, 0), person('near', 100, 0), person('mid', 900, 0)];
  const seen = measure(people, me);
  check('closest first', seen.map((p) => p.id).join(',') === 'near,mid,far', seen.map((p) => p.id).join(','));
  check('the distance is worked out', seen[0].metres === 100, String(seen[0].metres));
  check('nobody is lost', seen.length === 3);
  check('with no pin of my own, there are no distances', measure(people, null).every((p) => p.metres === null));
  check('an empty street is fine', measure([], me).length === 0);
}

// --- who is inside the circle --------------------------------------------
{
  const { near, far } = visible(measure([
    person('inside', CIRCLE_METRES - 1, 0),
    person('edge', CIRCLE_METRES, 0),
    person('outside', CIRCLE_METRES + 1, 0),
  ], me));
  check('inside the circle is visible', near.some((p) => p.id === 'inside'));
  check('right on the edge counts as inside', near.some((p) => p.id === 'edge'));
  check('a metre past the edge is a stranger', far.some((p) => p.id === 'outside'));
  check('nobody is in both lists', near.filter((p) => far.some((f) => f.id === p.id)).length === 0);
  check('everybody is in one of them', near.length + far.length === 3);
}

// --- you, and the state before you have set a pin -------------------------
{
  const mine = person('you', 9999, 9999, { isYou: true });
  const { near, far } = visible(measure([mine, person('other', 9999, 0)], me));
  check('your own card is always visible, however far the pin', near.some((p) => p.id === 'you'));
  check('but other far people are not', far.some((p) => p.id === 'other'));

  const noPin = visible(measure([person('a', 9999, 0), person('b', 1, 0)], null));
  check('with no pin of your own, nobody is a stranger yet', noPin.far.length === 0);
  check('and everybody shows', noPin.near.length === 2);
}

// --- what a stranger is allowed to know -----------------------------------
{
  const stranger = asStranger(measure([person('x', 5000, 0, {
    pet: 'Secret', note: 'Walks at 6am down Elm', area: 'Murrayville Cemetery', photo: 'abc', avatar: 'data:image/png;base64,xx',
  })], me)[0]);

  const fields = Object.keys(stranger).sort().join(',');
  check('only four things survive', fields === 'id,initials,metres,name', fields);
  check('their pet is not there', !('pet' in stranger));
  check('their notes are not there', !('note' in stranger));
  check('where they walk is not there', !('area' in stranger) && !('at' in stranger));
  check('their photo is not there', !('photo' in stranger) && !('avatar' in stranger));
  check('none of it is in the JSON either', !JSON.stringify(stranger).includes('Secret'),
    JSON.stringify(stranger));
  check('a name and a rough distance do survive', stranger.name.length > 0 && stranger.metres !== null);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
