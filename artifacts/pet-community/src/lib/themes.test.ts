/**
 * Tests for the per-section palettes.
 *
 * The failure mode here is not ugliness, it is unreadability: the app's text
 * colours are fixed in the stylesheet, so a section palette that drifts too
 * light puts white text on a pale button and nobody notices until a screenshot
 * arrives. Every palette is measured against WCAG here, against the exact
 * foreground colours the stylesheet pairs with it.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:themes
 */

import { DEFAULT_THEME, THEMES, backgroundFor, themeFor, themeVariables, type Theme } from './themes.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

// --- colour maths ---------------------------------------------------------
function hslToRgb(triple: string): [number, number, number] {
  const [h, s, l] = triple.split(/\s+/).map((part) => Number.parseFloat(part));
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ][seg];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function relativeLuminance(triple: string): number {
  const channel = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hslToRgb(triple);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// The fixed colours from index.css that these palettes are placed against.
const FOREGROUND = '157 25% 19%';
const PRIMARY_FOREGROUND = '42 36% 97%';
const ACCENT_FOREGROUND = '157 28% 16%';
const SECONDARY_FOREGROUND = '157 25% 19%';
const MUTED_FOREGROUND = '157 14% 39%';


// --- sanity on the maths itself -------------------------------------------
{
  check('white on black is the maximum contrast',
    Math.abs(contrast('0 0% 100%', '0 0% 0%') - 21) < 0.1, contrast('0 0% 100%', '0 0% 0%').toFixed(2));
  check('a colour against itself has no contrast',
    Math.abs(contrast('158 35% 29%', '158 35% 29%') - 1) < 0.001);
}

// --- every palette ---------------------------------------------------------
for (const theme of THEMES) {
  const label = theme.name;

  for (const [field, value] of Object.entries(theme)) {
    if (field === 'path' || field === 'name' || field === 'wash') continue;
    check(`${label}: ${field} is a valid HSL triple`,
      /^\d{1,3} \d{1,3}% \d{1,3}%$/.test(value as string), value as string);
  }

  // Buttons: near-white text on primary. AA for normal text is 4.5.
  const onPrimary = contrast(theme.primary, PRIMARY_FOREGROUND);
  check(`${label}: button text is readable on primary`, onPrimary >= 4.5, onPrimary.toFixed(2));

  // Accent carries near-black text.
  const onAccent = contrast(theme.accent, ACCENT_FOREGROUND);
  check(`${label}: text is readable on accent`, onAccent >= 4.5, onAccent.toFixed(2));

  // Chips and quiet buttons.
  const onSecondary = contrast(theme.secondary, SECONDARY_FOREGROUND);
  check(`${label}: text is readable on secondary`, onSecondary >= 4.5, onSecondary.toFixed(2));

  // Page text sits straight on the tint in headers.
  const onTint = contrast(theme.tint, FOREGROUND);
  check(`${label}: page text is readable on the tint`, onTint >= 7, onTint.toFixed(2));

  // Primary is also used as a text colour on cards, for links and figures.
  const primaryAsText = contrast(theme.primary, theme.card);
  check(`${label}: primary works as link text on a card`, primaryAsText >= 4.5, primaryAsText.toFixed(2));

  // The tint must stay a wash, not a colour: cards have to sit on top of it.
  const tintAgainstCard = contrast(theme.tint, theme.card);
  check(`${label}: cards still read as raised off the page`, tintAgainstCard < 1.35, tintAgainstCard.toFixed(3));

  check(`${label}: the ring follows the primary`, theme.ring === theme.primary);
}

// --- card surfaces --------------------------------------------------------
for (const theme of THEMES) {
  const label = theme.name;

  // Body text and headings sit straight on the card. This is the single most
  // read surface in the app, so it gets the strictest bar.
  const bodyOnCard = contrast(theme.card, FOREGROUND);
  check(`${label}: body text is easy on the card`, bodyOnCard >= 10, bodyOnCard.toFixed(2));

  const mutedOnCard = contrast(theme.card, MUTED_FOREGROUND);
  check(`${label}: secondary text still clears AA on the card`, mutedOnCard >= 4.5, mutedOnCard.toFixed(2));

  // The card must read as paper, not as a coloured panel.
  check(`${label}: the card is still nearly white`,
    Number.parseInt(theme.card.split(' ')[2], 10) >= 96, theme.card);

  // But not so pale it is the same cream in every section.
  check(`${label}: the card actually carries the section`,
    theme.name === 'Neighborhood' || Number.parseInt(theme.card.split(' ')[1], 10) >= 30, theme.card);

  // A card has to be visible against the page behind it.
  const cardOffPage = contrast(theme.card, theme.tint);
  check(`${label}: the card lifts off the page`, cardOffPage > 1.01 && cardOffPage < 1.3, cardOffPage.toFixed(3));

  // The border has to be findable without being a line drawing.
  const borderOnCard = contrast(theme.cardBorder, theme.card);
  check(`${label}: the card edge is visible but quiet`,
    borderOnCard > 1.15 && borderOnCard < 2.2, borderOnCard.toFixed(2));

  // Nested quiet surfaces still carry text.
  const onMuted = contrast(theme.muted, FOREGROUND);
  check(`${label}: text is readable on a nested panel`, onMuted >= 7, onMuted.toFixed(2));

  check(`${label}: card, border and muted are all valid triples`,
    [theme.card, theme.cardBorder, theme.muted].every((v) => /^\d{1,3} \d{1,3}% \d{1,3}%$/.test(v)));
}

{
  const cards = THEMES.map((t) => t.card);
  check('no two sections print on the same paper', new Set(cards).size === cards.length,
    cards.filter((c, i) => cards.indexOf(c) !== i).join(' | '));
}

// --- the background wash ---------------------------------------------------
for (const theme of THEMES) {
  const label = theme.name;
  check(`${label}: the wash hue is a number on the wheel`,
    /^\d{1,3}$/.test(theme.wash) && Number(theme.wash) <= 360, theme.wash);

  const css = backgroundFor(theme);
  check(`${label}: the background is layered, not flat`, css.split('radial-gradient').length - 1 >= 3);
  check(`${label}: it ends on the section tint`, css.includes(`hsl(${theme.tint})`));
  check(`${label}: it only uses this section's hues`, (() => {
    const hues = [...css.matchAll(/hsl\((\d{1,3})[ )]/g)].map((m) => m[1]);
    const allowed = new Set([theme.primary.split(' ')[0], theme.wash, theme.tint.split(' ')[0]]);
    return hues.every((h) => allowed.has(h));
  })(), css.slice(0, 60));

  // Everything in the wash has to stay pale enough to put text and cards over.
  // Match the lightness inside hsl(), not the gradient stop positions after it.
  const lightnesses = [...css.matchAll(/hsl\(\d{1,3} \d{1,3}% (\d{1,3})%/g)].map((m) => Number(m[1]));
  check(`${label}: nothing in the wash is dark enough to fight the text`,
    lightnesses.every((l) => l >= 93), `${Math.min(...lightnesses)}%`);

  check(`${label}: the wash hue is far enough from the primary to be visible`,
    (() => {
      const a = Number(theme.primary.split(' ')[0]), b = Number(theme.wash);
      const d = Math.abs(a - b);
      return Math.min(d, 360 - d) >= 10;
    })(), `${theme.primary.split(' ')[0]} vs ${theme.wash}`);
}

{
  const washes = THEMES.map((t) => backgroundFor(t));
  check('every section gets a different background', new Set(washes).size === washes.length);
}

// --- the palettes are actually different ----------------------------------
{
  const primaries = THEMES.map((t) => t.primary);
  check('no two sections share a primary', new Set(primaries).size === primaries.length);

  const hue = (t: Theme) => Number.parseFloat(t.primary.split(' ')[0]);
  const sorted = [...THEMES].sort((a, b) => hue(a) - hue(b));
  let closest = 360;
  for (let i = 1; i < sorted.length; i++) closest = Math.min(closest, hue(sorted[i]) - hue(sorted[i - 1]));
  // Adopt and Shelters were 5 degrees apart and rendered as the same brown.
  check('neighbouring sections are far enough apart in hue to tell apart', closest >= 15, `${closest}`);
}

// --- routing ---------------------------------------------------------------
{
  check('home gets the base palette', themeFor('/').name === 'Neighborhood');
  check('an unknown page falls back to the base', themeFor('/nowhere').name === 'Neighborhood');
  check('walks matches', themeFor('/walks').name === 'Walks');
  check('adopt matches', themeFor('/adopt').name === 'Adopt');
  check('give matches', themeFor('/give').name === 'Give');
  check('messages matches', themeFor('/messages').name === 'Messages');
  check('profile matches', themeFor('/profile').name === 'Profile');

  // The one that would go wrong: a nested route.
  check('a search map keeps the lost-pets palette', themeFor('/lost-pets/l1').name === 'Lost pets');
  check('the lost-pets board itself matches', themeFor('/lost-pets').name === 'Lost pets');

  // And the one that would go wrong the other way: a prefix that is not a segment.
  check('a lookalike path does not steal a palette', themeFor('/adoption-records').name === 'Neighborhood');
  check('shelters is its own palette, not adopt', themeFor('/shelters').name === 'Shelters');
  check('the default is home', DEFAULT_THEME.name === 'Neighborhood');
}

// --- what gets handed to the DOM ------------------------------------------
{
  const vars = themeVariables(THEMES[0]);
  check('every key is a custom property', Object.keys(vars).every((k) => k.startsWith('--')));
  check('primary is re-pointed', vars['--primary'] === THEMES[0].primary);
  check('accent is re-pointed', vars['--accent'] === THEMES[0].accent);
  check('the focus ring follows', vars['--ring'] === THEMES[0].ring);
  check('the sidebar highlight follows the accent', vars['--sidebar-primary'] === THEMES[0].accent);
  check('nothing overrides the page text colour', !('--foreground' in vars));
  check('nothing overrides the card text colour', !('--card-foreground' in vars));
  check('nothing overrides the page base colour', !('--background' in vars));
  // The paper itself is themed on purpose; the ink on it is not.
  check('the card paper is themed', vars['--card'] === THEMES[0].card);
  check('popovers use the same paper as cards', vars['--popover'] === vars['--card']);
  check('borders follow the card edge', vars['--border'] === THEMES[0].cardBorder);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
