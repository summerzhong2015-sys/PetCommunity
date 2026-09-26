/**
 * What the sky is doing, right now.
 *
 * The app sits behind a soft scene that drifts through the day: peach at dawn,
 * open blue at midday, amber at golden hour, a dusty indigo at night. The point
 * is that a page you leave open does not look identical at nine in the evening
 * to how it looked at nine in the morning.
 *
 * Two rules hold every palette here honest:
 *
 *  - Nothing gets dark. The app's text stays the same near-black green at every
 *    hour, so a night sky that actually went dark would make the page header
 *    unreadable. Night is a dusty blue you could still read a book against.
 *  - Every phase interpolates into its neighbours, so the change is a drift
 *    rather than a jump at the top of an hour.
 */

export type Phase = 'night' | 'dawn' | 'morning' | 'midday' | 'golden' | 'dusk';

export type Scene = {
  phase: Phase;
  /** What to call this, in the corner of the scene. */
  label: string;
  /** Top of the sky gradient. */
  skyTop: string;
  /** Horizon colour. */
  skyLow: string;
  /** The glow around the sun or moon. */
  glow: string;
  /** Far hills. */
  hills: string;
  /** Near treeline and rooftops. */
  land: string;
  /** Sun by day, moon by night. */
  orb: string;
  /** 0 at noon, 1 in the dead of night — how much of the night dressing shows. */
  night: number;
};

type Keyframe = Scene & { hour: number };

/**
 * Anchored at the hours the light actually turns over. Between them everything
 * is mixed, so 6:30am is genuinely half dawn and half morning.
 */
const KEYFRAMES: Keyframe[] = [
  { hour: 0,  phase: 'night',   label: 'Small hours',  skyTop: '#C3C9DE', skyLow: '#DCD8DF', glow: '#EAE6EC', hills: '#A8AFC6', land: '#8E96B0', orb: '#F6F2E4', night: 1 },
  { hour: 4,  phase: 'night',   label: 'Small hours',  skyTop: '#C3C9DE', skyLow: '#DCD8DF', glow: '#EAE6EC', hills: '#A8AFC6', land: '#8E96B0', orb: '#F6F2E4', night: 1 },
  { hour: 5,  phase: 'dawn',    label: 'First light',  skyTop: '#C9C6DE', skyLow: '#F2D9C8', glow: '#FBE3CE', hills: '#B4AFC2', land: '#97949F', orb: '#FFE9C9', night: 0.55 },
  { hour: 7,  phase: 'dawn',    label: 'Sunrise',      skyTop: '#CBD9E6', skyLow: '#FBDFC4', glow: '#FCE8D0', hills: '#B8C6C8', land: '#9AA69C', orb: '#FFD79A', night: 0.15 },
  { hour: 9,  phase: 'morning', label: 'Morning',      skyTop: '#C8DCEA', skyLow: '#EFEADA', glow: '#FAF3E2', hills: '#B6CBC4', land: '#93AB93', orb: '#FDF0C8', night: 0 },
  { hour: 12, phase: 'midday',  label: 'Midday',       skyTop: '#BFDAF0', skyLow: '#EDF0E4', glow: '#FBF7E6', hills: '#AEC8BE', land: '#8AA98C', orb: '#FFF6D2', night: 0 },
  { hour: 16, phase: 'golden',  label: 'Afternoon',    skyTop: '#CBDCE8', skyLow: '#F4E7CF', glow: '#FCEED2', hills: '#B9C6B4', land: '#93A487', orb: '#FFE6AC', night: 0 },
  { hour: 18, phase: 'golden',  label: 'Golden hour',  skyTop: '#D6D2E0', skyLow: '#F8D9B4', glow: '#FBE0BB', hills: '#BBB4BC', land: '#9C9185', orb: '#FFC98A', night: 0.1 },
  { hour: 20, phase: 'dusk',    label: 'Dusk',         skyTop: '#C4C3DD', skyLow: '#EBD3CC', glow: '#F3DCD2', hills: '#AEADC4', land: '#928FA4', orb: '#FFD9AE', night: 0.5 },
  { hour: 22, phase: 'night',   label: 'Evening',      skyTop: '#C3C9DE', skyLow: '#DCD8DF', glow: '#EAE6EC', hills: '#A8AFC6', land: '#8E96B0', orb: '#F6F2E4', night: 0.9 },
  { hour: 24, phase: 'night',   label: 'Small hours',  skyTop: '#C3C9DE', skyLow: '#DCD8DF', glow: '#EAE6EC', hills: '#A8AFC6', land: '#8E96B0', orb: '#F6F2E4', night: 1 },
];

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function byte(hex: string, at: number): number {
  return Number.parseInt(hex.slice(at, at + 2), 16);
}

/** Mixes two #rrggbb colours. t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const channel = (at: number) => {
    const value = Math.round(byte(a, at) + (byte(b, at) - byte(a, at)) * k);
    return value.toString(16).padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** Smooth in and out, so a phase does not arrive at a constant speed. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Hours past midnight, fractional. */
export function hourOf(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/**
 * The scene for a moment, mixed from the two keyframes either side of it.
 * Never returns a keyframe verbatim unless the clock lands exactly on one.
 */
export function sceneAt(date: Date = new Date()): Scene {
  const hour = clamp01(hourOf(date) / 24) * 24;

  let lower = KEYFRAMES[0];
  let upper = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (hour >= KEYFRAMES[i].hour && hour <= KEYFRAMES[i + 1].hour) {
      lower = KEYFRAMES[i];
      upper = KEYFRAMES[i + 1];
      break;
    }
  }

  const span = upper.hour - lower.hour;
  const t = span === 0 ? 0 : ease(clamp01((hour - lower.hour) / span));
  // The name should change at the halfway point rather than drifting with the
  // colour, or "Midday" would linger until four in the afternoon.
  const near = t < 0.5 ? lower : upper;

  return {
    phase: near.phase,
    label: near.label,
    skyTop: mix(lower.skyTop, upper.skyTop, t),
    skyLow: mix(lower.skyLow, upper.skyLow, t),
    glow: mix(lower.glow, upper.glow, t),
    hills: mix(lower.hills, upper.hills, t),
    land: mix(lower.land, upper.land, t),
    orb: mix(lower.orb, upper.orb, t),
    night: lower.night + (upper.night - lower.night) * t,
  };
}

/**
 * Where the sun or moon sits, as fractions of the scene box.
 *
 * One arc across the width of the sky, highest around one in the afternoon and
 * dipping below the horizon overnight, so the orb is never pinned in a corner.
 */
export function orbPosition(date: Date = new Date()): { x: number; y: number } {
  const hour = hourOf(date);
  // Daylight runs 6 to 20; the rest of the clock runs the same arc for the moon.
  const daytime = hour >= 6 && hour < 20;
  const progress = daytime ? (hour - 6) / 14 : ((hour < 6 ? hour + 4 : hour - 20) % 10) / 10;
  return {
    x: 0.12 + progress * 0.76,
    y: 0.72 - Math.sin(progress * Math.PI) * 0.52,
  };
}

/** Is it dark enough to be worth showing stars? */
export function showsStars(scene: Scene): boolean {
  return scene.night > 0.35;
}
