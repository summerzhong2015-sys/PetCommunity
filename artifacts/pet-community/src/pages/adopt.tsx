/**
 * Adoptable animals from the local shelters and rescues: browse, filter, read
 * an honest write-up, and send an enquiry to the people who have them in care.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  Baby,
  Cat,
  CheckCircle2,
  Clock3,
  Dog,
  Heart,
  HeartHandshake,
  Home,
  Info,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { PetPortrait } from '@/components/pet-portrait';
import { EmptyState, PageHeader, useStored, type Notify } from '@/components/page-bits';
import { ADOPTABLE_PETS, SHELTERS, shelterOf, type AdoptablePet } from '@/lib/adoption-data';

type SpeciesFilter = 'all' | 'dog' | 'cat';
type AgeFilter = 'all' | 'young' | 'adult' | 'senior';

const STATUS_COPY: Record<AdoptablePet['status'], { label: string; tone: string }> = {
  available: { label: 'Looking for a home', tone: 'bg-secondary text-secondary-foreground' },
  pending: { label: 'Application in progress', tone: 'bg-muted text-muted-foreground' },
  'foster-needed': { label: 'Foster needed now', tone: 'bg-accent text-accent-foreground' },
};

export function Adopt({ notify }: { notify: Notify }) {
  const [species, setSpecies] = useState<SpeciesFilter>('all');
  const [age, setAge] = useState<AgeFilter>('all');
  const [withKids, setWithKids] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saved, setSaved] = useStored<string[]>('pc-saved-pets', []);
  const [enquired, setEnquired] = useStored<string[]>('pc-enquiries', []);

  const pets = useMemo(
    () =>
      ADOPTABLE_PETS.filter((p) => {
        if (species !== 'all' && p.species !== species) return false;
        if (age !== 'all' && p.ageBand !== age) return false;
        if (withKids && !p.goodWith.children) return false;
        return true;
      }),
    [species, age, withKids],
  );

  const open = ADOPTABLE_PETS.find((p) => p.id === openId) ?? null;
  const longestWaiting = [...ADOPTABLE_PETS]
    .filter((p) => p.status !== 'pending')
    .sort((a, b) => waitWeeks(b) - waitWeeks(a))[0];

  function toggleSave(pet: AdoptablePet) {
    const has = saved.includes(pet.id);
    setSaved(has ? saved.filter((id) => id !== pet.id) : [...saved, pet.id]);
    notify({
      tone: 'success',
      text: has ? `${pet.name} removed from your shortlist.` : `${pet.name} saved to your shortlist.`,
    });
  }

  function sendEnquiry(event: FormEvent, pet: AdoptablePet) {
    event.preventDefault();
    setEnquired([...new Set([...enquired, pet.id])]);
    notify({
      tone: 'success',
      text: `Your note about ${pet.name} has gone to ${shelterOf(pet).name}. They usually reply within two days.`,
    });
  }

  return (
    <main>
      <PageHeader
        eyebrow="Adopt · foster · visit"
        title={
          <>
            Every one of them is
            <br />
            <em className="text-primary not-italic">somebody&rsquo;s dog already.</em>
          </>
        }
        description="Animals in care with the shelters and rescues around here. The write-ups are honest — including the difficult bits — because the wrong match helps nobody."
        action={
          <Link href="/shelters" className="action-button button-quiet" data-testid="link-shelters">
            <Home size={16} /> Visit the shelters
          </Link>
        }
      />

      <section className="page-wrap pb-12 space-y-5">
        {/* The one who has waited longest */}
        {longestWaiting && (
          <article className="paper-card overflow-hidden reveal" data-testid="card-longest-waiting">
            <div className="grid md:grid-cols-[220px_1fr] gap-0">
              <div className="p-6 pb-0 md:pb-6 md:pr-0 grid place-items-center">
                <PetPortrait spec={longestWaiting.portrait} className="w-40 h-40 md:w-48 md:h-48" />
              </div>
              <div className="p-6">
                <p className="eyebrow">Longest in care</p>
                <h2 className="serif text-3xl mt-1">{longestWaiting.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {longestWaiting.breed} · {longestWaiting.ageLabel} · {longestWaiting.inCareSince}
                </p>
                <p className="mt-4 leading-relaxed">{longestWaiting.headline}</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{longestWaiting.story}</p>
                <button
                  onClick={() => setOpenId(longestWaiting.id)}
                  className="action-button button-primary mt-5"
                  data-testid="button-open-longest"
                >
                  Meet {longestWaiting.name} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </article>
        )}

        {/* Filters */}
        <div className="paper-card p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <FilterGroup
            label="Species"
            options={[
              { value: 'all', label: 'All' },
              { value: 'dog', label: 'Dogs' },
              { value: 'cat', label: 'Cats' },
            ]}
            value={species}
            onChange={(v) => setSpecies(v as SpeciesFilter)}
            testPrefix="species"
          />
          <FilterGroup
            label="Age"
            options={[
              { value: 'all', label: 'Any' },
              { value: 'young', label: 'Under 1' },
              { value: 'adult', label: 'Adult' },
              { value: 'senior', label: 'Senior' },
            ]}
            value={age}
            onChange={(v) => setAge(v as AgeFilter)}
            testPrefix="age"
          />
          <button
            onClick={() => setWithKids((v) => !v)}
            aria-pressed={withKids}
            className={`tag inline-flex gap-1.5 ${withKids ? 'bg-primary text-primary-foreground' : ''}`}
            data-testid="button-filter-kids"
          >
            <Baby size={12} /> Good with children
          </button>
          <span className="text-xs text-muted-foreground ml-auto">
            {pets.length} of {ADOPTABLE_PETS.length}
          </span>
        </div>

        {/* Grid */}
        {pets.length === 0 ? (
          <EmptyState
            title="Nothing matches that just now"
            copy="Try widening the filters. New animals come in most weeks, and the shelters always have more in the back than on the list."
            icon={Heart}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet, i) => {
              const shelter = shelterOf(pet);
              const status = STATUS_COPY[pet.status];
              return (
                <article
                  key={pet.id}
                  className={`paper-card overflow-hidden flex flex-col reveal reveal-delay-${Math.min(i + 1, 3)}`}
                  data-testid={`card-pet-${pet.id}`}
                >
                  <div className="relative" style={{ background: pet.portrait.coat.bg }}>
                    <PetPortrait spec={pet.portrait} className="w-full h-auto" rounded={0} />
                    <span className={`tag absolute top-3 left-3 ${status.tone}`}>{status.label}</span>
                    <button
                      onClick={() => toggleSave(pet)}
                      aria-label={`${saved.includes(pet.id) ? 'Remove' : 'Save'} ${pet.name}`}
                      aria-pressed={saved.includes(pet.id)}
                      className={`absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full ${saved.includes(pet.id) ? 'bg-destructive text-destructive-foreground' : 'bg-card/85'}`}
                      data-testid={`button-save-${pet.id}`}
                    >
                      <Heart size={16} fill={saved.includes(pet.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-baseline gap-2">
                      <h2 className="serif text-2xl">{pet.name}</h2>
                      {pet.species === 'dog' ? (
                        <Dog size={15} className="text-muted-foreground" />
                      ) : (
                        <Cat size={15} className="text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pet.breed} · {pet.ageLabel} · {pet.sex}
                    </p>
                    <p className="text-sm mt-3 leading-relaxed">{pet.headline}</p>
                    <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-1.5">
                      <MapPin size={12} /> {shelter.name}
                    </p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <Clock3 size={12} /> {pet.inCareSince}
                      </span>
                      <button
                        onClick={() => setOpenId(pet.id)}
                        className="text-xs font-bold text-primary inline-flex items-center gap-1"
                        data-testid={`button-open-${pet.id}`}
                      >
                        Meet {pet.name} <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Detail */}
        {open && (
          <PetDetail
            pet={open}
            onClose={() => setOpenId(null)}
            onSave={() => toggleSave(open)}
            isSaved={saved.includes(open.id)}
            hasEnquired={enquired.includes(open.id)}
            onEnquire={(e) => sendEnquiry(e, open)}
          />
        )}

        {/* Other ways to help */}
        <div className="paper-card p-6">
          <p className="eyebrow">Not ready to adopt</p>
          <h2 className="serif text-2xl mt-1 mb-5">Four things that help nearly as much</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Home, title: 'Foster for two weeks', copy: 'A dog in a house shows what it is actually like. Fosters cost you nothing — the shelter covers food and vet care.' },
              { icon: HeartHandshake, title: 'Walk on a Saturday', copy: 'Maple Ridge runs a walking rota. An hour is an hour a dog is not in a kennel.' },
              { icon: Sparkles, title: 'Do the laundry', copy: 'Every shelter says the same thing: the unglamorous jobs are the ones nobody volunteers for and the ones they need most.' },
              { icon: ShieldCheck, title: 'Share a listing', copy: 'The animals that wait longest are the old ones and the pairs. One share puts them in front of someone who was not looking.' },
            ].map((item) => (
              <div key={item.title}>
                <item.icon size={20} className="text-primary" />
                <h3 className="font-bold text-sm mt-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>
          <Link href="/give" className="action-button button-accent mt-6" data-testid="link-give-from-adopt">
            <Heart size={16} /> Or help fund their care
          </Link>
        </div>
      </section>
    </main>
  );
}

function PetDetail({
  pet,
  onClose,
  onSave,
  isSaved,
  hasEnquired,
  onEnquire,
}: {
  pet: AdoptablePet;
  onClose: () => void;
  onSave: () => void;
  isSaved: boolean;
  hasEnquired: boolean;
  onEnquire: (event: FormEvent) => void;
}) {
  const shelter = shelterOf(pet);
  return (
    <div className="paper-card p-6 reveal" data-testid={`panel-pet-${pet.id}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <PetPortrait spec={pet.portrait} className="w-20 h-20 shrink-0" />
          <div>
            <p className="eyebrow">{pet.breed} · {pet.ageLabel} · {pet.sex}</p>
            <h2 className="serif text-3xl mt-1">{pet.name}</h2>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary" aria-label={`Close ${pet.name}`} data-testid={`button-close-${pet.id}`}>
          <X size={18} />
        </button>
      </div>

      <p className="mt-5 leading-relaxed">{pet.story}</p>

      <div className="grid md:grid-cols-3 gap-5 mt-6">
        <div>
          <p className="eyebrow">What she is like</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {pet.personality.map((trait) => (
              <span key={trait} className="tag">{trait}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">Lives well with</p>
          <ul className="text-sm mt-2 space-y-1">
            {[
              { ok: pet.goodWith.children, label: 'Children' },
              { ok: pet.goodWith.dogs, label: 'Other dogs' },
              { ok: pet.goodWith.cats, label: 'Cats' },
            ].map((row) => (
              <li key={row.label} className="inline-flex items-center gap-1.5 mr-3">
                {row.ok ? <CheckCircle2 size={13} className="text-primary" /> : <X size={13} className="text-muted-foreground" />}
                <span className={row.ok ? '' : 'text-muted-foreground'}>{row.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Ongoing needs</p>
          <p className="text-sm mt-2 leading-relaxed">{pet.needs}</p>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-border grid md:grid-cols-[1fr_auto] gap-5 items-start">
        <div>
          <p className="eyebrow">In care with</p>
          <p className="font-bold text-sm mt-1">{shelter.name}</p>
          <p className="text-sm text-muted-foreground mt-1">{shelter.address}</p>
          <p className="text-sm text-muted-foreground">{shelter.hours} · {shelter.phone}</p>
          <p className="text-sm mt-3 leading-relaxed">
            <Info size={13} className="inline align-[-2px] mr-1.5 text-primary" />
            {shelter.visiting}
          </p>
        </div>
        <div className="text-right">
          <p className="eyebrow">Adoption fee</p>
          <p className="serif text-3xl mt-1">{pet.fee === 0 ? 'Waived' : `$${pet.fee}`}</p>
          {pet.fee === 0 && <p className="text-xs text-muted-foreground mt-1">Sponsored by the shelter</p>}
        </div>
      </div>

      {hasEnquired ? (
        <div className="mt-6 pt-5 border-t border-border flex items-start gap-3" data-testid={`enquiry-sent-${pet.id}`}>
          <CheckCircle2 size={18} className="text-primary shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            Your enquiry about {pet.name} is with {shelter.name}. They will usually come back within two days, and will
            ask about your home, your hours and anyone else living there — not to catch you out, but because a match
            that lasts is the whole point.
          </p>
        </div>
      ) : (
        <form onSubmit={onEnquire} className="mt-6 pt-5 border-t border-border" data-testid={`form-enquiry-${pet.id}`}>
          <p className="eyebrow">Ask about {pet.name}</p>
          <textarea
            rows={3}
            className="field mt-2"
            placeholder={`Tell them a little about your home. Who lives there, what your days look like, whether you have had a ${pet.species} before.`}
            data-testid={`input-enquiry-${pet.id}`}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="submit" className="action-button button-primary" data-testid={`button-enquire-${pet.id}`}>
              <Send size={16} /> Send to {shelter.name.split(' ')[0]}
            </button>
            <button type="button" onClick={onSave} className="action-button button-quiet" data-testid={`button-shortlist-${pet.id}`}>
              <Heart size={16} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'On your shortlist' : 'Save for later'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
  testPrefix,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  testPrefix: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="eyebrow">{label}</span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`tag ${value === o.value ? 'bg-primary text-primary-foreground' : ''}`}
            data-testid={`button-${testPrefix}-${o.value}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function waitWeeks(pet: AdoptablePet): number {
  const match = pet.inCareSince.match(/(\d+)\s*(week|month|year)/i);
  if (!match) return 0;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  return unit === 'week' ? n : unit === 'month' ? n * 4.35 : n * 52;
}

/** The shelters page: who they are, when to visit, and what they need. */
export function Shelters({ notify }: { notify: Notify }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <main>
      <PageHeader
        eyebrow="Four places, ten minutes away"
        title={
          <>
            You can just
            <br />
            <em className="text-primary not-italic">go and see them.</em>
          </>
        }
        description="Opening hours, what to expect when you walk in, and the things they actually need this week. You do not have to be adopting to visit."
        action={
          <Link href="/adopt" className="action-button button-quiet" data-testid="link-adopt-from-shelters">
            <Heart size={16} /> See who needs a home
          </Link>
        }
      />

      <section className="page-wrap pb-12 grid lg:grid-cols-2 gap-4">
        {SHELTERS.map((shelter, i) => {
          const open = openId === shelter.id;
          const residents = ADOPTABLE_PETS.filter((p) => p.shelterId === shelter.id);
          return (
            <article
              key={shelter.id}
              className={`paper-card p-6 reveal reveal-delay-${Math.min(i + 1, 3)}`}
              data-testid={`card-shelter-${shelter.id}`}
            >
              <p className="eyebrow">{shelter.area} · {shelter.kind} · since {shelter.foundedYear}</p>
              <h2 className="serif text-2xl mt-1">{shelter.name}</h2>
              <p className="text-sm mt-3 leading-relaxed">{shelter.about}</p>

              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex gap-3">
                  <dt className="eyebrow w-20 shrink-0 pt-0.5">Where</dt>
                  <dd>{shelter.address}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="eyebrow w-20 shrink-0 pt-0.5">Open</dt>
                  <dd>{shelter.hours}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="eyebrow w-20 shrink-0 pt-0.5">Phone</dt>
                  <dd>{shelter.phone}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="eyebrow w-20 shrink-0 pt-0.5">Visiting</dt>
                  <dd>{shelter.visiting}</dd>
                </div>
              </dl>

              {open && (
                <div className="mt-5 pt-5 border-t border-border grid sm:grid-cols-2 gap-5">
                  <div>
                    <p className="eyebrow">Needed this week</p>
                    <ul className="text-sm mt-2 space-y-1.5">
                      {shelter.needs.map((need) => (
                        <li key={need} className="text-muted-foreground">· {need}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow">Hands, not money</p>
                    <ul className="text-sm mt-2 space-y-1.5">
                      {shelter.volunteering.map((v) => (
                        <li key={v} className="text-muted-foreground">· {v}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  <strong className="text-primary">{shelter.animalsInCare}</strong> in care
                  {residents.length > 0 && ` · ${residents.length} listed here`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpenId(open ? null : shelter.id)}
                    className="text-xs font-bold text-primary"
                    data-testid={`button-shelter-more-${shelter.id}`}
                  >
                    {open ? 'Show less' : 'What they need'}
                  </button>
                  <button
                    onClick={() =>
                      notify({ tone: 'info', text: `${shelter.name} added to your visit list — ${shelter.hours}.` })
                    }
                    className="text-xs font-bold text-primary"
                    data-testid={`button-shelter-visit-${shelter.id}`}
                  >
                    Plan a visit
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
