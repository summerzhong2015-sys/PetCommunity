/**
 * Walking routes.
 *
 * The card is a picture and a name. Everything factual lives behind the click:
 * the surface, the climb, the shade, the water, how busy it gets across the
 * day, the stops along the way, the warnings, parking, and what neighbours
 * have said. Three drawn scenes in a row read as three places you might go;
 * three grids of facts read as homework.
 *
 * The details open inside the card you clicked. They used to render in a panel
 * below the whole grid, which on anything narrower than a wide desktop put them
 * several hundred pixels off-screen — the button looked broken because nothing
 * you could see changed.
 */

import {
  Bookmark,
  ChevronDown,
  Clock3,
  Droplets,
  Footprints,
  Info,
  MapPin,
  Mountain,
  ParkingCircle,
  Quote,
  Route as RouteIcon,
  Sun,
  TriangleAlert,
  Accessibility,
  UsersRound,
} from 'lucide-react';
import { PageHeader, useStored, type Notify } from '@/components/page-bits';
import { WalkScene } from '@/components/walk-scene';
import { BUSY_LABEL, busyBars, defaultWalks, type Walk } from '@/lib/walks-data';

/** One fact in the opened panel. */
function Fact({ icon: Icon, label, value }: { icon: typeof Sun; label: string; value: string }) {
  return (
    <div className="flex gap-2.5">
      <Icon size={15} className="text-primary shrink-0 mt-0.5" strokeWidth={1.9} />
      <div className="min-w-0">
        <p className="eyebrow leading-none">{label}</p>
        <p className="text-sm mt-1 leading-snug">{value}</p>
      </div>
    </div>
  );
}

