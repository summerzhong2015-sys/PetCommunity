/**
 * Tests for the poster and the first-hour checklist.
 *
 * These are read by someone upset, in a hurry, and acting on what they say. So
 * the tests care about the two pieces of advice that are counter-intuitive and
 * most often got wrong — do not chase a bolter, search your own house first —
 * and about a poster never coming out with an empty field where a phone number
 * should be.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:lostpet-help
 */

import { LOST_CASES } from './lost-pet-data.ts';
import { firstHour, headlineAdvice } from './first-hour.ts';
import { buildPoster, posterBlurb, posterInstruction } from './lost-pet-poster.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

// --- the advice that matters most -----------------------------------------
{
  const skittish = firstHour({ name: 'Pip', species: 'dog', temperament: 'skittish' });
  check('a bolter is told not to chase, first',
    /do not call|do not chase/i.test(skittish[0].title), skittish[0].title);
  check('and it is emphasised', skittish[0].emphasis === true);
  check('neighbours are told not to chase either',
    skittish.some((s) => /tell everyone else/i.test(s.title)));

  const shy = firstHour({ name: 'Miso', species: 'cat', temperament: 'shy' });
  check('a shy animal gets the same warning', /do not/i.test(shy[0].title), shy[0].title);

  const friendly = firstHour({ name: 'Basil', species: 'dog', temperament: 'friendly' });
  check('a friendly animal may be called', /calling/i.test(friendly[0].title), friendly[0].title);
  check('and is never told not to chase',
    !friendly.some((s) => /do not chase/i.test(s.title)));
}

// --- search your own house first ------------------------------------------
{
  for (const species of ['cat', 'dog'] as const) {
    for (const temperament of ['friendly', 'shy', 'skittish'] as const) {
      const steps = firstHour({ name: 'Pip', species, temperament });
      check(`${species}/${temperament}: the house is searched again`,
        steps.some((s) => /search the house/i.test(s.title)));
      check(`${species}/${temperament}: scent is put outside`,
        steps.some((s) => /bed outside/i.test(s.title)));
      check(`${species}/${temperament}: the chip registry is called`,
        steps.some((s) => /microchip/i.test(s.title)));
      check(`${species}/${temperament}: sheds get checked`,
        steps.some((s) => /sheds/i.test(s.title)));
      check(`${species}/${temperament}: every step says something useful`,
        steps.every((s) => s.title.length > 8 && s.detail.length > 60));
      check(`${species}/${temperament}: the pet's name is used`,
        steps.some((s) => s.detail.includes('Pip')));
      check(`${species}/${temperament}: there are enough steps to be worth reading`,
        steps.length >= 6, `${steps.length}`);
      check(`${species}/${temperament}: but not so many nobody reads them`,
        steps.length <= 9, `${steps.length}`);
    }
  }
}

// --- species-specific -----------------------------------------------------
{
  const cat = firstHour({ name: 'Miso', species: 'cat', temperament: 'shy' });
  check('a cat search starts close', cat.some((s) => /search close/i.test(s.title)));
  check('and includes the small hours', cat.some((s) => /2am/i.test(s.title)));

  const dog = firstHour({ name: 'Pip', species: 'dog', temperament: 'shy' });
  check('a dog search covers ground', dog.some((s) => /cover ground/i.test(s.title)));
  check('and asks the other walkers', dog.some((s) => /dog walkers/i.test(s.title)));
  check('a dog is not told to search at 2am like a cat', !dog.some((s) => /2am/i.test(s.title)));
}

// --- the headline ---------------------------------------------------------
{
  check('a bolter headline warns', /do not/i.test(headlineAdvice('dog', 'skittish')));
  check('a friendly cat headline says start at home', /own house/i.test(headlineAdvice('cat', 'friendly')));
  check('a friendly dog headline says work outward', /outward/i.test(headlineAdvice('dog', 'friendly')));
  for (const s of ['cat', 'dog'] as const) {
    for (const t of ['friendly', 'shy', 'skittish'] as const) {
      const line = headlineAdvice(s, t);
      check(`${s}/${t} headline is one readable line`, line.length > 30 && line.length < 130, `${line.length}`);
    }
  }
}

// --- the poster -----------------------------------------------------------
{
  check('a bolter gets the strongest warning',
    posterInstruction({ petName: 'Pip', temperament: 'skittish' }).text.includes('DO NOT CHASE'));
  check('and it is marked as a warning',
    posterInstruction({ petName: 'Pip', temperament: 'skittish' }).isWarning);
  check('a shy animal gets a softer one',
    posterInstruction({ petName: 'Miso', temperament: 'shy' }).text.includes('Do not chase'));
  check('a friendly animal invites help',
    !posterInstruction({ petName: 'Basil', temperament: 'friendly' }).isWarning);
  check('and says to hold on to them',
    /hold on/i.test(posterInstruction({ petName: 'Basil', temperament: 'friendly' }).text));
}

// --- the blurb has to fit ---------------------------------------------------
{
  const short = 'Slipped his harness by the depot.';
  check('a short description is left alone', posterBlurb(short) === short);

  const long = 'Slipped his harness when a delivery van door slammed. He is food-motivated but bolts if anyone runs at him — please do not chase or call loudly, just let us know where you saw him and we will come.';
  const cut = posterBlurb(long);
  check('a long one is shortened', cut.length < long.length);
  check('and stays readable at a glance', cut.length <= 152, `${cut.length}`);
  check('and does not end mid-word', /[.!?…]$/.test(cut), cut.slice(-20));
  check('whitespace is tidied', posterBlurb('a   b\n\nc') === 'a b c');
  check('an empty description does not crash', posterBlurb('') === '');
}

// --- every real case makes a usable poster --------------------------------
for (const item of LOST_CASES) {
  const poster = buildPoster(item, 120);
  check(`${item.petName}: the poster has a name`, poster.petName.length > 0);
  check(`${item.petName}: it says what they look like`, poster.descriptor.length > 3, poster.descriptor);
  check(`${item.petName}: it says where they were last seen`, poster.lastSeen.length > 3);
  check(`${item.petName}: it says how long`, poster.missingFor.length > 0 && !/ago/.test(poster.missingFor));
  check(`${item.petName}: there is a way to get in touch`, poster.contact.trim().length > 5, poster.contact);
  check(`${item.petName}: there is exactly one instruction`, poster.instruction.split('.').length <= 2);
  check(`${item.petName}: the blurb fits`, poster.blurb.length <= 152, `${poster.blurb.length}`);
  check(`${item.petName}: markings are carried over`, poster.markings.length > 0);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
