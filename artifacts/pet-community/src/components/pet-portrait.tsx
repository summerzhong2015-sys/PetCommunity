/**
 * Illustrated portraits for adoptable pets, drawn from a small spec rather than
 * photographed. Every pet gets a real likeness — coat colour, markings, ear set
 * and expression — in the same flat, rounded style as the app's avatars, so a
 * shelter listing looks like a portrait instead of a placeholder box.
 */

import { useId } from 'react';

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

const DOG_HEAD =
  'M46 70C38 55 42 37 54 38C65 39 70 52 73 61C77 59 83 59 87 61C90 52 95 39 106 38C118 37 122 55 114 70C127 79 131 97 125 111C118 127 100 134 80 134C60 134 42 127 35 111C29 97 33 79 46 70Z';

const CAT_HEAD =
  'M80 36C110 36 130 58 130 86C130 114 108 134 80 134C52 134 30 114 30 86C30 58 50 36 80 36Z';

/**
 * Upright-eared dogs get a plain round skull with separate ear shapes on top.
 * The ear bumps built into DOG_HEAD are too tall and narrow to read as a dog's
 * once they are not covered by a drop ear.
 */
const DOG_HEAD_ROUND =
  'M80 40C109 40 128 61 128 87C128 113 107 134 80 134C53 134 32 113 32 87C32 61 51 40 80 40Z';

export function PetPortrait({
  spec,
  className = '',
  rounded = 44,
}: {
  spec: PortraitSpec;
  className?: string;
  rounded?: number;
}) {
  const id = useId();
  const clip = `clip-${id}`;
  const perkyDog = spec.species === 'dog' && spec.ears === 'perky';
  const head = spec.species === 'cat' ? CAT_HEAD : perkyDog ? DOG_HEAD_ROUND : DOG_HEAD;
  const eyes = eyeGeometry(spec.mood);

  return (
    <svg
      viewBox="0 0 160 160"
      className={className}
      role="img"
      aria-label={`Illustrated portrait of a ${spec.marking === 'solid' ? '' : `${spec.marking} `}${spec.species}`}
    >
      <defs>
        <clipPath id={clip}>
          <path d={head} />
        </clipPath>
      </defs>

      <rect width="160" height="160" rx={rounded} fill={spec.coat.bg} />

      {/* Ears sit behind the head for cats, and are part of the silhouette for dogs. */}
      {spec.species === 'cat' && (
        <>
          <path d="M38 64L30 26L66 46Z" fill={spec.coat.base} />
          <path d="M122 64L130 26L94 46Z" fill={spec.coat.base} />
          <path d="M42 58L37 36L59 48Z" fill={spec.coat.accent} opacity="0.75" />
          <path d="M118 58L123 36L101 48Z" fill={spec.coat.accent} opacity="0.75" />
        </>
      )}

      {perkyDog && (
        <>
          <path d="M36 82C30 56 38 30 52 33C63 36 70 56 72 74Z" fill={spec.coat.base} />
          <path d="M124 82C130 56 122 30 108 33C97 36 90 56 88 74Z" fill={spec.coat.base} />
          <path d="M46 74C42 56 47 40 55 42C62 44 65 58 66 70Z" fill={spec.coat.shade} />
          <path d="M114 74C118 56 113 40 105 42C98 44 95 58 94 70Z" fill={spec.coat.shade} />
        </>
      )}

      <path d={head} fill={spec.coat.base} />

      <g clipPath={`url(#${clip})`}>
        <Markings spec={spec} />
      </g>

      {spec.species === 'dog' && <DogEars spec={spec} />}

      {/* Eyes */}
      <g>
        <ellipse cx="63" cy={eyes.cy} rx={eyes.rx} ry={eyes.ry} fill="#22302B" />
        <ellipse cx="97" cy={eyes.cy} rx={eyes.rx} ry={eyes.ry} fill="#22302B" />
        {spec.mood !== 'sleepy' && (
          <>
            <circle cx="65" cy={eyes.cy - 2} r="1.8" fill="#FFFFFF" opacity="0.9" />
            <circle cx="99" cy={eyes.cy - 2} r="1.8" fill="#FFFFFF" opacity="0.9" />
          </>
        )}
        {spec.mood === 'wary' && (
          <>
            <path d="M55 74C59 71 66 71 70 73" stroke="#22302B" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M105 74C101 71 94 71 90 73" stroke="#22302B" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          </>
        )}
      </g>

      {/* Muzzle */}
      {spec.species === 'dog' ? (
        <>
          <ellipse cx="80" cy="106" rx="21" ry="15" fill={spec.marking === 'tuxedo' ? spec.coat.accent : spec.coat.shade} opacity="0.55" />
          <path d="M75 99C77 96 83 96 85 99C85 103 80 105 80 105C80 105 75 103 75 99Z" fill="#3E2B28" />
          <path d="M80 105V110M80 110C77 114 71 114 69 111M80 110C83 114 89 114 91 111" stroke="#3E2B28" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M76 96H84L80 101Z" fill="#C4726F" />
          <path d="M80 101V105M80 105C77 109 72 109 70 106M80 105C83 109 88 109 90 106" stroke="#3E2B28" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M34 92L54 96M34 104L54 101M126 92L106 96M126 104L106 101" stroke="#3E2B28" strokeWidth="1.7" strokeLinecap="round" opacity="0.42" />
        </>
      )}
    </svg>
  );
}

