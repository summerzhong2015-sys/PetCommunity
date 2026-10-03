/**
 * Tests for campaign funding state.
 *
 * This is the part of the app that asks people for money, so the arithmetic has
 * to be exactly right and the edges have to be boring: a met goal must never
 * still read as needing something, a shortfall must never be offered as a
 * larger amount than it is, and "your money finishes X" must be true.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:funding
 */

import { CAMPAIGNS, PRESET_AMOUNTS } from './giving-data.ts';
import { describeNext, fundingOf, nextItem, suggestedAmounts , WIND_DOWN_DAYS, describeWindDown, metAt, windDown } from './funding.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

// --- state ----------------------------------------------------------------
{
  const open = fundingOf(1000, 200);
  check('a long way off is open', open.state === 'open');
  check('remaining is the shortfall', open.remaining === 800);
  check('nothing spare before the goal', open.surplus === 0);
  check('percent tracks the total', Math.round(open.percent) === 20);

  const nearly = fundingOf(1000, 950);
  check('within a tenth is nearly there', nearly.state === 'nearly', nearly.state);
  check('nearly still has a shortfall', nearly.remaining === 50);

  const edge = fundingOf(1000, 900);
  check('exactly a tenth short still counts as nearly', edge.state === 'nearly', edge.state);
  const justOutside = fundingOf(1000, 899);
  check('a pound past that is open', justOutside.state === 'open', justOutside.state);

  const met = fundingOf(1000, 1000);
  check('meeting the goal is funded', met.state === 'funded');
  check('a met goal needs nothing', met.remaining === 0);
  check('a met goal has no surplus', met.surplus === 0);
  check('a met goal is at a hundred percent', met.percent === 100);

  const over = fundingOf(4800, 4900);
  check('past the goal is still funded', over.state === 'funded');
  check('past the goal needs nothing', over.remaining === 0, `${over.remaining}`);
  check('the surplus is what came after', over.surplus === 100);
  check('percent never runs past a hundred', over.percent === 100);
}

// Nothing here may produce a negative or a fraction of a unit.
{
  for (const [goal, raised] of [[0, 0], [1000, -50], [0, 500], [-10, -10], [999, 1000.6]] as const) {
    const f = fundingOf(goal, raised);
    check(`goal ${goal} raised ${raised}: nothing is negative`,
      f.remaining >= 0 && f.surplus >= 0 && f.percent >= 0);
    check(`goal ${goal} raised ${raised}: amounts are whole`,
      Number.isInteger(f.remaining) && Number.isInteger(f.surplus));
    check(`goal ${goal} raised ${raised}: it is one state or the other`,
      (f.remaining === 0) === (f.state === 'funded'));
  }
}

// --- what the next money pays for -----------------------------------------
{
  const rows = [
    { label: 'Chemotherapy course', amount: 3600 },
    { label: 'Bloodwork and monitoring', amount: 700 },
    { label: 'Anti-sickness and pain relief', amount: 500 },
  ];

  check('nothing raised points at the first line', nextItem(rows, 0)?.label === 'Chemotherapy course');
  check('nothing raised leaves the whole line outstanding', nextItem(rows, 0)?.outstanding === 3600);

  const part = nextItem(rows, 3000);
  check('partway through a line stays on that line', part?.label === 'Chemotherapy course');
  check('what is left on the line is exact', part?.outstanding === 600);
  check('what is covered is exact', part?.covered === 3000);

  check('a finished line moves on', nextItem(rows, 3600)?.label === 'Bloodwork and monitoring');
  check('and the new line starts empty', nextItem(rows, 3600)?.covered === 0);
  check('mid second line', nextItem(rows, 4000)?.outstanding === 300);
  check('onto the third', nextItem(rows, 4300)?.label === 'Anti-sickness and pain relief');
  check('everything paid for leaves nothing next', nextItem(rows, 4800) === null);
  check('more than everything still leaves nothing next', nextItem(rows, 99999) === null);
  check('an empty breakdown has no next line', nextItem([], 0) === null);
}

// --- the sentence ---------------------------------------------------------
{
  const item = { label: 'Bloodwork and monitoring', outstanding: 300, covered: 400 };
  check('enough finishes the line', describeNext(item, 300) === 'Finishes bloodwork and monitoring.');
  check('more than enough still finishes it', describeNext(item, 5000)?.startsWith('Finishes') === true);
  check('less goes towards it', describeNext(item, 50) === 'Goes towards bloodwork and monitoring.');
  check('nothing outstanding says nothing', describeNext(null, 50) === null);
  check('giving nothing says nothing', describeNext(item, 0) === null);
  check('a proper noun keeps its capital',
    describeNext({ label: 'MRI scan', outstanding: 10, covered: 0 }, 5) === 'Goes towards MRI scan.');
}

