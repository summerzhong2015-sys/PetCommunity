/**
 * The search page for a single lost pet: the model's live probability map, the
 * zones it ranks, why it ranks them that way, and the form neighbours use to
 * report a sighting — which immediately redraws the map.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Ban,
  BellRing,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CloudRain,
  Crosshair,
  Eye,
  Flame,
  Home,
  Layers,
  MapPin,
  Radar,
  ScanText,
  Sparkles,
  Sun,
  Target,
  Thermometer,
} from 'lucide-react';
import { SearchMap, SearchMapLegend } from '@/components/search-map';
import { PageHeader, Stat, useStored, useTicker, type Notify } from '@/components/page-bits';
import { findCase, minutesMissing, timeOfDayNow } from '@/lib/lost-pet-data';
import { formatAge, predict, type Sighting, type Weather } from '@/lib/lost-pet-model';
import { readReport } from '@/lib/report-reader';
import { PetPortrait } from '@/components/pet-portrait';
import { nearestLandmark, type Vec } from '@/lib/neighborhood-map';

type StoredSighting = {
  id: string;
  at: Vec;
  reportedAt: number;
  confidence: Sighting['confidence'];
  note: string;
  reporter: string;
};

const LOOKAHEADS: { label: string; minutes: number }[] = [
  { label: 'Now', minutes: 0 },
  { label: '+1 hr', minutes: 60 },
  { label: '+3 hr', minutes: 180 },
  { label: '+6 hr', minutes: 360 },
];

const WEATHERS: { value: Weather; label: string; icon: typeof Sun }[] = [
  { value: 'clear', label: 'Clear', icon: Sun },
  { value: 'rain', label: 'Rain', icon: CloudRain },
  { value: 'cold', label: 'Cold', icon: Thermometer },
  { value: 'hot', label: 'Hot', icon: Flame },
];

export function LostPetSearch({ caseId, notify }: { caseId: string; notify: Notify }) {
  // Memoised: findCase reads localStorage, and an unstable `item` would make the
  // prediction recompute on every render rather than only when inputs change.
  const item = useMemo(() => findCase(caseId), [caseId]);
  const tick = useTicker(15000);

  const [extra, setExtra] = useStored<StoredSighting[]>(`pc-sightings-${caseId}`, []);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showHeat, setShowHeat] = useState(true);
  const [showRings, setShowRings] = useState(true);
  const [lookahead, setLookahead] = useState(0);
  const [weather, setWeather] = useState<Weather>(item?.weather ?? 'clear');
  const [placing, setPlacing] = useState(false);
  const [pin, setPin] = useState<Vec | null>(null);
  const [note, setNote] = useState('');
  const [confidence, setConfidence] = useState<Sighting['confidence']>('likely');

  const sightings: Sighting[] = useMemo(() => {
    if (!item) return [];
    const now = Date.now();
    const seeded = item.sightings.map((s) => ({ ...s, minutesAgo: s.minutesAgo + lookahead }));
    const added = extra.map((s) => ({
      id: s.id,
      at: s.at,
      minutesAgo: (now - s.reportedAt) / 60000 + lookahead,
      confidence: s.confidence,
      note: s.note,
      reporter: s.reporter,
    }));
    return [...added, ...seeded].sort((a, b) => a.minutesAgo - b.minutesAgo);
    // `tick` is intentionally a dependency: it is what keeps the ages current.
  }, [item, extra, lookahead, tick]);

  // Everything anyone has typed about this animal, read for behaviour, terrain,
  // direction and named places.
  const cues = useMemo(() => {
    if (!item) return null;
    return readReport(item.description, item.markings, ...sightings.map((s) => s.note));
  }, [item, sightings]);

  const prediction = useMemo(() => {
    if (!item || !cues) return null;
    return predict({
      name: item.petName,
      species: item.species,
      size: item.size,
      temperament: item.temperament,
      lastSeen: item.lastSeen,
      minutesSinceLastSeen: minutesMissing(item) + lookahead,
      home: item.home,
      sightings,
      weather,
      timeOfDay: timeOfDayNow(new Date(Date.now() + lookahead * 60000)),
      cues,
    });
  }, [item, cues, sightings, weather, lookahead, tick]);

  if (!item || !prediction || !cues) {
    return (
      <main className="page-wrap py-24 text-center">
        <p className="eyebrow">No such alert</p>
        <h1 className="serif text-4xl mt-3">That alert has been taken down.</h1>
        <Link href="/lost-pets" className="action-button button-primary mt-6" data-testid="link-back-alerts">
          <ArrowLeft size={16} /> Back to lost pets
        </Link>
      </main>
    );
  }

  const minutes = minutesMissing(item) + lookahead;
  const chosen = prediction.zones.find((z) => z.id === selectedZone) ?? null;
  const confidenceTone =
    prediction.confidence.level === 'high'
      ? 'text-primary'
      : prediction.confidence.level === 'moderate'
        ? 'text-accent-foreground'
        : 'text-muted-foreground';

  function submitSighting(event: FormEvent) {
    event.preventDefault();
    if (!pin) {
      notify({ tone: 'error', text: 'Tap the map to mark where you saw them first.' });
      return;
    }
    const where = nearestLandmark(pin);
    setExtra([
      {
        id: `u${Date.now()}`,
        at: pin,
        reportedAt: Date.now(),
        confidence,
        note: note.trim() || `Sighting reported near ${where.name}.`,
        reporter: 'You',
      },
      ...extra,
    ]);
    setPin(null);
    setNote('');
    setPlacing(false);
    setSelectedZone(null);
    notify({ tone: 'success', text: `Sighting logged near ${where.name}. The map has been redrawn around it.` });
  }

  return (
    <main>
      <PageHeader
        eyebrow={item.status === 'Reunited' ? 'Home safe' : `Missing ${formatAge(minutes).replace(' ago', '')}`}
        title={
          <>
            Finding {item.petName},
            <br />
            <em className="text-primary not-italic">one likely place at a time.</em>
          </>
        }
        description={`${item.breed}. ${item.description}`}
        action={
          <div className="flex items-center gap-4">
            <PetPortrait spec={item.portrait} className="w-20 h-20 shrink-0" rounded={30} />
            <Link href="/lost-pets" className="action-button button-quiet" data-testid="link-all-alerts">
              <ArrowLeft size={16} /> All alerts
            </Link>
          </div>
        }
      />

      <section className="page-wrap pb-12 space-y-5">
        {item.status === 'Reunited' && (
          <div className="paper-card p-5 flex items-start gap-3" data-testid="banner-reunited">
            <CheckCircle2 size={20} className="text-primary shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>{item.petName} is home.</strong>{' '}
              {item.foundNote ? `${item.foundNote} ` : ''}
              This map is kept up so neighbours can see how the search ran.
            </p>
          </div>
        )}

        {/* Live summary */}
        <div className="paper-card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5 flex-1">
              <Stat label="Missing for" value={formatAge(minutes).replace(' ago', '')} hint={item.lastSeenPlace} />
              <Stat
                label="Search radius"
                value={prediction.beyondMap ? `${prediction.rings.p80} m+` : `${prediction.rings.p80} m`}
                hint={prediction.beyondMap ? 'Wider than this map — start at the centre' : 'Holds 80% of the likelihood'}
              />
              <Stat
                label="Best zone"
                value={`${Math.round((prediction.zones[0]?.probability ?? 0) * 100)}%`}
                hint={prediction.zones[0]?.place ?? '—'}
              />
              <Stat
                label="Confidence"
                value={<span className={confidenceTone}>{prediction.confidence.pct}%</span>}
                hint={`${prediction.confidence.level} · ${sightings.length} sighting${sightings.length === 1 ? '' : 's'}`}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-5 pt-5 border-t border-border leading-relaxed">
            <Brain size={15} className="inline align-[-2px] mr-1.5 text-primary" />
            {prediction.confidence.note}
          </p>
        </div>

        {/* Map */}
        <div className="paper-card overflow-hidden">
          <div className="p-5 md:p-6 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Live estimate · {prediction.anchorLabel.toLowerCase()}</p>
              <h2 className="serif text-2xl mt-1">Where {item.petName} most likely is now</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleChip active={showHeat} onClick={() => setShowHeat((v) => !v)} icon={Layers} label="Heat" testId="button-toggle-heat" />
              <ToggleChip active={showRings} onClick={() => setShowRings((v) => !v)} icon={Target} label="Rings" testId="button-toggle-rings" />
              <ToggleChip
                active={placing}
                onClick={() => {
                  setPlacing((v) => !v);
                  setPin(null);
                }}
                icon={Crosshair}
                label={placing ? 'Tap the map' : 'Drop a pin'}
                testId="button-toggle-placing"
              />
            </div>
          </div>

          <div className="px-5 md:px-6">
            <SearchMap
              prediction={prediction}
              sightings={sightings}
              home={item.home}
              lastSeen={item.lastSeen}
              selectedZoneId={selectedZone}
              onSelectZone={setSelectedZone}
              showHeat={showHeat}
              showRings={showRings}
              placing={placing}
              onPlace={setPin}
              pendingPin={pin}
            />
          </div>

          <div className="p-5 md:p-6 pt-4 space-y-4">
            <SearchMapLegend />
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
              <span className="eyebrow">If nobody finds him</span>
              <div className="flex gap-1.5 flex-wrap">
                {LOOKAHEADS.map((l) => (
                  <button
                    key={l.minutes}
                    onClick={() => setLookahead(l.minutes)}
                    className={`tag ${lookahead === l.minutes ? 'bg-primary text-primary-foreground' : ''}`}
                    data-testid={`button-lookahead-${l.minutes}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <span className="eyebrow ml-auto">Weather</span>
              <div className="flex gap-1.5 flex-wrap">
                {WEATHERS.map((w) => (
                  <button
                    key={w.value}
                    onClick={() => setWeather(w.value)}
                    className={`tag inline-flex gap-1 ${weather === w.value ? 'bg-primary text-primary-foreground' : ''}`}
                    data-testid={`button-weather-${w.value}`}
                  >
                    <w.icon size={11} />
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
            {lookahead > 0 && (
              <p className="text-xs text-muted-foreground">
                Projecting {LOOKAHEADS.find((l) => l.minutes === lookahead)?.label.toLowerCase()} ahead. The area widens and
                then settles — this is the case for going out now rather than waiting.
              </p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          {/* Zones */}
          <div className="lg:col-span-3 space-y-5">
            <div className="paper-card p-5 md:p-6">
              <p className="eyebrow">Search these in order</p>
              <h2 className="serif text-2xl mt-1 mb-5">Ranked zones</h2>
              <ol className="space-y-3">
                {prediction.zones.map((zone) => {
                  const open = zone.id === selectedZone;
                  return (
                    <li key={zone.id}>
                      <button
                        onClick={() => setSelectedZone(open ? null : zone.id)}
                        className={`w-full text-left rounded-[.9rem] border p-4 transition-colors ${open ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        data-testid={`button-zone-${zone.rank}`}
                        aria-expanded={open}
                      >
                        <div className="flex items-center gap-3">
                          <span className="avatar small" aria-hidden="true">{zone.rank}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-bold text-sm truncate">{zone.place}</span>
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {Math.round(zone.probability * 100)}% likely · {zone.radius} m across · {zone.terrain.replace('-', ' ')}
                            </span>
                          </span>
                          <ChevronRight size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
                        </div>
                        {open && (
                          <div className="mt-4 pt-4 border-t border-border space-y-3">
                            <p className="text-sm leading-relaxed">
                              <span className="eyebrow block mb-1">Why here</span>
                              {zone.reason}.
                            </p>
                            <p className="text-sm leading-relaxed">
                              <span className="eyebrow block mb-1">How to search it</span>
                              {zone.advice}
                            </p>
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
              {chosen && (
                <p className="text-xs text-muted-foreground mt-4">
                  Zone {chosen.rank} is highlighted on the map above.
                </p>
              )}
            </div>

            {/* Sightings */}
            <div className="paper-card p-5 md:p-6">
              <p className="eyebrow">What people have reported</p>
              <h2 className="serif text-2xl mt-1 mb-5">Sightings</h2>
              {sightings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing reported yet. Until then the map is behaviour and terrain only — the first confirmed sighting
                  changes it more than anything else you can do.
                </p>
              ) : (
                <ul className="space-y-3">
                  {sightings.map((s) => {
                    const where = nearestLandmark(s.at);
                    return (
                      <li key={s.id} className="flex gap-3 rounded-[.9rem] border border-border p-4" data-testid={`sighting-${s.id}`}>
                        <Eye size={17} className="text-accent-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">{s.reporter}</strong> · {formatAge(s.minutesAgo)} ·{' '}
                            <span className="tag ml-1">{s.confidence}</span>
                          </p>
                          <p className="text-sm mt-1.5 leading-relaxed">{s.note}</p>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            <MapPin size={11} className="inline align-[-1px] mr-1" />
                            {where.metres} m from {where.name}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form onSubmit={submitSighting} className="mt-6 pt-5 border-t border-border space-y-3" data-testid="form-sighting">
                <p className="eyebrow">Report a sighting</p>
                <div className={`rounded-[.9rem] border p-3.5 text-sm ${pin ? 'border-primary bg-primary/5' : 'border-dashed border-input'}`}>
                  {pin ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={15} className="text-primary" />
                      Pinned {nearestLandmark(pin).metres} m from {nearestLandmark(pin).name}
                      <button type="button" onClick={() => setPin(null)} className="ml-2 text-xs underline" data-testid="button-clear-pin">
                        clear
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlacing(true)}
                      className="inline-flex items-center gap-2 text-muted-foreground"
                      data-testid="button-start-placing"
                    >
                      <Crosshair size={15} /> Tap &ldquo;Drop a pin&rdquo;, then tap the map where you saw them
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(['confirmed', 'likely', 'possible'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setConfidence(c)}
                      className={`tag ${confidence === c ? 'bg-primary text-primary-foreground' : ''}`}
                      data-testid={`button-confidence-${c}`}
                    >
                      {c === 'confirmed' ? 'Certain it was them' : c === 'likely' ? 'Fairly sure' : 'Might have been'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="field"
                  placeholder={`What did you see? Direction of travel helps most — "went north into the thicket" tells the map more than "saw a dog".`}
                  data-testid="input-sighting-note"
                />
                <button type="submit" className="action-button button-primary w-full" data-testid="button-submit-sighting">
                  <Radar size={16} /> Log it and redraw the map
                </button>
                <p className="text-xs text-muted-foreground">
                  Uncertain sightings still help — the model weights them by how sure you are, so an honest &ldquo;might
                  have been&rdquo; is more useful than saying nothing.
                </p>
              </form>
            </div>
          </div>

          {/* Reasoning + actions */}
          <div className="lg:col-span-2 space-y-5">
            <div className="paper-card p-5 md:p-6">
              <p className="eyebrow">Nothing hidden</p>
              <h2 className="serif text-2xl mt-1 mb-5">What is shaping this map</h2>
              <ul className="space-y-4">
                {prediction.drivers.map((d) => (
                  <li key={d.label}>
                    <p className="text-sm font-bold">{d.label}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">{d.detail}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="paper-card p-5 md:p-6">
              <p className="eyebrow">Read from the words, not the form</p>
              <h2 className="serif text-2xl mt-1 mb-2">What the descriptions told us</h2>
              {cues.cues.length === 0 ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Nothing in the text changed the map yet. Phrases like &ldquo;bolted&rdquo;, &ldquo;limping&rdquo;,
                  &ldquo;heading north&rdquo;, &ldquo;into the thicket&rdquo; or a street name all move it — the more
                  specific a sighting note is, the more it is worth.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Picked out of the report and the sighting notes. Each one shifted the map.
                  </p>
                  <ul className="space-y-2.5">
                    {cues.cues.map((cue, i) => (
                      <li key={`${cue.matched}-${i}`} className="flex gap-2.5 text-sm" data-testid={`cue-${i}`}>
                        <ScanText size={15} className="text-primary shrink-0 mt-0.5" />
                        <span>
                          <strong className="mono text-xs bg-secondary rounded px-1.5 py-0.5">{cue.matched}</strong>{' '}
                          <span className="text-muted-foreground">— {cue.effect}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                    This matches known phrases rather than understanding the sentence, so it will miss an unusual
                    wording. Everything it did use is listed above — nothing is applied silently.
                  </p>
                </>
              )}
            </div>

            <div className="paper-card p-5 md:p-6">
              <p className="eyebrow">Do these, in this order</p>
              <h2 className="serif text-2xl mt-1 mb-5">Next steps</h2>
              <ul className="space-y-4">
                {prediction.actions.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className={`shrink-0 grid place-items-center w-7 h-7 rounded-full mt-0.5 ${a.urgency === 'now' ? 'bg-destructive text-destructive-foreground' : a.urgency === 'soon' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`}
                    >
                      {a.urgency === 'now' ? <BellRing size={14} /> : a.urgency === 'soon' ? <Clock3 size={14} /> : <Sparkles size={14} />}
                    </span>
                    <div>
                      <p className="eyebrow">{a.when}</p>
                      <p className="text-sm leading-relaxed mt-0.5">{a.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="paper-card p-5 md:p-6">
              <p className="eyebrow">Please don't</p>
              <h2 className="serif text-2xl mt-1 mb-4">Things that make it worse</h2>
              <ul className="space-y-3 text-sm">
                {[
                  'Chasing, or calling loudly in a group. A frightened animal runs from noise, and every chase widens this map.',
                  'Searching only where you would go. Animals hide low and tight — under decks, behind bins, inside open garages.',
                  'Giving up after the first day. Most are found later than people expect, close to where they vanished.',
                ].map((text) => (
                  <li key={text} className="flex gap-2.5">
                    <Ban size={15} className="text-destructive shrink-0 mt-0.5" />
                    <span className="text-muted-foreground leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="paper-card p-5 md:p-6">
              <p className="eyebrow">Contact</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="avatar" aria-hidden="true">{item.ownerInitials}</span>
                <div>
                  <p className="font-bold text-sm">{item.owner}</p>
                  <p className="text-xs text-muted-foreground">{item.contact}</p>
                </div>
              </div>
              <dl className="mt-5 pt-5 border-t border-border space-y-2.5 text-sm">
                <div className="flex gap-3">
                  <dt className="eyebrow w-24 shrink-0 pt-0.5">Markings</dt>
                  <dd>{item.markings}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="eyebrow w-24 shrink-0 pt-0.5">Microchip</dt>
                  <dd>{item.microchipped ? 'Yes — any vet can scan and identify them' : 'Not chipped'}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="eyebrow w-24 shrink-0 pt-0.5">Home</dt>
                  <dd className="inline-flex items-center gap-1.5">
                    <Home size={13} className="text-primary" />
                    {item.homePlace}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ToggleChip({
  active,
  onClick,
  icon: Icon,
  label,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Layers;
  label: string;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`action-button text-xs px-3 min-h-0 py-2 ${active ? 'button-primary' : 'button-quiet'}`}
      data-testid={testId}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
