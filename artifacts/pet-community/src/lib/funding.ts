/**
 * Where a campaign stands, and what the next contribution actually pays for.
 *
 * Two things a giving page usually makes people work out for themselves: how
 * much is still needed, and what their money buys. Both are answerable exactly
 * from what the campaign already publishes — the goal, the running total, and
 * the itemised breakdown — so neither is guessed at. Donors are owed a figure,
 * not an estimate.
 *
 * Money is treated as whole units throughout. A campaign that has met its goal
 * does not stop taking contributions; it stops *asking*, and says plainly where
 * anything further goes.
 */

export type FundingState = 'open' | 'nearly' | 'funded';

export type Funding = {
  state: FundingState;
  /** Still needed to reach the goal. Zero once met. */
  remaining: number;
  /** Anything past the goal. Zero until met. */
  surplus: number;
  /** 0–100, clamped. */
  percent: number;
};

/** Below this share of the goal outstanding, a campaign is within reach. */
const NEARLY_THRESHOLD = 0.1;

export function fundingOf(goal: number, raised: number): Funding {
  const safeGoal = Math.max(1, Math.round(goal));
  const total = Math.max(0, Math.round(raised));
  const remaining = Math.max(0, safeGoal - total);
  const surplus = Math.max(0, total - safeGoal);
  const percent = Math.min(100, (total / safeGoal) * 100);

  const state: FundingState =
    remaining === 0 ? 'funded' : remaining <= safeGoal * NEARLY_THRESHOLD ? 'nearly' : 'open';

  return { state, remaining, surplus, percent };
}

export type BreakdownRow = { label: string; amount: number };

export type NextItem = {
  label: string;
  /** Still unpaid on this line. */
  outstanding: number;
  /** How much of this line the money already raised has covered. */
  covered: number;
};

/**
 * The first line of the breakdown that is not yet paid for.
 *
 * The breakdown is read in order, as a shelter would spend it: each line is
 * filled before the next one starts. That makes "your £40 finishes the
 * bloodwork" a true statement rather than a nice one.
 */
export function nextItem(breakdown: BreakdownRow[], raised: number): NextItem | null {
  let left = Math.max(0, Math.round(raised));
  for (const row of breakdown) {
    const amount = Math.max(0, Math.round(row.amount));
    if (left >= amount) {
      left -= amount;
      continue;
    }
    return { label: row.label, outstanding: amount - left, covered: left };
  }
  return null;
}

/**
 * Amounts worth offering, given what is left.
 *
 * Offering £100 to a campaign that needs £40 asks someone to overshoot without
 * saying so. Presets above the shortfall are dropped, and the exact shortfall
 * is offered last so finishing it is one tap.
 */
export function suggestedAmounts(presets: number[], remaining: number): number[] {
  if (remaining <= 0) return [...presets];
  const usable = presets.filter((amount) => amount < remaining);
  return [...usable, remaining];
}

/** A sentence about what the next contribution covers, or null if nothing is outstanding. */
export function describeNext(item: NextItem | null, amount: number): string | null {
  if (!item || amount <= 0) return null;
  if (amount >= item.outstanding) return `Finishes ${lowerFirst(item.label)}.`;
  return `Goes towards ${lowerFirst(item.label)}.`;
}

function lowerFirst(text: string): string {
  // Only the first letter, and only when the word is not already a name.
  if (/^[A-Z][a-z]/.test(text)) return text[0].toLowerCase() + text.slice(1);
  return text;
}

/**
 * What happens after a campaign is met.
 *
 * A funded campaign should not sit at the top of the page forever — it is
 * finished, and leaving it there buries the ones that still need money. But it
 * should not vanish the instant the last pound lands either: people who gave
 * want to see it land, and the people running it want a moment to say thank
 * you. So it stays for three days and then goes.
 *
 * It leaves the page, not the record. Anything given to it is still in the
 * giving history afterwards.
 */
export const WIND_DOWN_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
export const WIND_DOWN_MS = WIND_DOWN_DAYS * DAY_MS;

export type WindDown = {
  /** When the goal was met. */
  metAt: number;
  /** When it leaves the page. */
  endsAt: number;
  msLeft: number;
  gone: boolean;
};

export type Contribution = { amount: number; at: number };

/**
 * The moment the goal was met, or null if it has not been.
 *
 * Contributions are replayed oldest first on top of whatever the campaign had
 * already raised, so the answer is the timestamp of the one that crossed the
 * line — not the latest one, and not now.
 */
export function metAt(goal: number, alreadyRaised: number, contributions: Contribution[], now = Date.now()): number | null {
  const safeGoal = Math.max(1, Math.round(goal));
  let total = Math.max(0, Math.round(alreadyRaised));
  // Already over the line before anybody here gave: it was met at some point
  // we were never told about, so the clock starts now rather than in the past.
  if (total >= safeGoal) return now;

  const inOrder = [...contributions].filter((c) => Number.isFinite(c.at) && Number.isFinite(c.amount)).sort((a, b) => a.at - b.at);
  for (const contribution of inOrder) {
    total += Math.max(0, Math.round(contribution.amount));
    if (total >= safeGoal) return contribution.at;
  }
  return null;
}

export function windDown(met: number | null, now = Date.now()): WindDown | null {
  if (met === null || !Number.isFinite(met)) return null;
  const endsAt = met + WIND_DOWN_MS;
  return { metAt: met, endsAt, msLeft: Math.max(0, endsAt - now), gone: now >= endsAt };
}

/** The countdown, in the words a person would use. Blunt on purpose. */
export function describeWindDown(state: WindDown | null): string {
  if (!state) return '';
  if (state.gone) return 'Closed';
  const hours = state.msLeft / (60 * 60 * 1000);
  if (hours < 1) return 'Leaving the page within the hour';
  if (hours < 24) return `Leaving the page in ${Math.round(hours)} hour${Math.round(hours) === 1 ? '' : 's'}`;
  const days = Math.ceil(hours / 24);
  return `Leaving the page in ${days} day${days === 1 ? '' : 's'}`;
}
