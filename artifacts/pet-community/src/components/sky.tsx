/**
 * The scene behind the app.
 *
 * A soft, wide band across the top of every page that follows the real clock:
 * a sun that climbs and sets, hills and rooftops catching the light, clouds
 * that drift, and after dark a moon, stars and a few lit windows. It re-reads
 * the time every minute and the colours cross-fade over several seconds, so
 * nothing snaps — you notice it changed rather than watching it change.
 *
 * It is decoration, so it is aria-hidden and it never touches the text colours.
 * The palettes in `daylight.ts` stay light at every hour for exactly that
 * reason: the header sits on top of this.
 */

import { useMemo } from 'react';
import { useTicker } from '@/components/page-bits';
import { orbPosition, sceneAt, showsStars } from '@/lib/daylight';

/** Fixed positions, so stars do not dance around on every render. */
const STARS = [
  { x: 6, y: 18, r: 1.5, delay: 0 },
  { x: 14, y: 34, r: 1, delay: 1.7 },
  { x: 23, y: 12, r: 1.2, delay: 3.1 },
  { x: 31, y: 40, r: 0.9, delay: 0.8 },
  { x: 39, y: 22, r: 1.4, delay: 2.4 },
  { x: 47, y: 9, r: 1, delay: 4.2 },
  { x: 56, y: 31, r: 1.2, delay: 1.1 },
  { x: 64, y: 16, r: 0.9, delay: 3.6 },
  { x: 72, y: 37, r: 1.3, delay: 2.0 },
  { x: 80, y: 21, r: 1, delay: 0.4 },
  { x: 88, y: 12, r: 1.4, delay: 2.9 },
  { x: 95, y: 33, r: 0.9, delay: 1.4 },
];

/** Windows along the rooftop line that light up after dark. */
const WINDOWS = [
  { x: 9.6, y: 21.4 },
  { x: 12.2, y: 21.4 },
  { x: 28.6, y: 20.8 },
  { x: 45.4, y: 21.6 },
  { x: 62.4, y: 21.1 },
  { x: 65, y: 21.1 },
  { x: 79, y: 22 },
  { x: 96.4, y: 21 },
];

