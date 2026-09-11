/**
 * The live search map: the probability field from the lost-pet model drawn over
 * a plan of the neighbourhood, with the ranked search zones, containment rings,
 * reported sightings and the barriers that shape the whole picture.
 */

import { useId } from 'react';
import {
  BARRIERS,
  MAP_HEIGHT,
  MAP_MIN_X,
  MAP_MIN_Y,
  MAP_WIDTH,
  TERRAIN_ZONES,
  type TerrainKind,
  type Vec,
} from '@/lib/neighborhood-map';
import type { Prediction, Sighting } from '@/lib/lost-pet-model';

/** Map metres to SVG units. +y is north, so the y axis flips. */
const sx = (x: number) => x - MAP_MIN_X;
const sy = (y: number) => MAP_HEIGHT - (y - MAP_MIN_Y);

const TERRAIN_FILL: Record<TerrainKind, string> = {
  park: 'hsl(140 32% 74%)',
  woodland: 'hsl(150 30% 62%)',
  garden: 'hsl(96 34% 72%)',
  'dense-housing': 'hsl(35 28% 78%)',
  commercial: 'hsl(30 26% 72%)',
  industrial: 'hsl(210 12% 72%)',
  open: 'hsl(72 32% 82%)',
};

/**
 * Sequential ramp, cool to hot, so "warmer means more likely" reads without a
 * legend. Hue sweeps teal to green to amber to coral as probability rises.
 */
function heatColour(t: number): string {
  const stops = [
    { t: 0.0, h: 190, s: 52, l: 58 },
    { t: 0.35, h: 128, s: 48, l: 52 },
    { t: 0.65, h: 46, s: 92, l: 58 },
    { t: 1.0, h: 10, s: 76, l: 52 },
  ];
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const span = b.t - a.t || 1;
  const k = (t - a.t) / span;
  const h = a.h + (b.h - a.h) * k;
  const s = a.s + (b.s - a.s) * k;
  const l = a.l + (b.l - a.l) * k;
  const alpha = 0.1 + 0.78 * Math.pow(t, 0.75);
  return `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}% / ${alpha.toFixed(3)})`;
}

function heatSwatch(t: number): string {
  return heatColour(t).replace(/ \/ [\d.]+\)$/, ')');
}

export type SearchMapProps = {
  prediction: Prediction;
  sightings: Sighting[];
  home: Vec;
  lastSeen: Vec;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
  showHeat: boolean;
  showRings: boolean;
  /** When true, clicking the map drops a pin instead of selecting a zone. */
  placing?: boolean;
  onPlace?: (at: Vec) => void;
  pendingPin?: Vec | null;
};

