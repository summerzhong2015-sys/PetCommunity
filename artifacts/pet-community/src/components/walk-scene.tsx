/**
 * A drawn scene for each walking route, in place of the striped placeholder.
 *
 * Every route gets a picture of the thing that makes it itself — the creek and
 * its boardwalk, the garden beds along the park circuit, the ridge you climb
 * for the view — and each one is lit by the same clock as the rest of the app,
 * so at nine in the evening the routes are moonlit too.
 */

import { useMemo } from 'react';
import { useTicker } from '@/components/page-bits';
import { mix, orbPosition, sceneAt, showsStars } from '@/lib/daylight';

export type SceneKind = 'creek' | 'park' | 'ridge';

const STARS = [
  { x: 9, y: 9 }, { x: 22, y: 5 }, { x: 34, y: 12 }, { x: 47, y: 6 },
  { x: 61, y: 13 }, { x: 74, y: 7 }, { x: 86, y: 14 }, { x: 95, y: 6 },
];

export function WalkScene({ kind, className = '' }: { kind: SceneKind; className?: string }) {
  const minute = useTicker(60000);
  const scene = useMemo(() => sceneAt(new Date()), [minute]);
  const orb = useMemo(() => orbPosition(new Date()), [minute]);
  const night = scene.night;

  // Greens drain towards the sky's own blue as the light goes.
  const foliage = mix('#6E9367', scene.hills, night * 0.62);
  const foliageDeep = mix('#4F7A55', scene.land, night * 0.58);
  const ground = mix('#A8BD8C', scene.land, night * 0.5);
  const groundWarm = mix('#C8CB96', scene.land, night * 0.5);
  const water = mix('#8FB8C6', scene.skyTop, 0.25 + night * 0.35);
  const path = mix('#E4D7B8', scene.skyLow, night * 0.45);
  const stone = mix('#B9AE9A', scene.land, night * 0.45);

  return (
    <svg
      viewBox="0 0 100 42"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={
        kind === 'creek'
          ? 'A creek running between trees, with a boardwalk crossing it'
          : kind === 'park'
            ? 'A park path past garden beds and a fountain'
            : 'A ridge climbing to a lookout above the rooftops'
      }
      data-testid={`walk-scene-${kind}`}
    >
      <defs>
        <linearGradient id={`ws-sky-${kind}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.skyTop} />
          <stop offset="100%" stopColor={scene.skyLow} />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="100" height="42" fill={`url(#ws-sky-${kind})`} style={{ transition: 'fill 6s linear' }} />

      {showsStars(scene) && (
        <g opacity={Math.min(1, (night - 0.35) / 0.4) * 0.9}>
          {STARS.map((s) => (
            <circle key={`${s.x}-${s.y}`} cx={s.x} cy={s.y} r="0.32" fill="#FFFDF4" />
          ))}
        </g>
      )}

      {/* The same sun or moon as the page behind it, on the same arc. The bite
          is masked out rather than painted, so the gradient shows through it. */}
      <defs>
        <mask id={`ws-orb-${kind}`}>
          <circle cx={12 + orb.x * 74} cy={2 + orb.y * 16} r="2.3" fill="#fff" />
          {night > 0.6 && <circle cx={12 + orb.x * 74 + 1.8} cy={2 + orb.y * 16 - 1.25} r="2" fill="#000" />}
        </mask>
      </defs>
      <circle cx={12 + orb.x * 74} cy={2 + orb.y * 16} r="2.3" fill={scene.orb} mask={`url(#ws-orb-${kind})`} />

      {kind === 'creek' && (
        <>
          {/* Far bank */}
          <path d="M0 24 C 14 20, 30 22, 46 20 C 62 18, 80 22, 100 19 L100 42 L0 42 Z" fill={foliage} opacity="0.65" />
          {/* The creek itself */}
          <path d="M0 33 C 18 29, 30 35, 48 32 C 66 29, 80 34, 100 30 L100 42 L0 42 Z" fill={water} />
          <path d="M8 34.6 h9 M26 33.4 h7 M44 34.2 h11 M66 33 h8 M82 34.4 h9" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="0.45" strokeLinecap="round" />
          {/* Near bank and path */}
          <path d="M0 37 C 20 34, 40 38, 62 35.5 C 80 33.5, 92 37, 100 35 L100 42 L0 42 Z" fill={ground} />
          {/* Boardwalk */}
          <g fill={path}>
            <rect x="30" y="30.4" width="30" height="1.5" rx="0.3" />
            {[31, 35, 39, 43, 47, 51, 55, 58].map((x) => (
              <rect key={x} x={x} y="31.7" width="0.8" height="2.4" rx="0.2" opacity="0.8" />
            ))}
          </g>
          {/* Willows */}
          {[
            { x: 12, h: 13 }, { x: 22, h: 9.5 }, { x: 74, h: 12 }, { x: 88, h: 10 },
          ].map((t) => (
            <g key={t.x}>
              <rect x={t.x - 0.4} y={26 - t.h} width="0.9" height={t.h + 2} fill={foliageDeep} opacity="0.85" />
              <ellipse cx={t.x} cy={26 - t.h} rx="5.2" ry="4.4" fill={foliage} />
              <ellipse cx={t.x - 1.8} cy={26 - t.h + 2.2} rx="3.6" ry="3" fill={foliageDeep} opacity="0.55" />
            </g>
          ))}
          {/* A dog, mid-splash */}
          <g fill={foliageDeep} opacity="0.9">
            <ellipse cx="68" cy="33.6" rx="2" ry="1.1" />
            <circle cx="70" cy="32.5" r="1" />
            <path d="M70.6 31.8 l1.1 -1.2 l0.3 1.4 Z" />
          </g>
        </>
      )}

      {kind === 'park' && (
        <>
          <path d="M0 25 C 16 23, 34 26, 52 24 C 70 22, 86 25, 100 23 L100 42 L0 42 Z" fill={foliage} opacity="0.55" />
          <path d="M0 30 C 24 28, 48 31, 72 29 C 86 28, 94 30, 100 29 L100 42 L0 42 Z" fill={groundWarm} />
          {/* The circuit, curving away */}
          <path d="M-2 41 C 22 36, 34 34, 52 33 C 70 32, 84 33, 102 31" stroke={path} strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Garden beds */}
          {[
            { x: 14, c: '#D98E8E' }, { x: 26, c: '#E3C06A' }, { x: 62, c: '#C98BB4' }, { x: 76, c: '#E0A86A' },
          ].map((bed) => (
            <g key={bed.x}>
              <rect x={bed.x - 4} y="30.5" width="8" height="2" rx="0.6" fill={stone} />
              {[0, 1, 2, 3].map((i) => (
                <circle key={i} cx={bed.x - 3 + i * 2} cy="30" r="0.85" fill={mix(bed.c, scene.land, night * 0.55)} />
              ))}
            </g>
          ))}
          {/* Fountain */}
          <g>
            <ellipse cx="46" cy="30.6" rx="4.2" ry="1.4" fill={water} />
            <rect x="45.4" y="26.5" width="1.2" height="4" rx="0.4" fill={stone} />
            <ellipse cx="46" cy="26.3" rx="2.4" ry="0.8" fill={water} opacity="0.85" />
          </g>
          {/* Maples */}
          {[{ x: 8, h: 11 }, { x: 36, h: 8.5 }, { x: 90, h: 12 }].map((t) => (
            <g key={t.x}>
              <rect x={t.x - 0.5} y={28 - t.h} width="1.1" height={t.h + 1.5} fill={foliageDeep} opacity="0.85" />
              <circle cx={t.x} cy={28 - t.h} r="4.8" fill={foliage} />
              <circle cx={t.x + 2.4} cy={28 - t.h + 1.6} r="3.2" fill={foliageDeep} opacity="0.5" />
            </g>
          ))}
          {/* Two neighbours and a small dog */}
          <g fill={foliageDeep} opacity="0.85">
            <rect x="55" y="28.4" width="1.1" height="3.4" rx="0.5" />
            <circle cx="55.55" cy="27.7" r="0.85" />
            <rect x="58" y="28.4" width="1.1" height="3.4" rx="0.5" />
            <circle cx="58.55" cy="27.7" r="0.85" />
            <ellipse cx="61" cy="31.2" rx="1.4" ry="0.8" />
            <circle cx="62.2" cy="30.5" r="0.7" />
          </g>
        </>
      )}

      {kind === 'ridge' && (
        <>
          {/* Layered hills, the furthest palest */}
          <path d="M0 27 L20 17 L34 25 L48 14 L66 26 L82 20 L100 28 L100 42 L0 42 Z" fill={scene.hills} opacity="0.55" />
          <path d="M0 32 L16 24 L30 31 L46 21 L62 30 L78 25 L100 33 L100 42 L0 42 Z" fill={foliage} opacity="0.75" />
          {/* The trail switchbacking up */}
          <path d="M6 41 C 20 38, 16 34, 30 32 C 42 30.5, 38 27, 47 24.5" stroke={path} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeDasharray="3 1.6" />
          {/* Scree near the top */}
          <g fill={stone} opacity="0.7">
            {[[44, 26], [46, 27.4], [48.6, 25.8], [50.5, 27], [43, 28.4], [51.5, 25]].map(([x, y]) => (
              <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="0.9" ry="0.5" />
            ))}
          </g>
          {/* The lookout bench */}
          <g fill={foliageDeep} opacity="0.9">
            <rect x="50" y="20.2" width="5" height="0.7" rx="0.3" />
            <rect x="50.4" y="20.9" width="0.6" height="1.4" />
            <rect x="54" y="20.9" width="0.6" height="1.4" />
          </g>
          {/* Rooftops far below */}
          <g fill={scene.land} opacity="0.5">
            <path d="M62 34 l3 -2.2 l3 2.2 v3 h-6 Z M72 35 l2.6 -1.9 l2.6 1.9 v2.4 h-5.2 Z M82 34.4 l3.2 -2.4 l3.2 2.4 v3.2 h-6.4 Z" />
          </g>
          {/* Near foreground */}
          <path d="M0 38 C 18 35.5, 34 38.5, 54 36.5 C 74 34.5, 88 38, 100 36.5 L100 42 L0 42 Z" fill={ground} />
          {/* A walker on the climb */}
          <g fill={foliageDeep} opacity="0.9">
            <rect x="30" y="29.2" width="1" height="3" rx="0.45" />
            <circle cx="30.5" cy="28.5" r="0.8" />
            <ellipse cx="33" cy="31.6" rx="1.5" ry="0.85" />
            <circle cx="34.3" cy="30.9" r="0.72" />
          </g>
        </>
      )}
    </svg>
  );
}
