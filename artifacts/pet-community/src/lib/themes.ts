/**
 * A palette per section.
 *
 * Each tab keeps the same bones — the same cream paper, the same near-black
 * green type — and changes only the colours that carry meaning: the primary
 * that buttons and links are built from, the accent that highlights things,
 * the quiet secondary behind chips and message bubbles, and a faint wash over
 * the page. Walks go mossy and outdoors. Lost pets goes to a burnt amber that
 * reads as urgent without shouting. Give goes plum. Messages goes to a cool
 * slate you could read a long thread in.
 *
 * Values are HSL triples in the same `H S% L%` form the stylesheet uses, so a
 * theme can be handed straight to `style` as custom properties and the whole
 * token system re-points at it.
 *
 * The constraint that matters: the page's text colour never changes, and
 * `primary` and `accent` carry white and near-black text respectively. Every
 * palette here is checked against WCAG AA in `themes.test.ts` — a pretty
 * colour that fails contrast is a bug, not a preference.
 */

export type Theme = {
  /** Route prefix this applies to. */
  path: string;
  name: string;
  /** Buttons, links, active nav. Carries `--primary-foreground` (near-white). */
  primary: string;
  /** Highlights and the saved/going states. Carries near-black text. */
  accent: string;
  /** Chips, quiet buttons, message bubbles. */
  secondary: string;
  /** A faint wash over the page behind the cards. */
  tint: string;
  /** The ring on focus, kept in step with primary. */
  ring: string;
};

const BASE: Omit<Theme, 'path' | 'name'> = {
  primary: '158 35% 29%',
  accent: '37 89% 67%',
  secondary: '36 40% 91%',
  tint: '42 32% 96%',
  ring: '158 35% 29%',
};

/**
 * Ordered most specific first: `/lost-pets/l1` must match lost pets, not `/`.
 */
export const THEMES: Theme[] = [
  {
    path: '/nearby',
    name: 'Nearby',
    // Open sky blue — looking outward, across the neighbourhood.
    primary: '205 44% 31%',
    accent: '191 62% 70%',
    secondary: '200 34% 91%',
    tint: '200 40% 96%',
    ring: '205 44% 31%',
  },
  {
    path: '/walks',
    name: 'Walks',
    // Moss and trail dust.
    primary: '112 30% 26%',
    accent: '78 55% 66%',
    secondary: '90 26% 90%',
    tint: '84 32% 96%',
    ring: '112 30% 26%',
  },
  {
    path: '/lost-pets',
    name: 'Lost pets',
    // Burnt amber: urgent enough to register, not an emergency siren.
    primary: '19 52% 34%',
    accent: '32 92% 63%',
    secondary: '28 46% 90%',
    tint: '30 52% 96%',
    ring: '19 52% 34%',
  },
  {
    path: '/adopt',
    name: 'Adopt',
    // Deep rose. Adopt and Lost pets both want to be warm, but they must not be
    // mistaken for one another, so the warmth here goes pink and the alert
    // board keeps the rust.
    primary: '350 44% 37%',
    accent: '352 76% 78%',
    secondary: '350 40% 92%',
    tint: '350 46% 97%',
    ring: '350 44% 37%',
  },
  {
    path: '/shelters',
    name: 'Shelters',
    // Bronze and ochre — buildings, straw, the practical end of the app.
    primary: '40 48% 26%',
    accent: '43 82% 64%',
    secondary: '42 44% 90%',
    tint: '40 55% 95%',
    ring: '40 48% 26%',
  },
  {
    path: '/give',
    name: 'Give',
    // Plum, for the section about parting with something.
    primary: '300 26% 33%',
    accent: '292 52% 76%',
    secondary: '300 24% 92%',
    tint: '300 30% 97%',
    ring: '300 26% 33%',
  },
  {
    path: '/messages',
    name: 'Messages',
    // Cool slate — quiet, readable down a long thread.
    primary: '222 32% 33%',
    accent: '218 60% 75%',
    secondary: '220 28% 92%',
    tint: '220 32% 97%',
    ring: '222 32% 33%',
  },
  {
    path: '/profile',
    name: 'Profile',
    // Soft iris: personal, and distinct from every section around it.
    primary: '262 26% 36%',
    accent: '268 56% 76%',
    secondary: '265 26% 92%',
    tint: '268 34% 97%',
    ring: '262 26% 36%',
  },
  { path: '/', name: 'Neighborhood', ...BASE },
];

export const DEFAULT_THEME: Theme = THEMES[THEMES.length - 1];

/** The theme for a location. `/` matches only itself; everything else by prefix. */
export function themeFor(pathname: string): Theme {
  for (const theme of THEMES) {
    if (theme.path === '/') continue;
    if (pathname === theme.path || pathname.startsWith(`${theme.path}/`)) return theme;
  }
  return DEFAULT_THEME;
}

/** The theme as custom properties, ready to hand to `style`. */
export function themeVariables(theme: Theme): Record<string, string> {
  return {
    '--primary': theme.primary,
    '--accent': theme.accent,
    '--secondary': theme.secondary,
    '--ring': theme.ring,
    '--chart-1': theme.primary,
    '--chart-2': theme.accent,
    '--sidebar-primary': theme.accent,
    '--sidebar-ring': theme.accent,
  };
}
