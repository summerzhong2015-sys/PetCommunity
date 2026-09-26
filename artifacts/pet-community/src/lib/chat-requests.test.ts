/**
 * Tests for starting a conversation with a neighbour.
 *
 * The rule the whole feature exists to enforce: you cannot put anything in
 * someone's inbox until they have said yes. So the tests care most about the
 * states you must not be able to skip, and about a declined request leaving
 * nothing behind.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:chat
 */

import { NEIGHBOURS } from './neighbours-data.ts';
import {
  OPENER_LIMIT, SIMULATED_REPLY_MS,
  accept, askable, canSend, checkOpener, decline, inbox, requestThread, type Thread,
} from './chat-requests.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

const mara = { id: 'mara', name: 'Mara Singh', initials: 'MS', pet: 'Clover' };

// --- who you can ask ------------------------------------------------------
{
  check('with no threads, everyone is askable', askable(NEIGHBOURS, []).length === NEIGHBOURS.length);

  const pending = requestThread(mara, 'Hello!');
  check('someone you have asked is not offered again',
    !askable(NEIGHBOURS, [pending]).some((n) => n.id === 'mara'));

  const open = accept(pending, '9:00 AM');
  check('someone you already talk to is not offered',
    !askable(NEIGHBOURS, [open]).some((n) => n.id === 'mara'));

  const refused = decline(pending);
  check('someone who said no can be asked again another time',
    askable(NEIGHBOURS, [refused]).some((n) => n.id === 'mara'));

  check('a seeded thread with no neighbour does not hide anyone',
    askable(NEIGHBOURS, [{ id: 't1', name: 'Rowan', initials: 'RB', pet: 'Pip', preview: '', messages: [], state: 'open' }])
      .length === NEIGHBOURS.length);
}

// --- the hello ------------------------------------------------------------
{
  check('an empty hello is refused', !checkOpener('').ok);
  check('whitespace alone is refused', !checkOpener('   \n ').ok);
  check('a short hello is fine', checkOpener('Hi! Saw you and Clover at the garden.').ok);
  check('exactly at the limit is fine', checkOpener('a'.repeat(OPENER_LIMIT)).ok);
  check('one over the limit is refused', !checkOpener('a'.repeat(OPENER_LIMIT + 1)).ok);
  const long = checkOpener('a'.repeat(OPENER_LIMIT + 50));
  check('and the refusal names the limit', !long.ok && long.reason.includes(String(OPENER_LIMIT)));
  check('the limit is a sensible length for a first message', OPENER_LIMIT >= 120 && OPENER_LIMIT <= 400);
}

// --- the states you cannot skip -------------------------------------------
{
  const req = requestThread(mara, '  Hi from the creek path.  ', 1_700_000_000_000);
  check('a request starts pending', req.state === 'pending');
  check('a request carries nothing in the inbox yet', req.messages.length === 0);
  check('the hello is kept, trimmed', req.opener === 'Hi from the creek path.');
  check('the preview says what is happening', /accept/i.test(req.preview));
  check('it remembers who it is with', req.neighbourId === 'mara');
  check('it remembers when', req.requestedAt === 1_700_000_000_000);
  check('you cannot type into a pending thread', !canSend(req));
  check('you cannot type into nothing', !canSend(undefined));

  const yes = accept(req, '9:04 AM');
  check('accepting opens it', yes.state === 'open');
  check('and you can type', canSend(yes));
  check('the hello you already wrote becomes the first message', yes.messages.length === 1);
  check('and it is from you', yes.messages[0].from === 'me');
  check('with the text you wrote', yes.messages[0].text === 'Hi from the creek path.');
  check('the preview becomes the message', yes.preview === 'Hi from the creek path.');

  // Accepting is not something that can happen twice.
  const again = accept(yes, '9:05 AM');
  check('accepting an open thread changes nothing', again === yes);
  check('and does not duplicate the hello', again.messages.length === 1);

  const no = decline(req);
  check('declining marks it declined', no.state === 'declined');
  check('a declined request keeps no message', no.messages.length === 0);
  check('and does not keep what you wrote', no.opener === undefined);
  check('you cannot type into it', !canSend(no));
  check('declining an accepted thread does nothing', decline(yes) === yes);
  check('accepting a declined request does nothing', accept(no, '9:06 AM') === no);
}

// A request with nothing in it must not produce an empty message bubble.
{
  const blank = { ...requestThread(mara, 'x'), opener: '   ' };
  const opened = accept(blank, '9:00 AM');
  check('an empty hello leaves no empty bubble', opened.messages.length === 0);
}

// --- the inbox ------------------------------------------------------------
{
  const seeded: Thread = { id: 't1', name: 'Rowan', initials: 'RB', pet: 'Pip', preview: 'hi', messages: [], state: 'open' };
  const older = requestThread({ id: 'theo', name: 'Theo', initials: 'TA', pet: 'Basil' }, 'hi', 1000);
  const newer = requestThread(mara, 'hi', 2000);
  const refused = decline(requestThread({ id: 'nora', name: 'Nora', initials: 'NW', pet: 'Penny' }, 'hi', 500));

  const list = inbox([seeded, older, newer, refused]);
  check('a declined request is not in the inbox', !list.some((t) => t.state === 'declined'));
  check('everything else is', list.length === 3);
  check('waiting requests come first', list[0].state === 'pending' && list[1].state === 'pending');
  check('and the newest request is at the top', list[0].id === newer.id);
  check('open threads follow', list[2].id === 't1');
  check('the inbox does not mutate what it was given',
    JSON.stringify(inbox([seeded, older])) !== '' && seeded.state === 'open');
}

// --- the standing-in bit --------------------------------------------------
{
  check('the simulated reply is long enough to read as waiting', SIMULATED_REPLY_MS >= 3000);
  check('but not so long it looks broken', SIMULATED_REPLY_MS <= 15000);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
