/**
 * The lost-pet board: open alerts, a form for filing a new one, and a link from
 * every case into its live search map.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Info,
  MapPin,
  MessageCircle,
  Radar,
  ShieldCheck,
  X,
} from 'lucide-react';
import { EmptyState, PageHeader, useTicker, type Notify } from '@/components/page-bits';
import {
  COAT_PRESETS,
  DEFAULT_PORTRAIT,
  EAR_OPTIONS,
  MARKING_OPTIONS,
  MOOD_OPTIONS,
  PetPortrait,
  type PortraitSpec,
} from '@/components/pet-portrait';
import {
  LOST_CASES,
  loadUserCases,
  minutesMissing,
  saveUserCases,
  type LostCase,
} from '@/lib/lost-pet-data';
import { formatAge, type BuildSize, type Species, type Temperament } from '@/lib/lost-pet-model';
import { LANDMARKS } from '@/lib/neighborhood-map';
import { isProfileSet, type PetProfile } from '@/lib/profile';

const TEMPERAMENTS: { value: Temperament; label: string; hint: string }[] = [
  { value: 'friendly', label: 'Confident', hint: 'Goes up to strangers' },
  { value: 'shy', label: 'Cautious', hint: 'Keeps their distance' },
  { value: 'skittish', label: 'Panics', hint: 'Bolts if approached' },
];

export function LostPets({ notify, profile }: { notify: Notify; profile?: PetProfile }) {
  // A report filed about your own animal should not make you retype what the
  // profile already knows.
  const prefill = profile && isProfileSet(profile) ? profile : null;
  const tick = useTicker(30000);
  const [userCases, setUserCases] = useState<LostCase[]>(() => loadUserCases());
  const [reportOpen, setReportOpen] = useState(false);
  const homeLandmark = LANDMARKS.find((l) => l.name === prefill?.neighbourhood) ?? LANDMARKS[7];
  const [form, setForm] = useState({
    petName: prefill?.petName ?? '',
    breed: prefill?.breed ?? '',
    species: (prefill?.petType ?? 'dog') as Species,
    size: 'medium' as BuildSize,
    temperament: 'shy' as Temperament,
    lastSeenId: LANDMARKS[0].id,
    homeId: homeLandmark.id,
    markings: '',
    description: prefill?.bio ?? '',
    contact: '',
  });
  const [portrait, setPortrait] = useState<PortraitSpec>(prefill?.portrait ?? DEFAULT_PORTRAIT);

  const cases = useMemo(() => {
    const all = [...userCases, ...LOST_CASES];
    return all.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1;
      return minutesMissing(a) - minutesMissing(b);
    });
    // `tick` keeps the "missing for" labels current.
  }, [userCases, tick]);

  const activeCount = cases.filter((c) => c.status === 'Active').length;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.petName.trim() || !form.description.trim()) {
      notify({ tone: 'error', text: 'A name and a description are the two things neighbours really need.' });
      return;
    }
    const lastSeen = LANDMARKS.find((l) => l.id === form.lastSeenId) ?? LANDMARKS[0];
    const home = LANDMARKS.find((l) => l.id === form.homeId) ?? LANDMARKS[7];
    const created: LostCase = {
      id: `u${Date.now()}`,
      petName: form.petName.trim(),
      species: form.species,
      size: form.size,
      breed: form.breed.trim() || (form.species === 'dog' ? 'Dog' : 'Cat'),
      temperament: form.temperament,
      missingForMinutes: 0,
      reportedAt: Date.now(),
      lastSeen: lastSeen.at,
      lastSeenPlace: lastSeen.name,
      home: home.at,
      homePlace: home.name,
      description: form.description.trim(),
      markings: form.markings.trim() || 'No distinguishing marks given',
      microchipped: false,
      owner: prefill?.username ?? 'You',
      ownerInitials: (prefill?.username ?? 'You').slice(0, 2).toUpperCase(),
      contact: form.contact.trim() || 'Message through PetCommunity',
      status: 'Active',
      sightings: [],
      weather: 'clear',
      portrait: { ...portrait, species: form.species },
    };
    const next = [created, ...userCases];
    setUserCases(next);
    saveUserCases(next);
    setReportOpen(false);
    setForm({ ...form, petName: '', breed: '', markings: '', description: '', contact: '' });
    notify({ tone: 'success', text: `Alert posted. ${created.petName}'s search map is ready — open it and start with zone one.` });
  }

  return (
    <main>
      <PageHeader
        eyebrow="Fast, local, private"
        title={
          <>
            Bring them
            <br />
            <em className="text-destructive not-italic">home.</em>
          </>
        }
        description="Every alert comes with a search map that works out where they most likely are, and updates as neighbours report sightings."
        action={
          <button
            className="action-button button-danger"
            onClick={() => setReportOpen((v) => !v)}
            data-testid="button-report-lost-pet"
          >
            <BellRing size={17} /> Report a missing pet
          </button>
        }
      />

      <section className="page-wrap pb-10">
        <div className="alert-banner rounded-2xl p-4 flex gap-3 mb-6">
          <ShieldCheck size={18} className="shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            <strong>How this works:</strong> alerts and sightings are kept in this browser, and the search map is
            computed on your device from the animal&rsquo;s behaviour and the local terrain. No notification service is
            connected and no personal identity is required.
          </p>
        </div>

        {reportOpen && (
          <form onSubmit={submit} className="paper-card p-5 md:p-6 mb-6 reveal" data-testid="form-lost-pet">
            <div className="flex justify-between items-start">
              <div>
                <p className="eyebrow text-destructive">New alert</p>
                <h2 className="serif text-2xl mt-1">Tell the circle what to look for.</h2>
                {prefill && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Filled in from your profile — change anything that is wrong.
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setReportOpen(false)} aria-label="Close form" data-testid="button-close-lost-form">
                <X size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <label className="text-xs font-bold">
                Name <span className="text-destructive">*</span>
                <input
                  className="field mt-1"
                  value={form.petName}
                  onChange={(e) => setForm({ ...form, petName: e.target.value })}
                  placeholder="Pip"
                  data-testid="input-lost-pet-name"
                />
              </label>
              <label className="text-xs font-bold">
                Breed or type
                <input
                  className="field mt-1"
                  value={form.breed}
                  onChange={(e) => setForm({ ...form, breed: e.target.value })}
                  placeholder="Small terrier mix"
                  data-testid="input-lost-pet-breed"
                />
              </label>
            </div>

            <fieldset className="mt-4">
              <legend className="eyebrow mb-2">Dog or cat</legend>
              <div className="flex gap-1.5">
                {(['dog', 'cat'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, species: s });
                      setPortrait((current) => ({
                        ...current,
                        species: s,
                        ears: s === 'cat' ? 'perky' : current.ears,
                      }));
                    }}
                    aria-pressed={form.species === s}
                    className={`tag ${form.species === s ? 'bg-primary text-primary-foreground' : ''}`}
                    data-testid={`button-species-${s}`}
                  >
                    {s === 'dog' ? 'Dog' : 'Cat'}
                  </button>
                ))}
              </div>
            </fieldset>

            {form.species === 'dog' && (
              <fieldset className="mt-4">
                <legend className="eyebrow mb-2">Size</legend>
                <div className="flex gap-1.5">
                  {(['small', 'medium', 'large'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, size: s })}
                      aria-pressed={form.size === s}
                      className={`tag ${form.size === s ? 'bg-primary text-primary-foreground' : ''}`}
                      data-testid={`button-size-${s}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="mt-4">
              <legend className="eyebrow mb-2">
                How do they react to strangers? This changes the search area more than anything else.
              </legend>
              <div className="grid sm:grid-cols-3 gap-2">
                {TEMPERAMENTS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, temperament: t.value })}
                    className={`pet-choice ${form.temperament === t.value ? 'selected' : ''}`}
                    aria-pressed={form.temperament === t.value}
                    data-testid={`button-temperament-${t.value}`}
                  >
                    <span>
                      <strong>{t.label}</strong>
                      <small>{t.hint}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <label className="text-xs font-bold">
                Last seen near
                <select
                  className="field mt-1"
                  value={form.lastSeenId}
                  onChange={(e) => setForm({ ...form, lastSeenId: e.target.value })}
                  data-testid="select-last-seen"
                >
                  {LANDMARKS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Home is near
                <select
                  className="field mt-1"
                  value={form.homeId}
                  onChange={(e) => setForm({ ...form, homeId: e.target.value })}
                  data-testid="select-home"
                >
                  {LANDMARKS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="mt-5 pt-5 border-t border-border">
              <legend className="eyebrow mb-3">
                Draw a likeness. A picture is what people actually recognise in the street.
              </legend>
              <div className="grid sm:grid-cols-[128px_1fr] gap-5 items-start">
                <PetPortrait spec={{ ...portrait, species: form.species }} className="w-32 h-32 mx-auto sm:mx-0" />
                <div className="grid gap-4">
                  <div>
                    <p className="eyebrow mb-2">Colour</p>
                    <div className="flex flex-wrap gap-2">
                      {COAT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setPortrait({ ...portrait, coat: preset.coat })}
                          aria-label={preset.name}
                          aria-pressed={portrait.coat.base === preset.coat.base}
                          title={preset.name}
                          className={`w-9 h-9 rounded-full border-2 ${portrait.coat.base === preset.coat.base ? 'border-primary' : 'border-transparent'}`}
                          style={{ background: preset.coat.base }}
                          data-testid={`button-coat-${preset.id}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="eyebrow mb-2">Markings</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MARKING_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setPortrait({ ...portrait, marking: o.value })}
                          aria-pressed={portrait.marking === o.value}
                          className={`tag ${portrait.marking === o.value ? 'bg-primary text-primary-foreground' : ''}`}
                          data-testid={`button-marking-${o.value}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.species === 'dog' && (
                    <div>
                      <p className="eyebrow mb-2">Ears</p>
                      <div className="flex flex-wrap gap-1.5">
                        {EAR_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setPortrait({ ...portrait, ears: o.value })}
                            aria-pressed={portrait.ears === o.value}
                            className={`tag ${portrait.ears === o.value ? 'bg-primary text-primary-foreground' : ''}`}
                            data-testid={`button-ears-${o.value}`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="eyebrow mb-2">Expression</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MOOD_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setPortrait({ ...portrait, mood: o.value })}
                          aria-pressed={portrait.mood === o.value}
                          className={`tag ${portrait.mood === o.value ? 'bg-primary text-primary-foreground' : ''}`}
                          data-testid={`button-mood-${o.value}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            <label className="block text-xs font-bold mt-4">
              Markings
              <input
                className="field mt-1"
                value={form.markings}
                onChange={(e) => setForm({ ...form, markings: e.target.value })}
                placeholder="White and tan, red harness, one folded ear"
                data-testid="input-lost-pet-markings"
              />
            </label>

            <label className="block text-xs font-bold mt-3">
              What should neighbours know? <span className="text-destructive">*</span>
              <textarea
                className="field mt-1 min-h-20"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="How they went missing, and what people should and should not do if they see them."
                data-testid="input-lost-pet-description"
              />
            </label>

            <label className="block text-xs font-bold mt-3">
              Safe way to reach you <span className="text-muted-foreground font-normal">(optional)</span>
              <input
                className="field mt-1"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="A PetCommunity message is fine"
                data-testid="input-lost-pet-contact"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
              <p className="text-xs text-muted-foreground flex gap-1.5">
                <Info size={14} className="shrink-0" />
                Only your neighbourhood label is shown.
              </p>
              <button className="action-button button-danger" type="submit" data-testid="button-submit-lost-pet">
                Post alert and build the map <BellRing size={15} />
              </button>
            </div>
          </form>
        )}

        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="eyebrow">Open now</p>
            <h2 className="serif text-3xl mt-1">Alerts nearby</h2>
          </div>
          <span className="tag bg-destructive/10 text-destructive">{activeCount} active</span>
        </div>

        {cases.length === 0 ? (
          <EmptyState
            title="No active alerts"
            copy="That is good news. This space will stay ready if a neighbour needs a quick hand."
            icon={ShieldCheck}
          />
        ) : (
          <div className="space-y-4">
            {cases.map((item, i) => (
              <article
                key={item.id}
                className={`paper-card p-5 md:p-6 border-l-4 ${item.status === 'Active' ? 'border-l-destructive' : 'border-l-primary'} reveal reveal-delay-${Math.min(i + 1, 3)}`}
                data-testid={`card-lost-alert-${item.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <span className="relative shrink-0">
                      <PetPortrait spec={item.portrait} className="w-14 h-14" rounded={22} />
                      <span
                        className={`absolute -bottom-1 -right-1 grid place-items-center w-6 h-6 rounded-full border-2 border-card ${item.status === 'Active' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}
                      >
                        {item.status === 'Active' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                      </span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="serif text-2xl">{item.petName}</h3>
                        <span className="tag">{item.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.breed} <span className="mx-1">·</span> missing {formatAge(minutesMissing(item)).replace(' ago', '')}
                      </p>
                    </div>
                  </div>
                  <span className="tag flex gap-1">
                    <MapPin size={12} /> close by
                  </span>
                </div>

                <p className="font-bold text-sm mt-5">Last seen at {item.lastSeenPlace}</p>
                <p className="text-sm leading-relaxed mt-1">{item.description}</p>

                <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border">
                  <Link
                    href={`/lost-pets/${item.id}`}
                    className={`action-button ${item.status === 'Active' ? 'button-primary' : 'button-quiet'}`}
                    data-testid={`link-search-map-${item.id}`}
                  >
                    <Radar size={16} /> {item.status === 'Active' ? 'Open the search map' : 'See how the search ran'}
                  </Link>
                  {item.sightings.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {item.sightings.length} sighting{item.sightings.length === 1 ? '' : 's'} reported
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                    <MessageCircle size={13} />
                    {item.contact}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
