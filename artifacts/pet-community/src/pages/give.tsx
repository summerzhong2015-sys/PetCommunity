/**
 * Fundraising: shelters, the animal hospital's stray fund, individual animals
 * needing surgery, neighbours who cannot afford treatment, and research.
 *
 * The checkout here is a demonstration — no card is taken and no money moves.
 * Every screen says so plainly rather than implying otherwise.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock3,
  Heart,
  HeartHandshake,
  Info,
  Microscope,
  Receipt,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { PetPhoto } from '@/components/pet-photo';
import { CountUp, PageHeader, ProgressBar, Stat, useRevealWhen, useStored, type Notify } from '@/components/page-bits';
import { describeNext, fundingOf, nextItem, suggestedAmounts } from '@/lib/funding';
import {
  CAMPAIGNS,
  CAMPAIGN_LABEL,
  PRESET_AMOUNTS,
  money,
  pctOf,
  type Campaign,
  type CampaignKind,
} from '@/lib/giving-data';

type Donation = { campaignId: string; amount: number; at: number; recurring: boolean };

const KIND_ICON: Record<CampaignKind, typeof Heart> = {
  shelter: Building2,
  hospital: Stethoscope,
  pet: Heart,
  neighbour: HeartHandshake,
  research: Microscope,
};

const FILTERS: { value: CampaignKind | 'all'; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'shelter', label: 'Shelters' },
  { value: 'hospital', label: 'Animal hospital' },
  { value: 'pet', label: 'One animal' },
  { value: 'neighbour', label: 'A neighbour' },
  { value: 'research', label: 'Research' },
];

export function Give({ notify }: { notify: Notify }) {
  const [filter, setFilter] = useState<CampaignKind | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [donations, setDonations] = useStored<Donation[]>('pc-donations', []);

  const shown = useMemo(
    () => (filter === 'all' ? CAMPAIGNS : CAMPAIGNS.filter((c) => c.kind === filter)),
    [filter],
  );
  const open = CAMPAIGNS.find((c) => c.id === openId) ?? null;

  const given = donations.reduce((sum, d) => sum + d.amount, 0);
  const supported = new Set(donations.map((d) => d.campaignId)).size;

  /** What this browser has put into one campaign. */
  function yourShareOf(campaignId: string): number {
    return donations.filter((d) => d.campaignId === campaignId).reduce((s, d) => s + d.amount, 0);
  }

  /** Contributions made in this browser are added on top of the campaign's standing total. */
  function raisedFor(campaign: Campaign): number {
    return campaign.raised + yourShareOf(campaign.id);
  }

  /** You count as a neighbour once you have given, however many times. */
  function donorsFor(campaign: Campaign): number {
    return campaign.donors + (yourShareOf(campaign.id) > 0 ? 1 : 0);
  }

  function record(campaign: Campaign, amount: number, recurring: boolean) {
    setDonations([{ campaignId: campaign.id, amount, at: Date.now(), recurring }, ...donations]);
    notify({
      tone: 'success',
      text: `${money(amount)}${recurring ? ' a month' : ''} recorded for ${campaign.beneficiary}. This is a demonstration — no payment was taken.`,
    });
  }

  return (
    <main>
      <PageHeader
        eyebrow="Shelters · hospital · neighbours · research"
        title={
          <>
            Small amounts, close by,
            <br />
            <em className="text-primary not-italic">where you can see them land.</em>
          </>
        }
        description="Every campaign here is for an animal, a person or a building within a few streets of you — and every one shows exactly where the money goes."
      />

      <section className="page-wrap pb-12 space-y-5">
        {/* Demonstration notice — stated once, plainly, up front. */}
        <div className="paper-card p-5 flex items-start gap-3" data-testid="banner-demo">
          <Info size={18} className="text-primary shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            <strong>This checkout is a demonstration.</strong> No card details are collected and no money moves. Amounts
            you enter are kept in this browser so you can see how the flow behaves.
          </p>
        </div>

        {/* Your giving */}
        {donations.length > 0 && (
          <div className="paper-card p-5 md:p-6" data-testid="panel-your-giving">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
              <Stat
                label="You have given"
                value={<CountUp value={given} format={money} />}
                hint="Across this browser"
              />
              <Stat label="Campaigns" value={supported} hint="Supported so far" />
              <Stat
                label="Most recent"
                value={money(donations[0].amount)}
                hint={CAMPAIGNS.find((c) => c.id === donations[0].campaignId)?.beneficiary ?? ''}
              />
              <Stat
                label="Monthly"
                value={money(donations.filter((d) => d.recurring).reduce((s, d) => s + d.amount, 0))}
                hint="Recurring pledges"
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="paper-card p-5 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Show</span>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`tag ${filter === f.value ? 'bg-primary text-primary-foreground' : ''}`}
              data-testid={`button-filter-${f.value}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Campaigns */}
        <div className="grid md:grid-cols-2 gap-4">
          {shown.map((campaign, i) => {
            const Icon = KIND_ICON[campaign.kind];
            const raised = raisedFor(campaign);
            const yours = yourShareOf(campaign.id);
            const funding = fundingOf(campaign.goal, raised);
            const pct = funding.percent;
            return (
              <article
                key={campaign.id}
                className={`paper-card p-6 flex flex-col reveal reveal-delay-${Math.min(i + 1, 3)}`}
                data-testid={`card-campaign-${campaign.id}`}
              >
                <div className="flex items-start gap-4">
                  {campaign.portrait ? (
                    <PetPhoto
                      photo={campaign.photo}
                      portrait={campaign.portrait}
                      alt={`${campaign.title}`}
                      className="w-16 h-16 shrink-0 rounded-[1.3rem]"
                      width={200}
                    />
                  ) : (
                    <span className="grid place-items-center w-16 h-16 rounded-[1.1rem] bg-secondary text-primary shrink-0">
                      <Icon size={26} strokeWidth={1.6} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tag">{CAMPAIGN_LABEL[campaign.kind]}</span>
                      {campaign.urgent && (
                        <span className="tag" style={{ background: 'hsl(7 62% 48% / .12)', color: 'hsl(7 55% 38%)' }}>
                          Time-critical
                        </span>
                      )}
                    </div>
                    <h2 className="serif text-2xl mt-2 leading-tight">{campaign.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{campaign.beneficiary}</p>
                  </div>
                </div>

                <p className="text-sm mt-4 leading-relaxed">{campaign.blurb}</p>

                <div className="mt-5">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-sm">
                      <CountUp value={raised} format={money} className="serif text-xl font-bold" />
                      <span className="text-muted-foreground"> of {money(campaign.goal)}</span>
                    </p>
                    <CountUp
                      value={pct}
                      format={(n) => `${Math.round(n)}%`}
                      className="mono text-xs text-muted-foreground"
                    />
                  </div>
                  <ProgressBar pct={pct} />
                  <div className="flex items-center justify-between mt-2.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={12} />
                      <CountUp value={donorsFor(campaign)} format={(n) => `${Math.round(n)}`} /> neighbours
                    </span>
                    {campaign.daysLeft !== null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={12} /> {campaign.daysLeft} days left
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs mt-2.5" data-testid={`shortfall-${campaign.id}`}>
                  {funding.state === 'funded' ? (
                    <span className="text-primary font-bold">
                      Funded{funding.surplus > 0 ? ` — ${money(funding.surplus)} past the goal` : ''}.
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{money(funding.remaining)}</strong> still needed
                      {funding.state === 'nearly' ? ' — nearly there' : ''}
                    </span>
                  )}
                </p>

                {yours > 0 && (
                  <p className="text-xs mt-1.5 text-primary" data-testid={`your-share-${campaign.id}`}>
                    {money(yours)} of that is from you.
                  </p>
                )}

                {campaign.matchNote && (
                  <p className="text-xs mt-4 inline-flex items-start gap-1.5 text-primary">
                    <BadgeCheck size={13} className="shrink-0 mt-0.5" /> {campaign.matchNote}
                  </p>
                )}

                <button
                  onClick={() => setOpenId(campaign.id)}
                  className={`action-button mt-5 w-full ${funding.state === 'funded' ? 'button-quiet' : 'button-primary'}`}
                  data-testid={`button-open-campaign-${campaign.id}`}
                >
                  {funding.state === 'funded' ? (
                    <>
                      <BadgeCheck size={16} /> Fully funded
                    </>
                  ) : (
                    <>
                      <Heart size={16} /> Give to this
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>

        {open && (
          <CampaignDetail
            campaign={open}
            raised={raisedFor(open)}
            donors={donorsFor(open)}
            yours={yourShareOf(open.id)}
            onClose={() => setOpenId(null)}
            onGive={(amount, recurring) => record(open, amount, recurring)}
          />
        )}

        <div className="paper-card p-6">
          <p className="eyebrow">Money is not the only thing</p>
          <h2 className="serif text-2xl mt-1 mb-3">If you would rather give time</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Every shelter here says the same thing when asked what they need most, and it is rarely money: it is fosters,
            walkers, and someone to do the laundry. The shelters page lists what each one is short of this week.
          </p>
          <Link href="/shelters" className="action-button button-quiet mt-5" data-testid="link-shelters-from-give">
            See what they need <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

function CampaignDetail({
  campaign,
  raised,
  donors,
  yours,
  onClose,
  onGive,
}: {
  campaign: Campaign;
  raised: number;
  donors: number;
  yours: number;
  onClose: () => void;
  onGive: (amount: number, recurring: boolean) => void;
}) {
  const panel = useRevealWhen<HTMLDivElement>(campaign.id);
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [receipt, setReceipt] = useState<{ amount: number; recurring: boolean } | null>(null);

  const chosen = custom.trim() ? Math.max(1, Math.round(Number(custom) || 0)) : amount;
  const funding = fundingOf(campaign.goal, raised);
  const pct = funding.percent;
  const remaining = funding.remaining;
  const funded = funding.state === 'funded';
  // What the money in front of you actually pays for, read straight off the
  // campaign's own breakdown rather than estimated.
  const upNext = nextItem(campaign.breakdown, raised);
  const covers = describeNext(upNext, chosen);
  const offered = suggestedAmounts([...PRESET_AMOUNTS], remaining);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!chosen || chosen < 1) return;
    onGive(chosen, recurring);
    setReceipt({ amount: chosen, recurring });
  }

  return (
    <div ref={panel} className="paper-card p-6 reveal" data-testid={`panel-campaign-${campaign.id}`}>
      <div className="flex justify-between items-start gap-4">
        <div>
          <p className="eyebrow">{CAMPAIGN_LABEL[campaign.kind]} · {campaign.beneficiary}</p>
          <h2 className="serif text-3xl mt-1">{campaign.title}</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary" aria-label="Close campaign" data-testid={`button-close-campaign-${campaign.id}`}>
          <X size={18} />
        </button>
      </div>

      <p className="mt-5 leading-relaxed max-w-3xl">{campaign.story}</p>

      <div className="grid lg:grid-cols-2 gap-8 mt-7">
        <div className="space-y-6">
          <div>
            <p className="eyebrow">Where the money goes</p>
            <ul className="mt-3 space-y-2.5">
              {campaign.breakdown.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-4 text-sm">
                  <span>{row.label}</span>
                  <span className="mono text-xs text-muted-foreground shrink-0">{money(row.amount)}</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-4 text-sm pt-2.5 border-t border-border font-bold">
                <span>Total</span>
                <span className="mono text-xs shrink-0">{money(campaign.goal)}</span>
              </li>
            </ul>
          </div>

          {campaign.updates.length > 0 && (
            <div>
              <p className="eyebrow">Updates</p>
              <ul className="mt-3 space-y-3">
                {campaign.updates.map((u) => (
                  <li key={u.date}>
                    <p className="eyebrow">{u.date}</p>
                    <p className="text-sm mt-1 leading-relaxed">{u.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <div className="rounded-[1rem] border border-border p-5">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm">
                <CountUp value={raised} format={money} className="serif text-2xl font-bold" />
                <span className="text-muted-foreground"> of {money(campaign.goal)}</span>
              </p>
              <CountUp
                value={pct}
                format={(n) => `${Math.round(n)}%`}
                className="mono text-xs text-muted-foreground"
              />
            </div>
            <ProgressBar pct={pct} />
            <p className="text-xs text-muted-foreground mt-2.5">
              {remaining > 0 ? (
                <>
                  <CountUp value={remaining} format={money} /> still needed
                </>
              ) : funding.surplus > 0 ? (
                <>
                  Fully funded, with <CountUp value={funding.surplus} format={money} /> past the goal
                </>
              ) : (
                'Fully funded — thank you'
              )}{' '}
              · <CountUp value={donors} format={(n) => `${Math.round(n)}`} /> neighbours so far
            </p>
            {yours > 0 && (
              <p className="text-xs text-primary mt-1.5" data-testid={`panel-your-share-${campaign.id}`}>
                {money(yours)} of that came from you.
              </p>
            )}

            {receipt ? (
              <div className="mt-5 pt-5 border-t border-border" data-testid={`receipt-${campaign.id}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">
                      {money(receipt.amount)}{receipt.recurring ? ' a month' : ''} recorded
                    </p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      In a live version this is where your receipt and a note from {campaign.beneficiary} would arrive.
                      Nothing was charged — this checkout is a demonstration.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReceipt(null)}
                  className="action-button button-quiet w-full mt-4"
                  data-testid={`button-give-again-${campaign.id}`}
                >
                  <Receipt size={16} /> Give again
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 pt-5 border-t border-border" data-testid={`form-give-${campaign.id}`}>
                {funded ? (
                  <div className="rounded-[.9rem] bg-secondary/70 p-4 mb-4" data-testid={`panel-funded-${campaign.id}`}>
                    <p className="font-bold text-sm flex items-center gap-2">
                      <BadgeCheck size={16} className="text-primary shrink-0" /> This one is fully funded
                    </p>
                    <p className="text-sm mt-2 leading-relaxed">
                      Nothing more is needed for {campaign.beneficiary}. You can still give, and if you do it goes to{' '}
                      {campaign.overflow}.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2.5">
                      Said plainly because a met goal that keeps a donate button is usually the point at which people
                      stop being told where their money went.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm mb-4">
                    <strong>{money(remaining)}</strong> still needed.
                    {upNext && (
                      <span className="text-muted-foreground">
                        {' '}
                        The next {money(Math.min(upNext.outstanding, remaining))} covers {upNext.label.toLowerCase()}.
                      </span>
                    )}
                  </p>
                )}
                <p className="eyebrow">{funded ? 'Add to what comes next' : 'Choose an amount'}</p>
                <div className="grid grid-cols-4 gap-2 mt-2.5">
                  {offered.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAmount(value);
                        setCustom('');
                      }}
                      aria-pressed={!custom && amount === value}
                      className={`action-button text-sm px-2 ${!custom && amount === value ? 'button-primary' : 'button-quiet'}`}
                      data-testid={`button-amount-${value}`}
                    >
                      {money(value)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="field mt-2.5"
                  placeholder="Or another amount"
                  aria-label="Custom amount"
                  data-testid={`input-custom-${campaign.id}`}
                />
                <label className="flex items-center gap-2.5 mt-3.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                    className="w-4 h-4 accent-[hsl(var(--primary))]"
                    data-testid={`input-recurring-${campaign.id}`}
                  />
                  Make it monthly — small and steady is what they can plan around
                </label>
                {covers && !funded && (
                  <p className="text-xs text-primary mt-3" data-testid={`covers-${campaign.id}`}>
                    {covers}
                  </p>
                )}
                <button type="submit" className="action-button button-primary w-full mt-4" data-testid={`button-confirm-${campaign.id}`}>
                  <Heart size={16} /> {funded ? 'Give' : chosen >= remaining && remaining > 0 ? 'Finish this —' : 'Give'}{' '}
                  {money(chosen)}{recurring ? ' a month' : ''}
                </button>
                <p className="text-xs text-muted-foreground mt-3">
                  Demonstration only — no card is requested and no payment is taken.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
