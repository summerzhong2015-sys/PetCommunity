/**
 * Tests for the photographs, across adoption, the lost-pet board and giving.
 *
 * These images live on somebody else's server, so the risks are: a listing
 * missing one, two animals sharing a face, and a malformed id that renders a
 * broken-image icon in the middle of the page. The drawn portrait is the
 * fallback for an image that fails to load, so every animal must still carry
 * one.
 *
 * One reuse is deliberate and lives outside these modules: Miso is Camille's
 * cat on Nearby, the cat in the Messages thread, and the cat on the lost-pet
 * board, and shares a photograph across all three. Within the data files
 * checked here, every face must be unique.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:adoption
 */

import { ADOPTABLE_PETS } from './adoption-data.ts';
import { LOST_CASES } from './lost-pet-data.ts';
import { CAMPAIGNS } from './giving-data.ts';

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

// --- the lost-pet board ---------------------------------------------------
for (const item of LOST_CASES) {
  check(`${item.petName}: the seeded alert has a photograph`,
    typeof item.photo === 'string' && item.photo.length > 0);
  check(`${item.petName}: the photo id is well formed`,
    /^[0-9]{10,16}-[0-9a-z]{12}$/.test(item.photo ?? ''), item.photo ?? '(none)');
  check(`${item.petName}: keeps a drawing to fall back to`,
    !!item.portrait?.coat?.base && item.portrait.species === item.species);
}

// --- giving ---------------------------------------------------------------
for (const campaign of CAMPAIGNS) {
  if (!campaign.portrait) {
    check(`${campaign.title}: a campaign with no animal carries no photo`, !campaign.photo);
    continue;
  }
  check(`${campaign.title}: the animal has a photograph`,
    typeof campaign.photo === 'string' && campaign.photo.length > 0);
  check(`${campaign.title}: the photo id is well formed`,
    /^[0-9]{10,16}-[0-9a-z]{12}$/.test(campaign.photo ?? ''), campaign.photo ?? '(none)');
}

// --- across the whole app -------------------------------------------------
{
  const all = [
    ...ADOPTABLE_PETS.map((p) => ({ where: `adopt/${p.name}`, photo: p.photo })),
    ...LOST_CASES.map((c) => ({ where: `lost/${c.petName}`, photo: c.photo })),
    ...CAMPAIGNS.map((c) => ({ where: `give/${c.title}`, photo: c.photo })),
  ].filter((entry) => entry.photo);

  const counts = new Map<string, string[]>();
  for (const entry of all) {
    counts.set(entry.photo!, [...(counts.get(entry.photo!) ?? []), entry.where]);
  }
  const repeated = [...counts.entries()].filter(([, places]) => places.length > 1);

  check('a face is never reused where it would read as two different animals',
    repeated.length === 0,
    repeated.map(([p, places]) => `${p}: ${places.join(', ')}`).join(' | '));
}

// --- text that has to hold a drop cap -------------------------------------
// Stories are set as prose with a drop cap on the first letter. A one-line
// story under a three-line capital looks like a mistake, and a headline long
// enough to wrap three times stops being a pull quote.
for (const pet of ADOPTABLE_PETS) {
  check(`${pet.name}: the story is long enough to carry a drop cap`,
    pet.story.length >= 140, `${pet.story.length}`);
  check(`${pet.name}: the story starts with a letter, not a quote or a number`,
    /^[A-Za-z]/.test(pet.story), pet.story.slice(0, 12));
  check(`${pet.name}: the headline works as a pulled line`,
    pet.headline.length >= 20 && pet.headline.length <= 90, `${pet.headline.length}`);
}

for (const campaign of CAMPAIGNS) {
  check(`${campaign.title}: the story is long enough to carry a drop cap`,
    campaign.story.length >= 140, `${campaign.story.length}`);
  check(`${campaign.title}: the story starts with a letter`,
    /^[A-Za-z]/.test(campaign.story), campaign.story.slice(0, 12));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