// --- what to offer --------------------------------------------------------
{
  const presets = [10, 25, 50, 100];
  check('a wide-open campaign offers everything',
    JSON.stringify(suggestedAmounts(presets, 900)) === JSON.stringify([10, 25, 50, 100, 900]));

  const short = suggestedAmounts(presets, 40);
  check('nothing bigger than the shortfall is offered', short.every((a) => a <= 40), short.join(','));
  check('finishing it is the last option', short[short.length - 1] === 40);
  check('the shortfall is not offered twice',
    new Set(suggestedAmounts(presets, 50)).size === suggestedAmounts(presets, 50).length,
    suggestedAmounts(presets, 50).join(','));

  const funded = suggestedAmounts(presets, 0);
  check('a funded campaign offers the normal amounts', JSON.stringify(funded) === JSON.stringify(presets));
  check('a funded campaign never offers a shortfall', !funded.includes(0));
}

// --- against the real campaigns -------------------------------------------
for (const campaign of CAMPAIGNS) {
  const f = fundingOf(campaign.goal, campaign.raised);
  check(`${campaign.title}: percent is sane`, f.percent >= 0 && f.percent <= 100);
  check(`${campaign.title}: the breakdown adds up to the goal`,
    campaign.breakdown.reduce((sum, row) => sum + row.amount, 0) === campaign.goal,
    `${campaign.breakdown.reduce((s, r) => s + r.amount, 0)} vs ${campaign.goal}`);
  check(`${campaign.title}: offered amounts never exceed the shortfall`,
    suggestedAmounts([...PRESET_AMOUNTS], f.remaining).every((a) => f.remaining === 0 || a <= f.remaining));
  if (f.remaining > 0) {
    check(`${campaign.title}: there is a line to point at`, nextItem(campaign.breakdown, campaign.raised) !== null);
  }
}

// --- a funded campaign comes off the page after three days ---------------
// It should not vanish the moment the last pound lands — people who gave want
// to see it land — and it should not sit there forever once it is paid for.
{
  const DAY = 24 * 60 * 60 * 1000;
  const now = 1_000_000_000_000;

  check('three days is three days', WIND_DOWN_DAYS === 3);
  check('a campaign still short has no clock running', metAt(1000, 400, [{ amount: 100, at: now }], now) === null);
  check('nothing given and nothing raised leaves it open', metAt(1000, 0, [], now) === null);

  // The clock starts on the contribution that crossed the line, not the last one.
  const crossed = metAt(1000, 800, [
    { amount: 50, at: now - 5 * DAY },
    { amount: 200, at: now - 4 * DAY },
    { amount: 25, at: now - 1 * DAY },
  ], now);
  check('the clock starts when the goal was met', crossed === now - 4 * DAY, String(crossed));
  check('contributions out of order are still replayed in order',
    metAt(1000, 800, [
      { amount: 25, at: now - 1 * DAY },
      { amount: 200, at: now - 4 * DAY },
      { amount: 50, at: now - 5 * DAY },
    ], now) === now - 4 * DAY);
  check('exactly meeting the goal counts as met', metAt(1000, 900, [{ amount: 100, at: now }], now) === now);
  check('rubbish contributions do not start a clock',
    metAt(1000, 900, [{ amount: Number.NaN, at: now }, { amount: 100, at: Number.NaN }], now) === null);

  // One already over the goal before anyone here gave: we were never told when
  // that happened, so it gets its three days from now rather than vanishing.
  check('a campaign already over its goal starts its three days now',
    metAt(1000, 1200, [], now) === now);

  const fresh = windDown(now - 2 * DAY, now);
  check('two days in, it is still on the page', fresh !== null && !fresh.gone);
  check('two days in, one day is left', fresh !== null && Math.round(fresh.msLeft / DAY) === 1);
  const over = windDown(now - 3 * DAY, now);
  check('at three days it is gone', over !== null && over.gone);
  check('well past three days it stays gone', windDown(now - 90 * DAY, now)!.gone);
  check('a campaign still asking has no wind-down at all', windDown(null, now) === null);

  check('a day out reads in days', describeWindDown(windDown(now - 2 * DAY, now)) === 'Leaving the page in 1 day',
    describeWindDown(windDown(now - 2 * DAY, now)));
  check('hours read in hours',
    /^Leaving the page in \d+ hours$/.test(describeWindDown(windDown(now - 2.6 * DAY, now))),
    describeWindDown(windDown(now - 2.6 * DAY, now)));
  check('the last stretch reads plainly',
    describeWindDown(windDown(now - (3 * DAY - 1000), now)) === 'Leaving the page within the hour');
  check('a gone campaign says so', describeWindDown(windDown(now - 10 * DAY, now)) === 'Closed');
  check('nothing to describe is an empty string', describeWindDown(null) === '');
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
