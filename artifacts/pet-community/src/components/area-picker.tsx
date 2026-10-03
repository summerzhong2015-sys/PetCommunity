/**
 * Drop a pin where you walk from, on the real map.
 *
 * This was a drawn plan of Murrayville, which was honest about being a drawing
 * and useless for recognising your own street. It is now OpenStreetMap, so the
 * streets are the streets: you find your corner the way you would on any map,
 * and the app converts where you tapped into its own metre grid.
 *
 * What is stored is unchanged and still blunt — the pin is rounded to 50 m
 * before it leaves here, and the circle drawn around it is that rounding, to
 * scale. Zooming in further does not buy anyone more precision.
 *
 * If the map cannot be loaded at all, the page says so and the landmark list
 * beneath it still works. Nobody is locked out of setting their area because a
 * CDN is having a bad day.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MapPin } from 'lucide-react';
import { LANDMARKS } from '@/lib/neighborhood-map';
import { MAP_BOUNDS, MURRAYVILLE_CENTRE, toLatLon, toVec } from '@/lib/geo';
import { loadLeaflet, themeColour, type Leaflet, type LeafletLayer, type LeafletMap } from '@/lib/leaflet-loader';
import { AREA_BLUR_METRES, AREA_STEP, describeArea, snapArea, type Area } from '@/lib/area';

export function AreaPicker({
  area,
  onPick,
}: {
  /** The pin, if one has been dropped. */
  area?: Area;
  onPick: (area: Area) => void;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const leaflet = useRef<Leaflet | null>(null);
  const map = useRef<LeafletMap | null>(null);
  const pin = useRef<LeafletLayer | null>(null);
  const halo = useRef<LeafletLayer | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  // Held in a ref so a new handler does not tear the map down and rebuild it.
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !host.current || map.current) return;
        const created = L.map(host.current, {
          center: [MURRAYVILLE_CENTRE.lat, MURRAYVILLE_CENTRE.lon],
          zoom: 15,
          minZoom: 13,
          maxZoom: 18,
          // Murrayville, and not the whole world: there is nothing useful to
          // say about a pin dropped in Surrey.
          maxBounds: [
            [MAP_BOUNDS.south, MAP_BOUNDS.west],
            [MAP_BOUNDS.north, MAP_BOUNDS.east],
          ],
          maxBoundsViscosity: 0.9,
          scrollWheelZoom: false,
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(created);

        // Our own landmarks on top, so "right by Five Corners" still means
        // something you can see.
        const ink = themeColour('--primary');
        for (const landmark of LANDMARKS) {
          const place = toLatLon(landmark.at);
          L.circleMarker([place.lat, place.lon], {
            radius: 5,
            color: ink,
            weight: 2,
            fillColor: '#ffffff',
            fillOpacity: 1,
          })
            .addTo(created)
            .bindTooltip(landmark.name, { direction: 'top' });
        }

        created.on('click', (event) => {
          pick.current(snapArea(toVec({ lat: event.latlng.lat, lon: event.latlng.lng })));
        });

        leaflet.current = L;
        map.current = created;
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      pin.current = null;
      halo.current = null;
    };
  }, []);

  // The pin itself, redrawn whenever it moves.
  useEffect(() => {
    const L = leaflet.current;
    const created = map.current;
    if (!L || !created) return;

    if (!area) {
      pin.current?.remove();
      halo.current?.remove();
      pin.current = null;
      halo.current = null;
      return;
    }

    const place = toLatLon(area);
    const ink = themeColour('--primary');

    if (halo.current) halo.current.setLatLng([place.lat, place.lon]);
    else {
      halo.current = L.circle([place.lat, place.lon], {
        radius: AREA_BLUR_METRES,
        color: ink,
        weight: 2,
        dashArray: '6 6',
        fillColor: ink,
        fillOpacity: 0.12,
      }).addTo(created);
    }

    if (pin.current) pin.current.setLatLng([place.lat, place.lon]);
    else {
      pin.current = L.circleMarker([place.lat, place.lon], {
        radius: 7,
        color: '#ffffff',
        weight: 3,
        fillColor: ink,
        fillOpacity: 1,
      }).addTo(created);
    }
  }, [area, state]);

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, [number, number]> = {
      ArrowUp: [0, AREA_STEP],
      ArrowDown: [0, -AREA_STEP],
      ArrowLeft: [-AREA_STEP, 0],
      ArrowRight: [AREA_STEP, 0],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const from = area ?? toVec(MURRAYVILLE_CENTRE);
    onPick(snapArea({ x: from.x + step[0], y: from.y + step[1] }));
  }

  const label = area
    ? `Your spot: ${describeArea(area)}. Arrow keys move it fifty metres at a time.`
    : 'Tap the map for roughly where you walk from. Arrow keys drop a pin too.';

  return (
    <div
      className="rounded-[1rem] border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary"
      tabIndex={0}
      role="group"
      aria-label={label}
      onKeyDown={nudge}
      data-testid="area-picker"
    >
      <div className="relative">
        <div ref={host} className="w-full h-72 md:h-80 bg-secondary/40" data-testid="area-picker-map" />

        {state !== 'ready' && (
          <div className="absolute inset-0 grid place-items-center bg-secondary/60 text-center px-6">
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              {state === 'loading'
                ? 'Loading the map…'
                : 'The map could not be loaded just now. Pick the landmark you walk from below instead — it does the same job.'}
            </p>
          </div>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-3 py-2 bg-secondary/40 border-t border-border">
        <MapPin size={12} className="shrink-0" />
        {area ? describeArea(area) : 'Tap anywhere on the map'}
      </p>
    </div>
  );
}
