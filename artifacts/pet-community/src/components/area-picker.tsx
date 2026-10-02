/**
 * Drop a pin where you walk from.
 *
 * A plan of the neighbourhood you tap, rather than a list you scroll. The pin
 * is rounded to a 50 m grid before it leaves this component, and the circle
 * drawn around it is the honest picture of what gets stored: an area, not an
 * address. Arrow keys move it too, so this is not a mouse-only control.
 */

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { MapPin } from 'lucide-react';
import {
  BARRIERS,
  LANDMARKS,
  MAP_HEIGHT,
  MAP_MIN_X,
  MAP_MIN_Y,
  MAP_WIDTH,
  TERRAIN_ZONES,
  type TerrainKind,
} from '@/lib/neighborhood-map';
import { AREA_BLUR_METRES, AREA_STEP, describeArea, snapArea, type Area } from '@/lib/area';

/** Metres to SVG units. +y is north, so the y axis flips. */
const sx = (x: number) => x - MAP_MIN_X;
const sy = (y: number) => MAP_HEIGHT - (y - MAP_MIN_Y);

const TERRAIN_FILL: Record<TerrainKind, string> = {
  park: 'hsl(140 32% 76%)',
  woodland: 'hsl(150 30% 66%)',
  garden: 'hsl(96 34% 74%)',
  'dense-housing': 'hsl(35 28% 80%)',
  commercial: 'hsl(30 26% 75%)',
  industrial: 'hsl(210 12% 75%)',
  open: 'hsl(72 32% 84%)',
};

const BARRIER_STROKE: Record<string, string> = {
  'major-road': 'hsl(28 14% 58%)',
  rail: 'hsl(210 10% 55%)',
  creek: 'hsl(198 54% 62%)',
};

export function AreaPicker({
  area,
  onPick,
}: {
  /** The pin, if one has been dropped. */
  area?: Area;
  onPick: (area: Area) => void;
}) {
  const svg = useRef<SVGSVGElement | null>(null);

  function pickAt(event: PointerEvent<SVGSVGElement>) {
    const box = svg.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    const across = (event.clientX - box.left) / box.width;
    const down = (event.clientY - box.top) / box.height;
    onPick(snapArea({
      x: MAP_MIN_X + across * MAP_WIDTH,
      y: MAP_MIN_Y + (1 - down) * MAP_HEIGHT,
    }));
  }

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
    const from = area ?? { x: 0, y: 0 };
    onPick(snapArea({ x: from.x + step[0], y: from.y + step[1] }));
  }

  const label = area
    ? `Your spot: ${describeArea(area)}. Arrow keys move it fifty metres at a time.`
    : 'Tap the map to say roughly where you walk from. Arrow keys drop a pin too.';

  return (
    <div
      className="rounded-[1rem] border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary"
      tabIndex={0}
      role="group"
      aria-label={label}
      onKeyDown={nudge}
      data-testid="area-picker"
    >
      <svg
        ref={svg}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="block w-full h-auto cursor-crosshair touch-none"
        onPointerDown={pickAt}
        aria-hidden="true"
      >
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="hsl(60 30% 92%)" />

        {TERRAIN_ZONES.map((zone) => (
          <rect
            key={zone.id}
            x={sx(zone.x0)}
            y={sy(zone.y1)}
            width={zone.x1 - zone.x0}
            height={zone.y1 - zone.y0}
            rx="14"
            fill={TERRAIN_FILL[zone.kind]}
          />
        ))}

        {BARRIERS.map((barrier) => (
          <polyline
            key={barrier.id}
            points={barrier.path.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
            fill="none"
            stroke={BARRIER_STROKE[barrier.kind] ?? 'hsl(28 14% 58%)'}
            strokeWidth={barrier.kind === 'creek' ? 9 : 13}
            strokeLinecap="round"
            strokeDasharray={barrier.kind === 'rail' ? '18 12' : undefined}
            opacity="0.85"
          />
        ))}

        {LANDMARKS.map((landmark, i) => {
          // Labels alternate above and below the dot: two landmarks a couple
          // of hundred metres apart would otherwise print on top of each other.
          const above = i % 2 === 0;
          // And a label near the edge would run off the viewBox, so the anchor
          // point is kept a label's half-width inside it.
          const labelX = Math.min(1085, Math.max(115, sx(landmark.at.x)));
          return (
            <g key={landmark.id}>
              <circle cx={sx(landmark.at.x)} cy={sy(landmark.at.y)} r="7" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="3" />
              <text
                x={labelX}
                y={sy(landmark.at.y) + (above ? -15 : 29)}
                textAnchor="middle"
                fontSize="19"
                fontWeight="700"
                fill="hsl(var(--foreground))"
                opacity="0.72"
              >
                {landmark.name}
              </text>
            </g>
          );
        })}

        {!area && (
          <g>
            {/* A quiet plate, so the invitation does not land on top of a road. */}
            <rect x={MAP_WIDTH / 2 - 190} y={MAP_HEIGHT / 2 - 32} width="380" height="52" rx="26" fill="hsl(var(--card) / .82)" />
            <text x={MAP_WIDTH / 2} y={MAP_HEIGHT / 2 + 8} textAnchor="middle" fontSize="34" fontWeight="700" fill="hsl(var(--primary))" opacity="0.55">
              Tap to drop your pin
            </text>
          </g>
        )}

        {area && (
          <g>
            {/* The circle is the point: what is stored is an area this wide. */}
            <circle
              cx={sx(area.x)}
              cy={sy(area.y)}
              r={AREA_BLUR_METRES}
              fill="hsl(var(--primary) / .16)"
              stroke="hsl(var(--primary) / .55)"
              strokeWidth="3"
              strokeDasharray="10 8"
            />
            <circle cx={sx(area.x)} cy={sy(area.y)} r="13" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="4" />
          </g>
        )}
      </svg>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-3 py-2 bg-secondary/40 border-t border-border">
        <MapPin size={12} className="shrink-0" />
        {area ? describeArea(area) : 'Tap anywhere on the map'}
      </p>
    </div>
  );
}