/** Three bars per window: how busy the route gets at that time of day. */
function BusyStrip({ walk }: { walk: Walk }) {
  return (
    <div className="flex gap-4">
      {walk.busy.map((slot) => {
        const filled = busyBars(slot.level);
        return (
          <div key={slot.label} className="flex-1">
            <p className="eyebrow leading-none">{slot.label}</p>
            <div className="flex gap-1 mt-1.5" aria-hidden="true">
              {[1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className={`h-1.5 flex-1 rounded-full ${bar <= filled ? 'bg-primary' : 'bg-secondary'}`}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{BUSY_LABEL[slot.level]}</p>
          </div>
        );
      })}
    </div>
  );
}

export function Walks({ notify }: { notify: Notify }) {
  // Only what you chose is stored. The routes themselves come from the module,
  // so adding a field to a walk never has to be reconciled with an older copy
  // sitting in someone's browser.
  const [savedIds, setSavedIds] = useStored<string[]>('pc_walks_saved', []);
  const [openId, setOpenId] = useStored<string | null>('pc_walk_open', null);

  const walks = defaultWalks.map((walk) => ({ ...walk, saved: savedIds.includes(walk.id) }));

  function toggleSaved(walk: Walk) {
    const next = walk.saved ? savedIds.filter((id) => id !== walk.id) : [...savedIds, walk.id];
    setSavedIds(next);
    notify({
      tone: 'success',
      text: walk.saved ? 'Route removed from your saved walks.' : 'Route saved for later.',
    });
  }

  return (
    <main>
      <PageHeader
        eyebrow="Go at your own pace"
        title={
          <>
            Routes with a
            <br />
            <em className="text-primary not-italic">little local lore.</em>
          </>
        }
        description="Familiar loops, honest details, and a peek at who is out there now. Open a route for the surface underfoot, the stops along the way, and what neighbours say to watch for."
      />

      <section className="page-wrap pb-10">
        {/* items-start so an opened card grows without stretching its neighbours. */}
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          {walks.map((walk, i) => {
            const open = walk.id === openId;
            return (
              <article
                key={walk.id}
                className={`paper-card overflow-hidden reveal reveal-delay-${Math.min(i + 1, 3)} ${open ? 'ring-2 ring-primary' : ''}`}
                data-testid={`card-walk-${walk.id}`}
              >
                <div className="h-36 relative">
                  <WalkScene kind={walk.scene} className="absolute inset-0 w-full h-full" />
                  <span className="absolute top-4 left-4 tag bg-card/85 backdrop-blur-sm">{walk.level}</span>
                  <button
                    onClick={() => toggleSaved(walk)}
                    className={`absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full ${walk.saved ? 'bg-accent text-accent-foreground' : 'bg-card/85 backdrop-blur-sm'}`}
                    aria-label={`${walk.saved ? 'Unsave' : 'Save'} ${walk.name}`}
                    aria-pressed={Boolean(walk.saved)}
                    data-testid={`button-save-walk-${walk.id}`}
                  >
                    <Bookmark size={16} fill={walk.saved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="p-5">
                  <p className="eyebrow">{walk.neighborhood}</p>
                  <h2 className="serif text-2xl mt-1">{walk.name}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-3">
                    <span className="inline-flex items-center gap-1">
                      <RouteIcon size={13} />
                      {walk.distance}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={13} />
                      {walk.duration}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Sun size={13} />
                      Best {walk.best.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mt-4">{walk.description}</p>

                  <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      <strong className="text-primary">{walk.active}</strong> out now
                    </span>
                    <button
                      onClick={() => setOpenId(open ? null : walk.id)}
                      aria-expanded={open}
                      aria-controls={`walk-details-${walk.id}`}
                      className="text-xs font-bold text-primary inline-flex items-center gap-1"
                      data-testid={`button-open-walk-${walk.id}`}
                    >
                      {open ? 'Hide the details' : 'All the details'}
                      <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {open && (
                    <div
                      id={`walk-details-${walk.id}`}
                      className="mt-5 pt-5 border-t border-border reveal space-y-6"
                      data-testid={`panel-walk-details-${walk.id}`}
                    >
                      {/* The shape of the route. */}
                      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4" data-testid={`glance-walk-${walk.id}`}>
                        <Fact icon={Footprints} label="Surface" value={walk.surface} />
                        <Fact icon={Mountain} label="Climb" value={walk.climb} />
                        <Fact icon={Sun} label="Shade" value={walk.shade} />
                        <Fact icon={Droplets} label="Water" value={walk.water} />
                        <Fact icon={UsersRound} label="Off-leash" value={walk.offLeash} />
                        <Fact icon={MapPin} label="Where" value={walk.neighborhood} />
                      </div>

                      <div>
                        <p className="eyebrow mb-2.5">How busy, through the day</p>
                        <BusyStrip walk={walk} />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {walk.suits.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Stops, in order, so the route can be followed. */}
                      <div>
                        <p className="eyebrow mb-3">Along the way</p>
                        <ol className="space-y-3.5">
                          {walk.stops.map((stop, index) => (
                            <li key={stop.at} className="flex gap-3">
                              <span className="relative flex flex-col items-center shrink-0">
                                <span className="grid place-items-center w-6 h-6 rounded-full bg-primary/10 text-primary mono text-[10px] font-bold">
                                  {index + 1}
                                </span>
                                {index < walk.stops.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
                              </span>
                              <div className="min-w-0 pb-0.5">
                                <p className="text-sm font-bold flex flex-wrap items-baseline gap-x-2">
                                  {stop.name}
                                  <span className="mono text-[10px] text-muted-foreground font-normal">{stop.at}</span>
                                </p>
                                <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{stop.note}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div>
                        <p className="eyebrow mb-2.5">Worth knowing</p>
                        <ul className="space-y-2">
                          {walk.headsUp.map((item) => (
                            <li key={item} className="text-sm leading-relaxed flex gap-2.5">
                              <TriangleAlert size={14} className="shrink-0 mt-1 text-accent-foreground/70" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid gap-4">
                        <div className="flex gap-2.5">
                          <ParkingCircle size={15} className="text-primary shrink-0 mt-0.5" strokeWidth={1.9} />
                          <div>
                            <p className="eyebrow leading-none">Getting there</p>
                            <p className="text-sm mt-1 leading-relaxed">{walk.parking}</p>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <Accessibility size={15} className="text-primary shrink-0 mt-0.5" strokeWidth={1.9} />
                          <div>
                            <p className="eyebrow leading-none">Getting round</p>
                            <p className="text-sm mt-1 leading-relaxed">{walk.accessibility}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="eyebrow mb-3">From neighbours</p>
                        <ul className="space-y-3">
                          {walk.notes.map((note) => (
                            <li key={note.by} className="rounded-[.9rem] bg-secondary/60 p-3.5">
                              <Quote size={13} className="text-primary mb-1.5" />
                              <p className="text-sm leading-relaxed">{note.text}</p>
                              <p className="text-[11px] text-muted-foreground mt-2">{note.by}</p>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <span>
                          Saying you are heading there puts you in the &ldquo;out now&rdquo; count for a while. Nobody
                          sees where you are, only that someone is on the route.
                        </span>
                      </div>

                      <button
                        className="action-button button-primary w-full"
                        onClick={() => notify({ tone: 'info', text: `You are marked as heading to ${walk.name}.` })}
                        data-testid={`button-join-walk-${walk.id}`}
                      >
                        <MapPin size={16} /> I&rsquo;m heading there
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
