/**
 * The data half of a pet portrait: the vocabulary of coats, markings, ears and
 * expressions, with no JSX, so plain modules and tests can use it too. The
 * drawing lives in components/pet-portrait.tsx, which re-exports all of this.
 */

export type Coat = {
  /** Main coat colour. */
  base: string;
  /** Shadow tone, used for ears, muzzle and depth. */
  shade: string;
  /** Markings — patches, stripes, bib. */
  accent: string;
  /** Backdrop behind the portrait. */
  bg: string;
};

export type Marking = 'solid' | 'tabby' | 'patch' | 'tuxedo' | 'mask' | 'freckled';
export type Ears = 'floppy' | 'perky' | 'folded';
export type Mood = 'bright' | 'gentle' | 'sleepy' | 'wary';

export type PortraitSpec = {
  species: 'dog' | 'cat';
  coat: Coat;
  marking: Marking;
  ears: Ears;
  mood: Mood;
};

/** Ready-made coats, so someone filing a report can pick a likeness in seconds. */
export const COAT_PRESETS: { id: string; name: string; coat: Coat }[] = [
  { id: 'golden', name: 'Golden', coat: { base: '#DFAE68', shade: '#B88742', accent: '#F5E8D0', bg: '#F8EEDB' } },
  { id: 'tan', name: 'Tan & white', coat: { base: '#E4D2B4', shade: '#B58F5E', accent: '#8A5A33', bg: '#F6EBD7' } },
  { id: 'ginger', name: 'Ginger', coat: { base: '#E3975C', shade: '#B97440', accent: '#A25A2A', bg: '#FAE9D5' } },
  { id: 'brown', name: 'Brown', coat: { base: '#8C5F3F', shade: '#6B462C', accent: '#EFE1CD', bg: '#F0E1D1' } },
  { id: 'black', name: 'Black', coat: { base: '#4A4441', shade: '#322D2B', accent: '#F2EDE4', bg: '#E6E3DE' } },
  { id: 'grey', name: 'Grey', coat: { base: '#9AA3A6', shade: '#737C80', accent: '#5C6468', bg: '#E8ECEC' } },
  { id: 'cream', name: 'Cream', coat: { base: '#F0E5D5', shade: '#D6C7B2', accent: '#C97B3C', bg: '#F8F0E3' } },
  { id: 'blue', name: 'Blue-grey', coat: { base: '#6E7A82', shade: '#4E585F', accent: '#F1EDE6', bg: '#E4EAEE' } },
];

export const MARKING_OPTIONS: { value: Marking; label: string }[] = [
  { value: 'solid', label: 'One colour' },
  { value: 'patch', label: 'Patches' },
  { value: 'tabby', label: 'Stripes' },
  { value: 'tuxedo', label: 'White chest' },
  { value: 'mask', label: 'Dark face' },
  { value: 'freckled', label: 'Speckled' },
];

export const EAR_OPTIONS: { value: Ears; label: string }[] = [
  { value: 'floppy', label: 'Floppy' },
  { value: 'perky', label: 'Upright' },
  { value: 'folded', label: 'Folded' },
];

export const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'bright', label: 'Bright' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'sleepy', label: 'Sleepy' },
  { value: 'wary', label: 'Wary' },
];

export const DEFAULT_PORTRAIT: PortraitSpec = {
  species: 'dog',
  coat: COAT_PRESETS[0].coat,
  marking: 'solid',
  ears: 'floppy',
  mood: 'bright',
};