export function SearchMap({
  prediction,
  sightings,
  home,
  lastSeen,
  selectedZoneId,
  onSelectZone,
  showHeat,
  showRings,
  placing = false,
  onPlace,
  pendingPin = null,
}: SearchMapProps) {
  const blurId = useId();
  const cell = prediction.grid.cellSize;
  const anchor = prediction.anchor;

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="w-full h-auto block rounded-[1rem]"
      style={placing ? { cursor: 'crosshair' } : undefined}
      onClick={(event) => {
        if (!placing || !onPlace) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const px = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH;
        const py = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT;
        onPlace({ x: px + MAP_MIN_X, y: MAP_MIN_Y + (MAP_HEIGHT - py) });
      }}
      role="img"
      aria-label={`Search probability map. Highest-likelihood zone: ${prediction.zones[0]?.place ?? 'not yet determined'}.`}
      data-testid="svg-search-map"
    >
      <defs>
        <filter id={blurId} x="-6%" y="-6%" width="112%" height="112%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      {/* Ground */}
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="hsl(60 24% 88%)" />

      {/* Land use */}
      {TERRAIN_ZONES.map((z) => (
        <rect
          key={z.id}
          x={sx(z.x0)}
          y={sy(z.y1)}
          width={z.x1 - z.x0}
          height={z.y1 - z.y0}
          fill={TERRAIN_FILL[z.kind]}
          rx={14}
        />
      ))}

      {/* Probability field. Blurred so the 25 m grid reads as a field, not tiles. */}
      {showHeat && (
        <g filter={`url(#${blurId})`} opacity={0.92}>
          {prediction.grid.cells.map((c, i) => {
            // Shade by share of total likelihood, not by height relative to the
            // single peak: a diffuse field would otherwise wash the map in red.
            const t = Math.pow(c.q, 0.8);
            if (t < 0.06) return null;
            return (
              <rect
                key={i}
                x={sx(c.x) - cell / 2}
                y={sy(c.y) - cell / 2}
                width={cell}
                height={cell}
                fill={heatColour(t)}
              />
            );
          })}
        </g>
      )}

      {/* Barriers sit above the field: they are what shapes it. */}
      {BARRIERS.map((b) => {
        const d = b.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
        if (b.kind === 'creek') {
          return (
            <path
              key={b.id}
              d={d}
              fill="none"
              stroke="hsl(199 55% 58%)"
              strokeWidth={16}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          );
        }
        if (b.kind === 'rail') {
          return (
            <g key={b.id}>
              <path d={d} fill="none" stroke="hsl(210 10% 45%)" strokeWidth={9} strokeLinecap="round" />
              <path d={d} fill="none" stroke="hsl(60 24% 88%)" strokeWidth={3} strokeDasharray="6 10" strokeLinecap="round" />
            </g>
          );
        }
        return (
          <g key={b.id}>
            <path d={d} fill="none" stroke="hsl(30 12% 52%)" strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke="hsl(48 40% 90%)" strokeWidth={2.5} strokeDasharray="18 16" strokeLinecap="round" />
          </g>
        );
      })}

      {/* Names for the bigger areas */}
      {TERRAIN_ZONES.filter((z) => z.x1 - z.x0 > 150 && z.y1 - z.y0 > 150).map((z) => (
        <text
          key={`label-${z.id}`}
          x={sx((z.x0 + z.x1) / 2)}
          y={sy(z.y1) + 26}
          textAnchor="middle"
          fill="hsl(157 22% 30%)"
          opacity={0.62}
          style={{ font: '600 17px var(--app-font-mono, monospace)', letterSpacing: '.06em' }}
        >
          {z.name.toUpperCase()}
        </text>
      ))}

      {/* Containment rings around the anchor */}
      {showRings &&
        [
          { r: prediction.rings.p50, label: '50%' },
          { r: prediction.rings.p80, label: '80%' },
          { r: prediction.rings.p95, label: '95%' },
        ].map((ring) =>
          ring.r > 12 ? (
            <g key={ring.label}>
              <circle
                cx={sx(anchor.x)}
                cy={sy(anchor.y)}
                r={ring.r}
                fill="none"
                stroke="hsl(157 30% 24%)"
                strokeWidth={2}
                strokeDasharray="10 9"
                opacity={0.5}
              />
              <text
                x={sx(anchor.x)}
                y={sy(anchor.y) - ring.r - 7}
                textAnchor="middle"
                fill="hsl(157 30% 24%)"
                opacity={0.8}
                style={{ font: '700 16px var(--app-font-mono, monospace)' }}
              >
                {ring.label}
              </text>
            </g>
          ) : null,
        )}

      {/* Ranked search zones */}
      {prediction.zones.map((zone) => {
        const selected = zone.id === selectedZoneId;
        return (
          <g
            key={zone.id}
            onClick={(event) => {
              if (placing) return;
              event.stopPropagation();
              onSelectZone(selected ? null : zone.id);
            }}
            style={{ cursor: placing ? 'crosshair' : 'pointer' }}
            data-testid={`map-zone-${zone.rank}`}
          >
            <circle
              cx={sx(zone.centre.x)}
              cy={sy(zone.centre.y)}
              r={zone.radius}
              fill="none"
              stroke={selected ? 'hsl(7 62% 44%)' : 'hsl(157 30% 22%)'}
              strokeWidth={selected ? 5 : 2.5}
              opacity={selected ? 0.95 : 0.55}
            />
            <circle
              cx={sx(zone.centre.x)}
              cy={sy(zone.centre.y)}
              r={21}
              fill={selected ? 'hsl(7 62% 46%)' : 'hsl(157 32% 24%)'}
            />
            <text
              x={sx(zone.centre.x)}
              y={sy(zone.centre.y) + 7}
              textAnchor="middle"
              fill="hsl(42 40% 96%)"
              style={{ font: '700 21px var(--app-font-serif, serif)' }}
            >
              {zone.rank}
            </text>
          </g>
        );
      })}

      {/* Sightings */}
      {sightings.map((s) => (
        <g key={s.id} data-testid={`map-sighting-${s.id}`}>
          <circle cx={sx(s.at.x)} cy={sy(s.at.y)} r={17} fill="hsl(37 89% 60%)" stroke="hsl(157 30% 22%)" strokeWidth={3} />
          <circle cx={sx(s.at.x)} cy={sy(s.at.y)} r={6} fill="hsl(157 30% 22%)" />
        </g>
      ))}

      {/* Where it went missing */}
      <circle cx={sx(lastSeen.x)} cy={sy(lastSeen.y)} r={13} fill="hsl(7 62% 48%)" stroke="hsl(42 40% 96%)" strokeWidth={4} data-testid="map-last-seen" />

      {/* Home */}
      <path
        d={`M ${sx(home.x)} ${sy(home.y) - 17} L ${sx(home.x) + 15} ${sy(home.y) - 1} L ${sx(home.x) + 15} ${sy(home.y) + 15} L ${sx(home.x) - 15} ${sy(home.y) + 15} L ${sx(home.x) - 15} ${sy(home.y) - 1} Z`}
        fill="hsl(158 35% 27%)"
        stroke="hsl(42 40% 96%)"
        strokeWidth={3.5}
        data-testid="map-home"
      />

      {/* Pin being placed for a new sighting report */}
      {pendingPin && (
        <g data-testid="map-pending-pin">
          <circle cx={sx(pendingPin.x)} cy={sy(pendingPin.y)} r={30} fill="none" stroke="hsl(37 89% 52%)" strokeWidth={4} strokeDasharray="9 7" />
          <circle cx={sx(pendingPin.x)} cy={sy(pendingPin.y)} r={12} fill="hsl(37 89% 60%)" stroke="hsl(157 30% 22%)" strokeWidth={3} />
        </g>
      )}

      {/* Scale bar */}
      <g transform={`translate(${MAP_WIDTH - 250} ${MAP_HEIGHT - 34})`}>
        <rect x={-14} y={-26} width={228} height={40} rx={10} fill="hsl(42 38% 99% / .82)" />
        <line x1={0} y1={0} x2={200} y2={0} stroke="hsl(157 25% 22%)" strokeWidth={3} />
        <line x1={0} y1={-7} x2={0} y2={7} stroke="hsl(157 25% 22%)" strokeWidth={3} />
        <line x1={200} y1={-7} x2={200} y2={7} stroke="hsl(157 25% 22%)" strokeWidth={3} />
        <text x={100} y={-11} textAnchor="middle" fill="hsl(157 25% 22%)" style={{ font: '700 15px var(--app-font-mono, monospace)' }}>
          200 m
        </text>
      </g>
    </svg>
  );
}

/** Standalone legend, so the map itself stays uncluttered. */
export function SearchMapLegend() {
  const steps = [0.08, 0.28, 0.5, 0.72, 0.95];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex rounded-full overflow-hidden border border-border">
          {steps.map((t) => (
            <span key={t} className="w-6 h-3 block" style={{ background: heatSwatch(t) }} />
          ))}
        </span>
Where the likelihood is concentrated
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full" style={{ background: 'hsl(7 62% 48%)' }} /> Last seen
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full" style={{ background: 'hsl(37 89% 60%)' }} /> Sighting
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(158 35% 27%)' }} /> Home
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-5 h-0.5 rounded" style={{ background: 'hsl(30 12% 52%)' }} /> Road
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-5 h-0.5 rounded" style={{ background: 'hsl(199 55% 58%)' }} /> Creek
      </span>
    </div>
  );
}
