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
  accept, askable, canSend, checkOpener, decline, inbox, normaliseThread, readThreads,
  requestThread, unsend, type Thread,
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

// --- conversations saved by an older version of the app -------------------
// This is the bug that made the app look broken: threads were saved before
// `state` existed, so every one of them read as an unanswered request. You
// could not type into them, and withdrawing did nothing you could see.
{
  const old = { id: 't1', name: 'Rowan Bell', initials: 'RB', pet: 'Pip \u00b7 terrier', preview: 'Thanks', messages: [
    { from: 'them', text: 'Hi, thank you for looking out for him.', time: '9:04 AM' },
    { from: 'me', text: 'Of course.', time: '9:11 AM' },
  ] };
  const fixed = normaliseThread(old)!;
  check('a thread with messages and no state opens', fixed.state === 'open', fixed.state);
  check('its messages survive', fixed.messages.length === 2);
  check('you can type into it again', canSend(fixed));

  const stillAsking = normaliseThread({ id: 'r1', name: 'Theo', initials: 'TA', pet: 'Basil', preview: '', messages: [], opener: 'Hello!' })!;
  check('an unanswered request with no state stays pending', stillAsking.state === 'pending', stillAsking.state);
  check('and it cannot be typed into', !canSend(stillAsking));

  const empty = normaliseThread({ id: 'e1', name: 'Nobody', initials: 'NN', pet: '', preview: '', messages: [] })!;
  check('an empty thread with no opener opens rather than hanging', empty.state === 'open', empty.state);

  check('a stated state is left alone', normaliseThread({ id: 'x', state: 'declined', messages: [] })!.state === 'declined');
  check('a nonsense state is not kept', normaliseThread({ id: 'x', state: 'wobbly', messages: [] })!.state !== 'wobbly');

  for (const junk of [null, undefined, 42, 'thread', {}, { id: '' }, { name: 'no id' }]) {
    check(`rubbish (${JSON.stringify(junk)}) is dropped, not rendered`, normaliseThread(junk) === null);
  }

  const missing = normaliseThread({ id: 'm1', messages: [{ from: 'me', text: 'hi' }] })!;
  check('a thread with no name still renders', missing.name.length > 0, missing.name);
  check('initials are worked out when missing', missing.initials.length > 0, missing.initials);
  check('a message with no time does not break', missing.messages[0].time === '');
  check('half a message is dropped',
    normaliseThread({ id: 'h', messages: [{ from: 'me' }, { text: 'orphan' }, { from: 'me', text: 'kept' }] })!.messages.length === 1);

  check('storage that is not a list falls back', readThreads('nonsense', [stillAsking]).length === 1);
  check('an empty store falls back', readThreads([], [stillAsking]).length === 1);
  check('a store of rubbish falls back', readThreads([null, 7], [stillAsking]).length === 1);
  check('a real store is used', readThreads([old], [stillAsking])[0].id === 't1');
  check('normalising twice changes nothing',
    JSON.stringify(normaliseThread(fixed)) === JSON.stringify(fixed));
}

// --- taking back something you sent ---------------------------------------
{
  const thread = normaliseThread({ id: 'c1', name: 'Theo', initials: 'TA', pet: 'Basil', preview: 'second', messages: [
    { from: 'them', text: 'morning', time: '8:00 AM' },
    { from: 'me', text: 'first', time: '8:01 AM' },
    { from: 'me', text: 'second', time: '8:02 AM' },
  ] })!;

  const gone = unsend(thread, 2);
  check('your own message goes', gone.messages.length === 2);
  check('the right one goes', !gone.messages.some((m) => m.text === 'second'));
  check('the preview follows what is left', gone.preview === 'first', gone.preview);

  const older = unsend(thread, 1);
  check('an older message can go too', !older.messages.some((m) => m.text === 'first'));
  check('taking an older one back leaves the newest preview', older.preview === 'second', older.preview);

  check('you cannot take back what they said', unsend(thread, 0).messages.length === 3);
  check('an index that is not there changes nothing', unsend(thread, 99).messages.length === 3);
  check('a negative index changes nothing', unsend(thread, -1).messages.length === 3);
  check('the original is not mutated', thread.messages.length === 3);

  const emptied = unsend(unsend(thread, 2), 1);
  check('taking back everything you said leaves theirs', emptied.messages.length === 1);
  check('and the preview says something rather than nothing', emptied.preview.length > 0, emptied.preview);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
