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

import { LANDMARKS } from './neighborhood-map.ts';
import { defaultProfile, isProfileSet, isProfileStarted, normalizeProfile, NEIGHBOURHOODS } from './profile.ts';

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
    breed: 'Terrier', age: '4 years', neighbourhood: NEIGHBOURHOODS[3], shareArea: true, frame: 'scallop', bio: 'Bolts at bikes.',
    portrait: { species: 'dog' as const, coat: { base: '#111', shade: '#222', accent: '#333', bg: '#444' },
                marking: 'patch' as const, ears: 'folded' as const, mood: 'wary' as const },
  };
  const p = normalizeProfile(full);
  // Key by key, so adding a field to the profile does not fail this on
  // ordering alone.
  const differing = Object.entries(full).filter(
    ([key, value]) => JSON.stringify((p as Record<string, unknown>)[key]) !== JSON.stringify(value),
  );
  check('a complete profile round-trips unchanged', differing.length === 0, JSON.stringify(differing));
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

// Whether to put their picture in the sidebar. Looser than isProfileSet: one
// personalised field is enough, because the alternative is hiding their own
// portrait from them.
{
  check('an untouched profile has not started', !isProfileStarted(defaultProfile));
  check('a changed pet name starts it', isProfileStarted({ ...defaultProfile, petName: 'Pip' }));
  check('a changed username starts it', isProfileStarted({ ...defaultProfile, username: 'Summer' }));
  check('a breed on its own starts it', isProfileStarted({ ...defaultProfile, breed: 'Terrier mix' }));
  check('an age on its own starts it', isProfileStarted({ ...defaultProfile, age: '3 years' }));
  check('a bio on its own starts it', isProfileStarted({ ...defaultProfile, bio: 'Loves the creek path.' }));
  check('switching to a cat starts it', isProfileStarted({ ...defaultProfile, petType: 'cat' }));
  check('a recoloured coat starts it', isProfileStarted({
    ...defaultProfile,
    portrait: { ...defaultProfile.portrait, coat: { base: '#111', shade: '#222', accent: '#333', bg: '#444' } },
  }));
  check('whitespace alone does not start it',
    !isProfileStarted({ ...defaultProfile, breed: '   ', age: ' ', bio: '  ' }));
  check('a started profile is not necessarily a set one',
    isProfileStarted({ ...defaultProfile, breed: 'Terrier mix' }) &&
    !isProfileSet({ ...defaultProfile, breed: 'Terrier mix' }));
  check('a fully set profile has certainly started',
    isProfileStarted({ ...defaultProfile, username: 'Summer', petName: 'Pip' }));
}

// Appearing in the neighbours list is opt-in, and every path that is not an
// explicit yes has to read as no.
{
  check('a fresh profile is not listed', normalizeProfile(null).shareArea === false);
  check('an older stored profile is not listed',
    normalizeProfile({ username: 'Summer', petName: 'Candy', petType: 'dog' }).shareArea === false);
  check('saying yes is kept', normalizeProfile({ shareArea: true }).shareArea === true);
  check('saying no is kept', normalizeProfile({ shareArea: false }).shareArea === false);
  check('a truthy non-boolean is not consent',
    normalizeProfile({ shareArea: 'yes' as unknown as boolean }).shareArea === false);
  check('a number is not consent',
    normalizeProfile({ shareArea: 1 as unknown as boolean }).shareArea === false);
  check('consent survives normalising twice',
    normalizeProfile(normalizeProfile({ shareArea: true })).shareArea === true);
}

// --- where you walk from --------------------------------------------------
// The point of the pin is that nobody has one until they set one: a profile
// read back from storage must not look like it was answered.
{
  check('a fresh profile has no pin', normalizeProfile({}).area === undefined);
  check('a fresh profile is not counted as started', !isProfileStarted(normalizeProfile({})));
  check('a pin alone counts as started', isProfileStarted(normalizeProfile({ area: { x: 100, y: 100 } } as never)));

  for (const junk of [{ x: 'a', y: 2 }, { x: Number.NaN, y: 0 }, 'garden', 42, []]) {
    check(`a rubbish pin (${JSON.stringify(junk)}) is dropped`, normalizeProfile({ area: junk } as never).area === undefined);
  }

  const stored = normalizeProfile({ area: { x: 137.6, y: -92.4 } } as never);
  check('a stored pin is re-rounded on the way in',
    stored.area !== undefined && stored.area.x % 50 === 0 && stored.area.y % 50 === 0, JSON.stringify(stored.area));

  // The label is what neighbours see, so it must follow the pin rather than
  // whatever was saved beside it.
  const garden = LANDMARKS.find((l) => l.id === 'garden')!;
  const moved = normalizeProfile({ area: garden.at, neighbourhood: 'Hilltop Lookout' } as never);
  check('the label follows the pin', moved.neighbourhood === garden.name, moved.neighbourhood);
  check('without a pin the saved label is kept',
    normalizeProfile({ neighbourhood: 'Hilltop Lookout' }).neighbourhood === 'Hilltop Lookout');
  check('the label is always a real landmark',
    LANDMARKS.some((l) => l.name === normalizeProfile({ area: { x: 0, y: 0 } } as never).neighbourhood));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
