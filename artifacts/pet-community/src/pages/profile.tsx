/**
 * The neighbour's own profile. A portrait they build rather than a photo they
 * have to find, a name, a few words about their animal, and a live preview of
 * exactly how that lands in the feed.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import {
  BellRing,
  Check,
  Dices,
  Info,
  MapPin,
  Pencil,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  COAT_PRESETS,
  EAR_OPTIONS,
  MARKING_OPTIONS,
  MOOD_OPTIONS,
} from '@/components/pet-portrait';
import { PageHeader, type Notify } from '@/components/page-bits';
import { review } from '@/lib/moderation';
import { PetPhoto } from '@/components/pet-photo';
import { PhotoPicker } from '@/components/photo-picker';
import {
  BIO_LIMIT,
  NEIGHBOURHOODS,
  defaultProfile,
  isProfileSet,
  type PetProfile,
  type PetType,
} from '@/lib/profile';

const SPECIES: { value: PetType; label: string; hint: string }[] = [
  { value: 'dog', label: 'Dog', hint: 'Park explorer' },
  { value: 'cat', label: 'Cat', hint: 'Window watcher' },
];

export function Profile({
  profile,
  setProfile,
  notify,
  signedInAs,
}: {
  profile: PetProfile;
  setProfile: (value: PetProfile) => void;
  notify: Notify;
  /** Only present when accounts are switched on and someone is signed in. */
  signedInAs?: string | null;
}) {
  const [form, setForm] = useState<PetProfile>(profile);
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm(profile), [profile]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(profile), [form, profile]);
  const bioLeft = BIO_LIMIT - form.bio.length;

  function update(patch: Partial<PetProfile>) {
    setForm((current) => ({ ...current, ...patch }));
    setSaved(false);
  }

  function setSpecies(petType: PetType) {
    update({
      petType,
      portrait: { ...form.portrait, species: petType, ears: petType === 'cat' ? 'perky' : form.portrait.ears },
    });
  }

  /** For anyone who would rather not fiddle with eight swatches. */
  function surprise() {
    const coat = COAT_PRESETS[Math.floor(Math.random() * COAT_PRESETS.length)];
    const marking = MARKING_OPTIONS[Math.floor(Math.random() * MARKING_OPTIONS.length)].value;
    const ears = EAR_OPTIONS[Math.floor(Math.random() * EAR_OPTIONS.length)].value;
    const mood = MOOD_OPTIONS[Math.floor(Math.random() * MOOD_OPTIONS.length)].value;
    update({
      portrait: { species: form.petType, coat: coat.coat, marking, ears: form.petType === 'cat' ? 'perky' : ears, mood },
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const username = form.username.trim();
    const petName = form.petName.trim();
    if (!username || !petName) {
      notify({ tone: 'error', text: 'A name for you and a name for your pet — the rest is optional.' });
      return;
    }
    // A profile is seen by more people than any message ever is.
    for (const [label, value] of [['name', username], ['pet name', petName], ['bio', form.bio]] as const) {
      const verdict = await review(value);
      if (verdict.level === 'block') {
        notify({ tone: 'error', text: `Your ${label}: ${verdict.reason}` });
        return;
      }
    }
    setProfile({ ...form, username, petName, bio: form.bio.trim() });
    setSaved(true);
    notify({ tone: 'success', text: `Saved. Neighbours will see you as ${username}.` });
  }

  return (
    <main>
      <PageHeader
        eyebrow="Your corner of it"
        title={
          <>
            A profile made for
            <br />
            <em className="text-primary not-italic">four-legged hellos.</em>
          </>
        }
        description="Build a likeness instead of hunting for a photo, add a few words, and see exactly how it lands before you save."
      />

      <section className="page-wrap pb-12">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_330px] gap-5 items-start">
          <form onSubmit={(e) => void save(e)} className="paper-card p-5 md:p-7" data-testid="form-profile">
            {/* Portrait builder */}
            <fieldset>
              <legend className="eyebrow mb-3">Profile picture</legend>
              <div className="grid sm:grid-cols-[150px_1fr] gap-6 items-start">
                <div className="text-center sm:text-left">
                  <PetPhoto
                    src={form.avatar}
                    portrait={form.portrait}
                    alt={form.petName}
                    className="w-36 h-36 mx-auto sm:mx-0 rounded-[2.4rem]"
                  />
                  {!form.avatar && (
                    <button
                      type="button"
                      onClick={surprise}
                      className="action-button button-quiet text-xs px-3 min-h-0 py-2 mt-3 w-full"
                      data-testid="button-randomise-portrait"
                    >
                      <Dices size={14} /> Surprise me
                    </button>
                  )}
                  <PhotoPicker
                    hasPhoto={Boolean(form.avatar)}
                    onPicked={(avatar) => update({ avatar })}
                    onCleared={() => update({ avatar: undefined })}
                    onError={(text) => notify({ tone: 'error', text })}
                  />
                </div>

                <div className="grid gap-4">
                  <div>
                    <p className="eyebrow mb-2">Dog or cat</p>
                    <div className="grid grid-cols-2 gap-3">
                      {SPECIES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setSpecies(s.value)}
                          className={`pet-choice ${form.petType === s.value ? 'selected' : ''}`}
                          aria-pressed={form.petType === s.value}
                          data-testid={`button-profile-${s.value}`}
                        >
                          <span>
                            <strong>{s.label}</strong>
                            <small>{s.hint}</small>
                          </span>
                          <span className="pet-choice-check">{form.petType === s.value ? <Check size={14} /> : null}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="eyebrow mb-2">Colour</p>
                    <div className="flex flex-wrap gap-2">
                      {COAT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => update({ portrait: { ...form.portrait, coat: preset.coat } })}
                          aria-label={preset.name}
                          aria-pressed={form.portrait.coat.base === preset.coat.base}
                          title={preset.name}
                          className={`w-9 h-9 rounded-full border-2 ${form.portrait.coat.base === preset.coat.base ? 'border-primary' : 'border-transparent'}`}
                          style={{ background: preset.coat.base }}
                          data-testid={`button-profile-coat-${preset.id}`}
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
                          onClick={() => update({ portrait: { ...form.portrait, marking: o.value } })}
                          aria-pressed={form.portrait.marking === o.value}
                          className={`tag ${form.portrait.marking === o.value ? 'bg-primary text-primary-foreground' : ''}`}
                          data-testid={`button-profile-marking-${o.value}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.petType === 'dog' && (
                    <div>
                      <p className="eyebrow mb-2">Ears</p>
                      <div className="flex flex-wrap gap-1.5">
                        {EAR_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => update({ portrait: { ...form.portrait, ears: o.value } })}
                            aria-pressed={form.portrait.ears === o.value}
                            className={`tag ${form.portrait.ears === o.value ? 'bg-primary text-primary-foreground' : ''}`}
                            data-testid={`button-profile-ears-${o.value}`}
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
                          onClick={() => update({ portrait: { ...form.portrait, mood: o.value } })}
                          aria-pressed={form.portrait.mood === o.value}
                          className={`tag ${form.portrait.mood === o.value ? 'bg-primary text-primary-foreground' : ''}`}
                          data-testid={`button-profile-mood-${o.value}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Names and details */}
            <fieldset className="mt-7 pt-6 border-t border-border">
              <legend className="eyebrow mb-3">Names</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-xs font-bold">
                  What neighbours call you <span className="text-destructive">*</span>
                  <input
                    className="field mt-1"
                    value={form.username}
                    onChange={(e) => update({ username: e.target.value })}
                    placeholder="MapleParkMaya"
                    maxLength={24}
                    data-testid="input-profile-username"
                  />
                  <span className="block text-[11px] text-muted-foreground font-normal mt-1">
                    A nickname is plenty. No last name needed.
                  </span>
                </label>
                <label className="block text-xs font-bold">
                  Your pet&rsquo;s name <span className="text-destructive">*</span>
                  <input
                    className="field mt-1"
                    value={form.petName}
                    onChange={(e) => update({ petName: e.target.value })}
                    placeholder="Juniper"
                    maxLength={24}
                    data-testid="input-profile-pet-name"
                  />
                </label>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mt-3">
                <label className="block text-xs font-bold">
                  Breed or type
                  <input
                    className="field mt-1"
                    value={form.breed}
                    onChange={(e) => update({ breed: e.target.value })}
                    placeholder="Retriever mix"
                    maxLength={40}
                    data-testid="input-profile-breed"
                  />
                </label>
                <label className="block text-xs font-bold">
                  Age
                  <input
                    className="field mt-1"
                    value={form.age}
                    onChange={(e) => update({ age: e.target.value })}
                    placeholder="3 years"
                    maxLength={20}
                    data-testid="input-profile-age"
                  />
                </label>
                <label className="block text-xs font-bold">
                  Roughly where you walk <span className="font-normal text-muted-foreground">(optional)</span>
                  <select
                    className="field mt-1"
                    value={form.neighbourhood}
                    onChange={(e) => update({ neighbourhood: e.target.value })}
                    data-testid="select-profile-neighbourhood"
                  >
                    {NEIGHBOURHOODS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

              <div className="sm:col-span-2 rounded-[.9rem] border border-border p-4 mt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.shareArea}
                    onChange={(e) => update({ shareArea: e.target.checked })}
                    className="w-4 h-4 mt-0.5 accent-[hsl(var(--primary))]"
                    data-testid="input-profile-share-area"
                  />
                  <span>
                    <span className="block text-sm font-bold">Let neighbours see you nearby</span>
                    <span className="block text-xs text-muted-foreground mt-1 leading-relaxed">
                      Adds you to the Nearby list for people whose landmark is within 2 km of yours. Only the
                      landmark is used &mdash; never an address, never your device&rsquo;s location &mdash; and the
                      distance shown is rounded to the nearest hundred metres. Leave this off and nobody sees you.
                    </span>
                  </span>
                </label>
              </div>
              </div>
            </fieldset>

            {/* Description */}
            <fieldset className="mt-6 pt-6 border-t border-border">
              <legend className="eyebrow mb-3">About {form.petName.trim() || 'them'}</legend>
              <textarea
                rows={4}
                className="field"
                value={form.bio}
                maxLength={BIO_LIMIT}
                onChange={(e) => update({ bio: e.target.value })}
                placeholder="What makes a hello easy — that she is nervous around bikes, that he will do anything for a tennis ball, that you are usually out around seven."
                data-testid="input-profile-bio"
              />
              <p className={`text-[11px] mt-1.5 ${bioLeft < 30 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {bioLeft} characters left
              </p>
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-7 pt-5 border-t border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" />
                Only what is on this page is shared.
              </p>
              <button
                type="submit"
                className={`action-button ${dirty || !saved ? 'button-primary' : 'button-quiet'}`}
                data-testid="button-save-profile"
              >
                {saved && !dirty ? (
                  <>
                    Saved <Check size={16} />
                  </>
                ) : (
                  <>
                    Save profile <Check size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Preview + what it feeds */}
          <div className="space-y-4 lg:sticky lg:top-5">
            <div className="paper-card p-5" data-testid="panel-profile-preview">
              <p className="eyebrow">What neighbours see</p>
              <div className="rounded-[.9rem] border border-border p-4 mt-3">
                <div className="flex gap-3">
                  <PetPhoto src={form.avatar} portrait={form.portrait} alt={form.petName} className="w-11 h-11 shrink-0 rounded-[.9rem]" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{form.username.trim() || 'Your username'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Just now · neighbours only</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed mt-3">
                  A sunny loop around {form.neighbourhood} and back.{' '}
                  {form.petName.trim() || 'Your pet'} says it was the highlight of the morning.
                </p>
                <span className="tag mt-3 inline-flex">{form.neighbourhood}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                This is the card that appears on every post you write and beside your name in messages.
              </p>
            </div>

            <div className="paper-card p-5">
              <div className="flex gap-3">
                <PetPhoto src={form.avatar} portrait={form.portrait} alt={form.petName} className="w-14 h-14 shrink-0 rounded-[1.1rem]" />
                <div className="min-w-0">
                  <p className="serif text-xl leading-tight">{form.petName.trim() || 'Your pet'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {[form.breed, form.age].filter(Boolean).join(' · ') || `${form.petType}`}
                  </p>
                </div>
              </div>
              {form.bio.trim() && <p className="text-sm leading-relaxed mt-4">{form.bio.trim()}</p>}
              <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-1.5">
                <MapPin size={12} /> Usually around {form.neighbourhood}
              </p>
            </div>

            {/* The profile is most useful on the worst day, so make that one click. */}
            <div className="paper-card p-5">
              <p className="eyebrow">If the worst happens</p>
              <h2 className="serif text-xl mt-1">One click to a search map</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                {isProfileSet(profile)
                  ? `A lost-pet report for ${profile.petName} starts already filled in — name, portrait, breed and the streets you walk — so the map is up in seconds rather than minutes.`
                  : 'Save your profile and a lost-pet report will start already filled in, so the search map is up in seconds rather than minutes.'}
              </p>
              <Link href="/lost-pets" className="action-button button-quiet w-full mt-4" data-testid="link-profile-lost">
                <BellRing size={16} /> See how that works
              </Link>
            </div>

            <div className="paper-card p-5">
              <p className="eyebrow">Account</p>
              <p className="font-bold text-sm mt-2 break-all">{signedInAs || 'No account needed'}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                {signedInAs
                  ? 'Your profile is attached to this account. Neighbours only ever see the name and portrait above.'
                  : 'This copy runs without accounts, so your profile is kept in this browser. Clearing site data clears it.'}
              </p>
              <div className="mt-4 pt-4 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
                <Info size={14} className="text-primary shrink-0 mt-0.5" />
                <span>
                  Change any of this whenever you like — the <Pencil size={11} className="inline align-[-1px]" /> profile
                  page is always here.
                </span>
              </div>
            </div>
          </div>
        </div>

        {!isProfileSet(profile) && (
          <p className="text-sm text-muted-foreground mt-6 inline-flex items-start gap-2">
            <Sparkles size={15} className="text-primary shrink-0 mt-0.5" />
            Nothing here is required beyond the two names. You can change it all later.
          </p>
        )}
      </section>
    </main>
  );
}
