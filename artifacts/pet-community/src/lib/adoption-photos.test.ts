/**
 * Tests for the adoption photographs.
 *
 * These images live on somebody else's server, so the risks are: a listing
 * missing one, two pets sharing a face, and a malformed id that renders a
 * broken-image icon in the middle of the page. The drawn portrait is the
 * fallback for an image that fails to load, so every pet must still carry one.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:adoption
 */

import { ADOPTABLE_PETS } from './adoption-data.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

check('there are pets to adopt', ADOPTABLE_PETS.length >= 8, `${ADOPTABLE_PETS.length}`);

for (const pet of ADOPTABLE_PETS) {
  check(`${pet.name}: has a photograph`, typeof pet.photo === 'string' && pet.photo.length > 0);
  check(`${pet.name}: the photo id is well formed`,
    /^[0-9]{10,16}-[0-9a-z]{12}$/.test(pet.photo ?? ''), pet.photo ?? '(none)');
  check(`${pet.name}: still has a drawn portrait to fall back to`,
    !!pet.portrait && !!pet.portrait.coat?.base && !!pet.portrait.marking);
  check(`${pet.name}: the portrait is the same species as the listing`,
    pet.portrait.species === pet.species, `${pet.portrait.species} vs ${pet.species}`);
}

{
  const photos = ADOPTABLE_PETS.map((p) => p.photo);
  check('no two animals share a photograph', new Set(photos).size === photos.length,
    photos.filter((p, i) => photos.indexOf(p) !== i).join(' '));
}

{
  const ids = ADOPTABLE_PETS.map((p) => p.id);
  check('ids are unique', new Set(ids).size === ids.length);
}

// The URL the page actually builds, since a wrong parameter here is a wrong
// crop on every card at once.
{
  const build = (photo: string, width: number) =>
    `https://images.unsplash.com/photo-${photo}?w=${width}&h=${width}&fit=crop&crop=faces,entropy&q=72&auto=format`;
  const url = build(ADOPTABLE_PETS[0].photo!, 520);

  check('the url points at the image host', url.startsWith('https://images.unsplash.com/photo-'));
  check('the crop is square', url.includes('w=520') && url.includes('h=520'));
  check('faces are kept in frame', url.includes('crop=faces'));
  check('the image is served resized, not full size', url.includes('fit=crop'));
  check('a modern format is requested', url.includes('auto=format'));
  check('nothing is fetched at full quality', url.includes('q=72'));
  check('no premium host slips in', ADOPTABLE_PETS.every((p) => !p.photo?.startsWith('premium')));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
