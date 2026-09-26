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
  /**
   * The paper a card is printed on. Tinted towards the section rather than the
   * same cream everywhere — an opened panel is most of what you look at, and
   * nine sections that all open onto the same beige is the app going grey the
   * moment you engage with it.
   */
  card: string;
  /** The card's edge, a touch more saturated than the paper. */
  cardBorder: string;
  /** Quiet inner surfaces: nested panels, quoted notes, meter tracks. */
  muted: string;
  /**
   * The rail down the side. It stayed the same dark green in every section,
   * which is a third of the screen refusing to acknowledge where you are.
   * Dark enough for cream type in every case — checked, not assumed.
   */
  sidebar: string;
  /** Raised panels inside the rail: the profile card, the privacy note. */
  sidebarAccent: string;
  /** The ring on focus, kept in step with primary. */
  ring: string;
  /**
   * A second hue for the background wash, so the page is not one flat colour.
   * Chosen a little way round the wheel from the primary — far enough that the
   * gradient has somewhere to travel, close enough that it stays one mood.
   */
  wash: string;
};

const BASE: Omit<Theme, 'path' | 'name'> = {
  primary: '158 35% 29%',
  accent: '37 89% 67%',
  secondary: '36 40% 91%',
  tint: '42 32% 96%',
  card: '42 44% 99%',
  cardBorder: '36 25% 87%',
  muted: '39 28% 91%',
  sidebar: '158 29% 22%',
  sidebarAccent: '158 22% 29%',
  ring: '158 35% 29%',
  wash: '24',
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
    wash: '168',
    card: '200 52% 98%',
    cardBorder: '200 30% 89%',
    muted: '200 36% 94%',
    sidebar: '205 38% 21%',
    sidebarAccent: '205 30% 28%',
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
    wash: '52',
    card: '88 46% 98%',
    cardBorder: '92 26% 87%',
    muted: '88 30% 93%',
    sidebar: '116 30% 18%',
    sidebarAccent: '114 24% 25%',
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
    wash: '44',
    card: '30 62% 98%',
    cardBorder: '28 34% 88%',
    muted: '30 44% 94%',
    sidebar: '20 40% 19%',
    sidebarAccent: '20 30% 26%',
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
    wash: '28',
    card: '350 56% 98%',
    cardBorder: '350 30% 90%',
    muted: '350 40% 95%',
    sidebar: '348 34% 21%',
    sidebarAccent: '348 26% 28%',
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
    wash: '150',
    card: '40 62% 97%',
    cardBorder: '38 32% 87%',
    muted: '40 44% 93%',
    sidebar: '36 40% 17%',
    sidebarAccent: '36 30% 24%',
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
    wash: '250',
    card: '300 40% 98%',
    cardBorder: '300 22% 90%',
    muted: '300 28% 95%',
    sidebar: '302 26% 21%',
    sidebarAccent: '302 20% 28%',
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
    wash: '188',
    card: '220 44% 98%',
    cardBorder: '220 24% 90%',
    muted: '220 30% 95%',
    sidebar: '222 30% 22%',
    sidebarAccent: '222 24% 29%',
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
    wash: '212',
    card: '266 44% 98%',
    cardBorder: '266 24% 91%',
    muted: '266 30% 96%',
    sidebar: '262 26% 23%',
    sidebarAccent: '262 20% 30%',
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

/**
 * The page background: two soft pools of colour over the section's tint.
 *
 * Kept deliberately pale — everything here sits between 94% and 98% lightness —
 * because cards, headers and body text all sit on top of it and a background
 * with any real colour in it turns the whole page into a poster. The point is
 * that the eye registers a different room, not a different brand.
 */
export function backgroundFor(theme: Theme): string {
  const hue = theme.primary.split(' ')[0];
  return [
    `radial-gradient(1100px 620px at 8% -8%, hsl(${hue} 52% 89%) 0%, hsl(${hue} 52% 89% / 0) 62%)`,
    `radial-gradient(900px 680px at 96% 4%, hsl(${theme.wash} 56% 90%) 0%, hsl(${theme.wash} 56% 90% / 0) 58%)`,
    `radial-gradient(1000px 900px at 50% 108%, hsl(${theme.wash} 46% 91%) 0%, hsl(${theme.wash} 46% 91% / 0) 60%)`,
    `linear-gradient(180deg, hsl(${theme.tint}) 0%, hsl(${hue} 30% 95%) 100%)`,
  ].join(', ');
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
    '--card': theme.card,
    '--popover': theme.card,
    '--card-border': theme.cardBorder,
    '--popover-border': theme.cardBorder,
    '--border': theme.cardBorder,
    '--muted': theme.muted,
    '--sidebar': theme.sidebar,
    '--sidebar-accent': theme.sidebarAccent,
    '--sidebar-border': theme.sidebarAccent,
  };
}
