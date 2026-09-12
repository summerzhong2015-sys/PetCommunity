/**
 * Tests for reading a stored profile back.
 *
 * This is the code path that turned the profile page white: a profile saved by
 * an earlier version has only a username, a pet name and a species, and the
 * page now reads a portrait, a bio and a neighbourhood off it. Anything missing
 * has to come back filled in rather than undefined.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:profile
 */

import { defaultProfile, isProfileSet, normalizeProfile, NEIGHBOURHOODS } from './profile.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

function complete(p: ReturnType<typeof normalizeProfile>): boolean {
  return (
    typeof p.username === 'string' && p.username.length > 0 &&
    typeof p.petName === 'string' && p.petName.length > 0 &&
    (p.petType === 'dog' || p.petType === 'cat') &&
    typeof p.breed === 'string' && typeof p.age === 'string' &&
    typeof p.bio === 'string' && typeof p.neighbourhood === 'string' &&
    !!p.portrait && !!p.portrait.coat && !!p.portrait.coat.base &&
    !!p.portrait.marking && !!p.portrait.ears && !!p.portrait.mood
  );
}

// The exact shape older versions wrote.
{
  const old = { username: 'MapleParkMaya', petName: 'Juniper', petType: 'cat' as const };
  const p = normalizeProfile(old);
  check('an old three-field profile comes back complete', complete(p), JSON.stringify(p));
  check('it keeps the username', p.username === 'MapleParkMaya');
  check('it keeps the pet name', p.petName === 'Juniper');
  check('it keeps the species', p.petType === 'cat');
  check('the portrait species matches the pet', p.portrait.species === 'cat');
}

// Every degenerate thing localStorage can hand back.
{
  for (const [label, value] of [
    ['null', null],
    ['undefined', undefined],
    ['empty object', {}],
    ['blank strings', { username: '   ', petName: '', petType: 'dog' as const }],
    ['unknown species', { username: 'A', petName: 'B', petType: 'ferret' as never }],
    ['portrait half-written', { username: 'A', petName: 'B', portrait: { species: 'dog' } as never }],
    ['neighbourhood gone', { username: 'A', petName: 'B', neighbourhood: '' }],
  ] as const) {
    const p = normalizeProfile(value as never);
    check(`${label} still yields a complete profile`, complete(p), JSON.stringify(p));
  }
}

// Values that are present must survive untouched.
{
  const full = {
    username: 'Rowan', petName: 'Pip', petType: 'dog' as const,
    breed: 'Terrier', age: '4 years', neighbourhood: NEIGHBOURHOODS[3], bio: 'Bolts at bikes.',
    portrait: { species: 'dog' as const, coat: { base: '#111', shade: '#222', accent: '#333', bg: '#444' },
                marking: 'patch' as const, ears: 'folded' as const, mood: 'wary' as const },
  };
  const p = normalizeProfile(full);
  check('a complete profile round-trips unchanged',
    JSON.stringify(p) === JSON.stringify(full), JSON.stringify(p));
}

// Species and portrait must not be able to disagree — the drawing reads species.
{
  const mismatched = {
    username: 'A', petName: 'B', petType: 'cat' as const,
    portrait: { species: 'dog' as const, coat: { base: '#1', shade: '#2', accent: '#3', bg: '#4' },
                marking: 'solid' as const, ears: 'floppy' as const, mood: 'bright' as const },
  };
  check('portrait species is forced to match the pet type',
    normalizeProfile(mismatched).portrait.species === 'cat');
}

// isProfileSet drives the pre-filled lost-pet report, so it must not fire on defaults.
{
  check('defaults do not count as set', !isProfileSet(defaultProfile));
  check('defaults survive normalising', !isProfileSet(normalizeProfile(defaultProfile)));
  check('a real profile counts as set',
    isProfileSet(normalizeProfile({ username: 'Rowan', petName: 'Pip', petType: 'dog' })));
  check('only one name filled in does not count as set',
    !isProfileSet(normalizeProfile({ username: 'Rowan', petName: '', petType: 'dog' })));
}

// Normalising twice must not drift.
{
  const once = normalizeProfile({ username: 'A', petName: 'B', petType: 'cat' });
  check('normalising is idempotent', JSON.stringify(normalizeProfile(once)) === JSON.stringify(once));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
