/**
 * Tests for the message check.
 *
 * Two things matter about a filter: it catches what it claims to, and it does
 * not fire on ordinary sentences. The second half is the one that ruins an app
 * — a neighbour who cannot say "I passed your house on the way to class" will
 * simply stop using it. Both halves are covered below.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:moderation
 */

import { inspect, normalise } from './moderation.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

// --- ordinary messages must go straight through ---
{
  const fine = [
    'Hi Rowan, I saw Pip near the creek path about ten minutes ago.',
    'Of course. I will let you know if I see him on the creek path.',
    'Creekside at 5:30?',
    'Penny knows every shady bench on that route, it is very sweet.',
    'I passed your house on the way to class this morning.',
    'The grass is long by the south gate, mind the mud.',
    'He is an assassin with a tennis ball, honestly.',
    'I analyse data for work so I am home most days.',
    'My therapist says I should walk more, so here I am.',
    'We are at 5 past the hour, see you then.',
    'Basil is a big bass-voiced boy when he barks.',
    'Shiitake mushrooms are toxic to dogs raw, just so you know.',
    'Thanks so much! That is a massive help.',
  ];
  for (const text of fine) {
    const v = inspect(text);
    check(`clean: "${text.slice(0, 44)}…"`, v.level === 'clean', `${v.level} ${v.category ?? ''} ${v.matched ?? ''}`);
  }
  check('empty text is clean', inspect('').level === 'clean');
  check('whitespace is clean', inspect('   \n  ').level === 'clean');
}

// --- abuse is blocked, including the usual dodges ---
{
  for (const text of ['you are a fucking idiot', 'F U C K you', 'f.u.c.k off', 'fuuuuck this', 'f4ck you', 'what a bitch']) {
    const v = inspect(text);
    check(`blocks: "${text}"`, v.level === 'block' && v.category === 'abuse', `${v.level} ${v.category ?? ''}`);
  }
}

// --- threats ---
{
  for (const [text, cat] of [
    ['i will kill you', 'threat'],
    ['im gonna hurt you if you come back', 'threat'],
    ['i know where you live', 'threat'],
    ['watch your back', 'threat'],
    ['i will poison your dog', 'threat'],
    ['kys', 'self-harm'],
    ['go kill yourself', 'self-harm'],
  ] as const) {
    const v = inspect(text);
    check(`blocks ${cat}: "${text}"`, v.level === 'block' && v.category === cat, `${v.level} ${v.category ?? ''}`);
  }
  // Ordinary uses of the same verbs must survive.
  check('"kill time" is fine', inspect('I have an hour to kill before the vet').level === 'clean');
  check('"beat the rain" is fine', inspect('We should go now and beat the rain').level === 'clean');
  check('"dead end" is fine', inspect('The path past the depot is a dead end').level === 'clean');
}

// --- unwanted advances ---
{
  const v = inspect('send me nudes');
  check('blocks a sexual request', v.level === 'block' && v.category === 'sexual', `${v.level}`);
}

// --- contact details warn rather than block: sharing yours is your choice ---
{
  const addr = inspect('I am at 14 Creekside Row if you want to drop the collar off');
  check('warns on a street address', addr.level === 'warn' && addr.category === 'address', `${addr.level} ${addr.category ?? ''}`);
  check('the warning names what it saw', Boolean(addr.matched && addr.matched.includes('Creekside')), addr.matched ?? '');

  const phone = inspect('call me on 555 0142 any time');
  check('warns on a phone number', phone.level === 'warn' && phone.category === 'contact-details', `${phone.level}`);

  const email = inspect('email me at rowan@example.com');
  check('warns on an email', email.level === 'warn' && email.category === 'contact-details', `${email.level}`);

  check('a warning is still sendable', addr.level !== 'block');
  // Numbers that are not phone numbers must not trip it.
  check('a time is not a phone number', inspect('Creekside at 5:30?').level === 'clean');
  check('a distance is not a phone number', inspect('It is about 2 km from the gate').level === 'clean');
  check('a date is not a phone number', inspect('Sunday 16 June at 9am works').level === 'clean');
}

// --- abuse outranks a warning ---
{
  const v = inspect('call me on 555 0142 you prick');
  check('abuse wins over a contact-details warning', v.level === 'block' && v.category === 'abuse', `${v.level} ${v.category ?? ''}`);
}

// --- the normaliser ---
{
  check('collapses repeats', normalise('fuuuuck') === 'fuck', normalise('fuuuuck'));
  check('strips separators inside a word', normalise('f.u.c.k') === 'fuck', normalise('f.u.c.k'));
  check('maps leetspeak', normalise('f4ck') === 'fack', normalise('f4ck'));
  check('leaves ordinary double letters alone', normalise('will hello') === 'will hello', normalise('will hello'));
  check('keeps word gaps', normalise('hello there friend').split(' ').length === 3, normalise('hello there friend'));
  check('is deterministic', normalise('Some Text!!') === normalise('Some Text!!'));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
