/**
 * Walking routes.
 *
 * The details open inside the card you clicked. They used to render in a panel
 * below the whole grid, which on anything narrower than a wide desktop put them
 * several hundred pixels off-screen — the button looked broken because nothing
 * you could see changed.
 */

import { Bookmark, ChevronDown, Clock3, Footprints, Route as RouteIcon, UsersRound } from 'lucide-react';
import { PageHeader, useStored, type Notify } from '@/components/page-bits';
import { defaultWalks, type Walk } from '@/lib/walks-data';

const BANNERS = ['bg-[#b8cdb9]', 'bg-[#e4c988]', 'bg-[#c9d8d4]'];

export function Walks({ notify }: { notify: Notify }) {
  const [walks, setWalks] = useStored<Walk[]>('pc_walks', defaultWalks);
  const [openId, setOpenId] = useStored<string | null>('pc_walk_open', null);

  function toggleSaved(walk: Walk) {
    setWalks(walks.map((w) => (w.id === walk.id ? { ...w, saved: !w.saved } : w)));
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
        description="Familiar loops, honest details, and a peek at who is out there now. Save a route for the next good-weather window."
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
                <div className={`h-32 relative ${BANNERS[i % BANNERS.length]}`}>
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        'linear-gradient(135deg, transparent 45%, hsl(158 35% 29% / .25) 46%, transparent 48%), linear-gradient(25deg, transparent 55%, hsl(42 32% 96% / .6) 56%, transparent 58%)',
                      backgroundSize: '44px 44px',
                    }}
                  />
                  <span className="absolute top-4 left-4 tag bg-card/80">{walk.level}</span>
                  <button
                    onClick={() => toggleSaved(walk)}
                    className={`absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full ${walk.saved ? 'bg-accent text-accent-foreground' : 'bg-card/85'}`}
                    aria-label={`${walk.saved ? 'Unsave' : 'Save'} ${walk.name}`}
                    aria-pressed={Boolean(walk.saved)}
                    data-testid={`button-save-walk-${walk.id}`}
                  >
                    <Bookmark size={16} fill={walk.saved ? 'currentColor' : 'none'} />
                  </button>
                  <RouteIcon className="absolute bottom-4 right-5 text-primary/70" size={43} strokeWidth={1.2} />
                </div>

                <div className="p-5">
                  <p className="eyebrow">{walk.neighborhood}</p>
                  <h2 className="serif text-2xl mt-1">{walk.name}</h2>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-3">
                    <span className="inline-flex items-center gap-1">
                      <RouteIcon size={13} />
                      {walk.distance}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={13} />
                      {walk.duration}
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
                      {open ? 'Hide details' : 'Route details'}
                      <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {open && (
                    <div id={`walk-details-${walk.id}`} className="mt-5 pt-5 border-t border-border reveal" data-testid={`panel-walk-details-${walk.id}`}>
                      <dl className="space-y-3">
                        <div>
                          <dt className="eyebrow">The shape</dt>
                          <dd className="text-sm mt-1">
                            {walk.distance} · {walk.duration} · {walk.level}
                          </dd>
                        </div>
                        <div>
                          <dt className="eyebrow">Best window</dt>
                          <dd className="text-sm mt-1">{walk.best}</dd>
                        </div>
                        <div>
                          <dt className="eyebrow">Out there now</dt>
                          <dd className="text-sm mt-1 flex items-center gap-2">
                            <UsersRound size={15} className="text-primary" />
                            {walk.active} {walk.active === 1 ? 'neighbour is' : 'neighbours are'} on this route
                          </dd>
                        </div>
                      </dl>
                      <button
                        className="action-button button-primary w-full mt-5"
                        onClick={() => notify({ tone: 'info', text: `You are marked as heading to ${walk.name}.` })}
                        data-testid={`button-join-walk-${walk.id}`}
                      >
                        <Footprints size={16} /> I&rsquo;m heading there
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