function DogEars({ spec }: { spec: PortraitSpec }) {
  // Upright ears are drawn behind the head as part of the silhouette, not here.
  if (spec.ears === 'perky') return null;
  if (spec.ears === 'folded') {
    return (
      <>
        <path d="M40 62C32 64 28 76 34 86C39 94 48 94 52 88" fill={spec.coat.shade} />
        <path d="M120 62C128 64 132 76 126 86C121 94 112 94 108 88" fill={spec.coat.shade} />
      </>
    );
  }
  return (
    <>
      <path d="M42 60C30 66 26 88 34 102C40 112 50 112 54 104C48 90 44 74 42 60Z" fill={spec.coat.shade} />
      <path d="M118 60C130 66 134 88 126 102C120 112 110 112 106 104C112 90 116 74 118 60Z" fill={spec.coat.shade} />
    </>
  );
}

function Markings({ spec }: { spec: PortraitSpec }) {
  const { marking, coat } = spec;
  if (marking === 'tabby') {
    return (
      <g stroke={coat.accent} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M80 34V52M68 38L72 54M92 38L88 54" />
        <path d="M34 74L52 78M34 88L52 88M126 74L108 78M126 88L108 88" />
      </g>
    );
  }
  if (marking === 'patch') {
    return (
      <>
        <ellipse cx="98" cy="80" rx="26" ry="24" fill={coat.accent} opacity="0.92" />
        <ellipse cx="46" cy="118" rx="26" ry="21" fill={coat.accent} opacity="0.5" />
      </>
    );
  }
  if (marking === 'tuxedo') {
    return (
      <>
        <path d="M80 88C92 88 104 104 106 140H54C56 104 68 88 80 88Z" fill={coat.accent} />
        <path d="M80 30C86 30 90 40 88 52C84 48 76 48 72 52C70 40 74 30 80 30Z" fill={coat.accent} opacity="0.9" />
      </>
    );
  }
  if (marking === 'mask') {
    return (
      <>
        <ellipse cx="80" cy="96" rx="34" ry="30" fill={coat.accent} opacity="0.55" />
        <path d="M30 40H60L44 76Z" fill={coat.accent} opacity="0.4" />
        <path d="M130 40H100L116 76Z" fill={coat.accent} opacity="0.4" />
      </>
    );
  }
  if (marking === 'freckled') {
    return (
      <g fill={coat.accent} opacity="0.7">
        <circle cx="58" cy="98" r="2.4" />
        <circle cx="66" cy="106" r="2" />
        <circle cx="102" cy="98" r="2.4" />
        <circle cx="94" cy="106" r="2" />
        <circle cx="72" cy="64" r="2" />
        <circle cx="90" cy="62" r="1.8" />
      </g>
    );
  }
  return <ellipse cx="80" cy="132" rx="40" ry="20" fill={coat.shade} opacity="0.35" />;
}

function eyeGeometry(mood: Mood): { cy: number; rx: number; ry: number } {
  switch (mood) {
    case 'bright':
      return { cy: 82, rx: 6, ry: 6.4 };
    case 'gentle':
      return { cy: 83, rx: 5.6, ry: 5.2 };
    case 'sleepy':
      return { cy: 84, rx: 6.2, ry: 2.2 };
    case 'wary':
      return { cy: 84, rx: 5, ry: 5.4 };
  }
}

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