export function Sky() {
  // One read a minute is plenty for something that takes an hour to change.
  const minute = useTicker(60000);
  const scene = useMemo(() => sceneAt(new Date()), [minute]);
  const orb = useMemo(() => orbPosition(new Date()), [minute]);
  const stars = showsStars(scene);
  const night = scene.night;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[230px] md:h-[260px] overflow-hidden select-none"
      data-testid="scene-sky"
      data-phase={scene.phase}
    >
      <svg
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="sky-air" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={scene.skyTop} />
            <stop offset="58%" stopColor={scene.skyLow} />
            <stop offset="100%" stopColor={scene.skyLow} />
          </linearGradient>
          <radialGradient id="sky-glow" cx={`${orb.x * 100}%`} cy={`${orb.y * 60}%`} r="30%">
            <stop offset="0%" stopColor={scene.glow} stopOpacity="0.65" />
            <stop offset="100%" stopColor={scene.glow} stopOpacity="0" />
          </radialGradient>
          {/* Fades the foot of the scene into the page, so there is no hard edge. */}
          <linearGradient id="sky-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="68%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </linearGradient>
          <mask id="sky-softness">
            <rect x="0" y="0" width="100" height="30" fill="url(#sky-fade)" />
          </mask>
          {/* A moon is a hole, not a disc painted in the sky colour: the sky is a
              gradient, so a painted bite only matches at one height and reads as
              a blob at every other hour. */}
          <mask id="sky-orb">
            <circle cx={orb.x * 100} cy={2 + orb.y * 17} r="1.9" fill="#fff" />
            {night > 0.6 && <circle cx={orb.x * 100 + 1.5} cy={2 + orb.y * 17 - 1} r="1.65" fill="#000" />}
          </mask>
        </defs>

        {/* Everything inside the mask, so the whole band dissolves into the page
            rather than ending on a ruled line across the top of the content. */}
        <g mask="url(#sky-softness)">
        <rect x="0" y="0" width="100" height="30" fill="url(#sky-air)" style={{ transition: 'fill 6s linear' }} />
        <rect x="0" y="0" width="100" height="30" fill="url(#sky-glow)" />

        {stars && (
          <g opacity={Math.min(1, (night - 0.35) / 0.4)}>
            {STARS.map((star) => (
              <circle
                key={`${star.x}-${star.y}`}
                cx={star.x}
                cy={1 + star.y * 0.22}
                r={star.r * 0.2}
                fill="#FFFDF4"
                className="sky-twinkle"
                style={{ animationDelay: `${star.delay}s` }}
              />
            ))}
          </g>
        )}

        <circle
          cx={orb.x * 100}
          cy={2 + orb.y * 17}
          r="1.9"
          fill={scene.orb}
          mask="url(#sky-orb)"
          style={{ transition: 'fill 6s linear' }}
        />

        {/* Clouds. Slow enough that you only notice they moved. */}
        <g opacity={0.46 - night * 0.26} fill="#FFFFFF">
          <g className="sky-drift-slow">
            <ellipse cx="20" cy="7" rx="7.5" ry="1.5" />
            <ellipse cx="25" cy="6.2" rx="5" ry="1.2" />
            <ellipse cx="72" cy="4.6" rx="6.5" ry="1.3" />
          </g>
          <g className="sky-drift-slower" opacity="0.7">
            <ellipse cx="48" cy="10.5" rx="9" ry="1.7" />
            <ellipse cx="54" cy="9.8" rx="5.5" ry="1.3" />
            <ellipse cx="92" cy="12" rx="7" ry="1.5" />
          </g>
        </g>

        <g>
          {/* Far hills. */}
          <path
            d="M0 20 C 9 14.5, 18 14, 27 17.5 C 35 20.5, 42 15, 51 16 C 61 17, 67 13, 76 16.5 C 85 20, 92 16.5, 100 18 L100 30 L0 30 Z"
            fill={scene.hills}
            opacity="0.55"
            style={{ transition: 'fill 6s linear' }}
          />
          {/* The street you live on: rooftops, chimneys, and a treeline behind. */}
          <g style={{ transition: 'fill 6s linear' }} fill={scene.land}>
            <g opacity="0.45">
              {[5, 14, 30, 44, 58, 69, 83, 95].map((x, i) => (
                <ellipse key={x} cx={x} cy={21.5 - (i % 3) * 0.7} rx={4 + (i % 3)} ry={3.4 + (i % 2) * 0.8} />
              ))}
            </g>
            <path
              opacity="0.9"
              d="M0 26 L0 23.5 L7 23.5 L7 21 L11 18.6 L15 21 L15 23.5 L18 23.5 L18 22 L21 22 L21 23.5 L26 23.5 L26 20.5 L30 18 L34 20.5 L34 23.5 L40 23.5 L40 21.5 L44 19 L48 21.5 L48 23.5 L52 23.5 L52 22.2 L55 22.2 L55 23.5 L60 23.5 L60 20.8 L64 18.3 L68 20.8 L68 23.5 L74 23.5 L74 21.8 L78 19.2 L82 21.8 L82 23.5 L87 23.5 L87 22.4 L90 22.4 L90 23.5 L95 23.5 L95 20.6 L99 18.2 L100 19 L100 30 L0 30 Z"
            />
            {/* Chimneys, because a roofline without them reads as a bar chart. */}
            <g opacity="0.9">
              <rect x="12.4" y="17.4" width="0.9" height="2.2" />
              <rect x="31.6" y="16.9" width="0.9" height="2.2" />
              <rect x="65.6" y="17.2" width="0.9" height="2.2" />
              <rect x="79.6" y="18.1" width="0.9" height="2.2" />
            </g>
          </g>
        </g>

        {/* Lit windows, once the sun is down. */}
        {night > 0.45 && (
          <g opacity={Math.min(1, (night - 0.45) / 0.3) * 0.9}>
            {WINDOWS.map((w) => (
              <rect key={`${w.x}-${w.y}`} x={w.x} y={w.y} width="0.85" height="1.1" rx="0.2" fill="#FFE2A8" />
            ))}
          </g>
        )}
        </g>
      </svg>

      {/* What time of day it is, quietly, for anyone who looks. */}
      <span
        className="absolute top-3 right-4 md:top-4 md:right-6 mono text-[10px] uppercase tracking-[.16em] text-foreground/45"
        data-testid="scene-label"
      >
        {scene.label}
      </span>
    </div>
  );
}
