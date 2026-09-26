/**
 * Shelters, rescues and the animals currently looking for a home.
 *
 * Every pet carries a photograph and a drawn portrait. The photograph is what
 * a listing leads with, because a real animal is what makes someone stop
 * scrolling; the portrait is the fallback when the image does not load, so a
 * card is never empty. Photographs are from Unsplash.
 */

import type { PortraitSpec } from '@/components/pet-portrait';

export type ShelterKind = 'shelter' | 'rescue' | 'foster network' | 'clinic';

export type Shelter = {
  id: string;
  name: string;
  kind: ShelterKind;
  area: string;
  address: string;
  hours: string;
  phone: string;
  about: string;
  /** What actually helps them right now. */
  needs: string[];
  /** Ways to help that cost nothing. */
  volunteering: string[];
  visiting: string;
  animalsInCare: number;
  foundedYear: number;
  /** A photograph of the place, or of what they do. */
  photo?: string;
};

export type AdoptionStatus = 'available' | 'pending' | 'foster-needed';

export type AdoptablePet = {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  ageLabel: string;
  ageBand: 'young' | 'adult' | 'senior';
  sex: 'female' | 'male';
  size: 'small' | 'medium' | 'large';
  shelterId: string;
  status: AdoptionStatus;
  inCareSince: string;
  /** The short line that goes under the name. */
  headline: string;
  story: string;
  personality: string[];
  goodWith: { children: boolean; dogs: boolean; cats: boolean };
  needs: string;
  fee: number;
  portrait: PortraitSpec;
  /**
   * An Unsplash photo id, rendered at the top of the listing. The drawn
   * portrait stays as the fallback: a listing must never come up blank because
   * someone else's image host had a bad day.
   */
  photo?: string;
};

export const SHELTERS: Shelter[] = [
  {
    id: 'maple-ridge',
    photo: '1675701917791-debd2d61cc4a',
    name: 'Maple Ridge Animal Shelter',
    kind: 'shelter',
    area: 'North Creek',
    address: '14 Creekside Row, by the Maple Park north gate',
    hours: 'Wed–Sun, 11am – 5pm',
    phone: '(555) 0142',
    about:
      'The neighbourhood’s municipal shelter, and the first place a found animal is brought. They take everything that comes through the door, which means they are almost always at capacity and almost always need fosters.',
    needs: ['Unopened wet food', 'Old towels and blankets', 'Kitten milk replacer', 'Cat litter'],
    volunteering: ['Dog walking, Sat mornings', 'Cat socialising, weekday evenings', 'Laundry and dishes — genuinely the biggest help'],
    visiting: 'Walk in any time they are open. No appointment needed to meet the animals — bring the whole family.',
    animalsInCare: 47,
    foundedYear: 1998,
  },
  {
    id: 'willow-cat',
    photo: '1558618047-f4b511aae74d',
    name: 'Willow Gate Cat Rescue',
    kind: 'rescue',
    area: 'Willow Gate',
    address: '3 Willow Lane, above the old post office',
    hours: 'Thu–Sat, 12pm – 6pm',
    phone: '(555) 0177',
    about:
      'A small volunteer rescue that works with the colony behind the community garden. They trap, neuter and return the ferals, and socialise the ones young enough to live indoors.',
    needs: ['Kitten food', 'Cardboard scratchers', 'Fleece blankets', 'Petrol money for vet runs'],
    volunteering: ['Colony feeding rota', 'Transport to and from the clinic', 'Fostering kittens for 6–8 weeks'],
    visiting: 'Ring ahead — it is a small room and the cats do better meeting one or two people at a time.',
    animalsInCare: 22,
    foundedYear: 2014,
  },
  {
    id: 'second-chance',
    photo: '1594004844563-536a03a6e532',
    name: 'Second Chance Foster Network',
    kind: 'foster network',
    area: 'Alder Street',
    address: 'No premises — animals live in volunteers’ homes',
    hours: 'Meet-and-greets arranged around your week',
    phone: '(555) 0163',
    about:
      'No building, no kennels. Every animal lives in a volunteer’s spare room until it is adopted, which means the foster can tell you exactly how the dog handles stairs, doorbells and being left alone.',
    needs: ['More foster homes — always the bottleneck', 'Crates and baby gates', 'Help with vet transport'],
    volunteering: ['Foster for two weeks while someone is away', 'Home-check visits', 'Photography for listings'],
    visiting: 'Meet at the foster’s home or somewhere quiet nearby. They will bring the dog to you.',
    animalsInCare: 18,
    foundedYear: 2019,
  },
  {
    id: 'east-ridge-vet',
    photo: '1644675272883-0c4d582528d8',
    name: 'East Ridge Animal Hospital',
    kind: 'clinic',
    area: 'East Ridge',
    address: '210 Ridge Road, opposite the trailhead',
    hours: 'Mon–Sat 8am – 7pm · 24 hr emergency line',
    phone: '(555) 0100',
    about:
      'The clinic that treats every stray the shelter brings in, usually before anyone knows who will pay for it. They run the low-cost neuter clinic on the first Sunday of the month.',
    needs: ['Support for the emergency fund', 'Blankets for recovery kennels', 'Volunteers for the neuter clinic'],
    volunteering: ['Reception help at the monthly neuter clinic', 'Post-op blanket laundry'],
    visiting: 'Drop in during opening hours. Bring a found animal any time — they scan for a chip free.',
    animalsInCare: 9,
    foundedYear: 1986,
  },
];

export const ADOPTABLE_PETS: AdoptablePet[] = [
  {
    id: 'a1',
    photo: '1768658773320-919944f76a0f',
    name: 'Marlow',
    species: 'dog',
    breed: 'Retriever mix',
    ageLabel: '7 years',
    ageBand: 'senior',
    sex: 'male',
    size: 'large',
    shelterId: 'maple-ridge',
    status: 'available',
    inCareSince: 'In care 8 months',
    headline: 'Has been passed over 40 times for being seven.',
    story:
      'Marlow came in when his person went into care. He is house-trained, walks on a loose lead, and sleeps through the night without a sound. Eight months in, people keep walking past his kennel to look at the puppies. He greets every one of them anyway.',
    personality: ['Calm', 'Loves a long slow walk', 'Leans on you', 'Quiet in the house'],
    goodWith: { children: true, dogs: true, cats: true },
    needs: 'Daily joint supplement, about $8 a month. Otherwise a healthy dog.',
    fee: 40,
    portrait: {
      species: 'dog',
      coat: { base: '#D9A05B', shade: '#B87B3E', accent: '#F4E7CF', bg: '#F7EBD8' },
      marking: 'solid',
      ears: 'floppy',
      mood: 'gentle',
    },
  },
  {
    id: 'a2',
    photo: '1762686125027-2166ae5b0a1e',
    name: 'Pesto',
    species: 'cat',
    breed: 'Domestic shorthair',
    ageLabel: '10 months',
    ageBand: 'young',
    sex: 'male',
    size: 'small',
    shelterId: 'willow-cat',
    status: 'available',
    inCareSince: 'In care 6 weeks',
    headline: 'Born under the garden shed, now firmly a sofa cat.',
    story:
      'One of the garden colony kittens, caught young enough to turn into a house cat. He took three weeks to come out from behind the washing machine and now cannot be kept off a lap. He would like another cat to wrestle.',
    personality: ['Chatty', 'Lap cat', 'Endless energy', 'Follows you room to room'],
    goodWith: { children: true, dogs: false, cats: true },
    needs: 'Nothing ongoing. Neutered, chipped and fully vaccinated.',
    fee: 55,
    portrait: {
      species: 'cat',
      coat: { base: '#E0925A', shade: '#B9713F', accent: '#A85B2C', bg: '#FBEAD6' },
      marking: 'tabby',
      ears: 'perky',
      mood: 'bright',
    },
  },
  {
    id: 'a3',
    photo: '1597576364579-075da59e710d',
    name: 'Dot',
    species: 'cat',
    breed: 'Domestic shorthair',
    ageLabel: '4 years',
    ageBand: 'adult',
    sex: 'female',
    size: 'small',
    shelterId: 'willow-cat',
    status: 'available',
    inCareSince: 'In care 4 months',
    headline: 'Wants one quiet person and no surprises.',
    story:
      'Dot came from a house with six other cats and found it unbearable. On her own she is affectionate and funny, but she needs somewhere calm — no dogs, no toddlers, no other cats. With the right single household she is the easiest cat in the building.',
    personality: ['Gentle once she trusts you', 'Needs a quiet home', 'Sits near, not on, you'],
    goodWith: { children: false, dogs: false, cats: false },
    needs: 'A calm, adult-only home. Nothing medical.',
    fee: 45,
    portrait: {
      species: 'cat',
      coat: { base: '#35302E', shade: '#211D1C', accent: '#F5F1E8', bg: '#E9E6DF' },
      marking: 'tuxedo',
      ears: 'perky',
      mood: 'wary',
    },
  },
  {
    id: 'a4',
    photo: '1754486369859-3fb07108a91e',
    name: 'Rooster',
    species: 'dog',
    breed: 'Terrier cross',
    ageLabel: '2 years',
    ageBand: 'young',
    sex: 'male',
    size: 'small',
    shelterId: 'second-chance',
    status: 'available',
    inCareSince: 'In foster 3 months',
    headline: 'Small, loud, and entirely convinced he is enormous.',
    story:
      'Rooster is in foster with a family on Alder Street, so they can tell you everything: he is clean in the house, sleeps in until eight, and barks at exactly one thing — the recycling lorry. He needs someone who finds that funny.',
    personality: ['Bold', 'Very food-motivated', 'Great on a lead', 'Opinionated'],
    goodWith: { children: true, dogs: true, cats: false },
    needs: 'Nothing. Neutered, chipped, up to date.',
    fee: 60,
    portrait: {
      species: 'dog',
      coat: { base: '#D8C4A6', shade: '#A9825A', accent: '#4A3A2E', bg: '#F4EADA' },
      marking: 'patch',
      ears: 'perky',
      mood: 'bright',
    },
  },
  {
    id: 'a5',
    photo: '1614595402938-ecee8416e6b5',
    name: 'Juno',
    species: 'dog',
    breed: 'Shepherd mix',
    ageLabel: '5 years',
    ageBand: 'adult',
    sex: 'female',
    size: 'large',
    shelterId: 'maple-ridge',
    status: 'foster-needed',
    inCareSince: 'In care 11 months',
    headline: 'Kennel life is undoing her. She needs a sofa, urgently.',
    story:
      'Juno is clever, biddable and completely worn down by eleven months in a kennel. She has started spinning in her run. Two weeks in a quiet house would show what she is actually like — the shelter covers food and vet costs for fosters.',
    personality: ['Whip-smart', 'Knows sit, down, wait', 'Anxious in kennels', 'Devoted once bonded'],
    goodWith: { children: true, dogs: true, cats: false },
    needs: 'A calm home while she decompresses. All costs covered by the shelter.',
    fee: 0,
    portrait: {
      species: 'dog',
      coat: { base: '#6E7A82', shade: '#4E585F', accent: '#F1EDE6', bg: '#E4EAEE' },
      marking: 'mask',
      ears: 'perky',
      mood: 'gentle',
    },
  },
  {
    id: 'a6',
    photo: '1597068806585-c404c345c593',
    name: 'Clementine',
    species: 'cat',
    breed: 'Domestic longhair',
    ageLabel: '11 years',
    ageBand: 'senior',
    sex: 'female',
    size: 'small',
    shelterId: 'maple-ridge',
    status: 'available',
    inCareSince: 'In care 5 months',
    headline: 'Eleven, hyperthyroid, and still the friendliest cat here.',
    story:
      'Her person died and no family came forward. She has an overactive thyroid, managed with a tablet in food twice a day, and beyond that she is a healthy, chatty, deeply affectionate cat who wants to sit on the newspaper you are reading.',
    personality: ['Extremely friendly', 'Talks constantly', 'Sleeps on the bed', 'Unbothered by anything'],
    goodWith: { children: true, dogs: true, cats: true },
    needs: 'Thyroid tablet twice daily in food, about $15 a month. The shelter covers the first year.',
    fee: 0,
    portrait: {
      species: 'cat',
      coat: { base: '#F0E5D5', shade: '#D6C7B2', accent: '#C97B3C', bg: '#F8F0E3' },
      marking: 'patch',
      ears: 'folded',
      mood: 'sleepy',
    },
  },
  {
    id: 'a7',
    photo: '1623689278873-6981e40013ec',
    name: 'Bramble',
    species: 'dog',
    breed: 'Collie cross',
    ageLabel: '3 years',
    ageBand: 'adult',
    sex: 'male',
    size: 'medium',
    shelterId: 'second-chance',
    status: 'pending',
    inCareSince: 'In foster 7 weeks',
    headline: 'Home visit booked — keeping his listing up in case it falls through.',
    story:
      'Bramble is the easiest dog in the network and it shows: he had three applications in a fortnight. A home visit is booked for Saturday. His foster is keeping the listing up in case anything changes.',
    personality: ['Eager to please', 'Loves a job', 'Needs a proper walk', 'Brilliant recall'],
    goodWith: { children: true, dogs: true, cats: true },
    needs: 'A household that walks. He is not a garden-only dog.',
    fee: 60,
    portrait: {
      species: 'dog',
      coat: { base: '#4A4441', shade: '#322D2B', accent: '#F2EDE4', bg: '#E6E3DE' },
      marking: 'tuxedo',
      ears: 'floppy',
      mood: 'bright',
    },
  },
  {
    id: 'a8',
    photo: '1548907084-a7e5f11d229d',
    name: 'Sable & Fig',
    species: 'cat',
    breed: 'Domestic shorthair, bonded pair',
    ageLabel: '2 years',
    ageBand: 'adult',
    sex: 'female',
    size: 'small',
    shelterId: 'willow-cat',
    status: 'available',
    inCareSince: 'In care 3 months',
    headline: 'Sisters. They must go together, which is why they are still here.',
    story:
      'They sleep curled into one shape and cry if separated for a vet appointment. Nobody wants two cats, so three months on they are still in the back room. The rescue will do both for one adoption fee.',
    personality: ['Inseparable', 'Playful with each other', 'Warm up quickly', 'Low maintenance'],
    goodWith: { children: true, dogs: false, cats: true },
    needs: 'They must be adopted as a pair. One fee covers both.',
    fee: 70,
    portrait: {
      species: 'cat',
      coat: { base: '#9AA3A6', shade: '#737C80', accent: '#5C6468', bg: '#E8ECEC' },
      marking: 'tabby',
      ears: 'perky',
      mood: 'gentle',
    },
  },
  {
    id: 'a9',
    photo: '1763941802516-0bd483f33f71',
    name: 'Ottoline',
    species: 'dog',
    breed: 'Spaniel mix',
    ageLabel: '9 months',
    ageBand: 'young',
    sex: 'female',
    size: 'medium',
    shelterId: 'maple-ridge',
    status: 'available',
    inCareSince: 'In care 3 weeks',
    headline: 'Everything is the best thing that has ever happened.',
    story:
      'Found tied outside the shelter one morning with no note. She is nine months old, entirely unspoiled by whatever happened before, and has no idea that anything bad has ever occurred. She will need training and a great deal of exercise.',
    personality: ['Boundlessly cheerful', 'Chews everything', 'Learning fast', 'Loves water'],
    goodWith: { children: true, dogs: true, cats: true },
    needs: 'Training classes and real exercise. She is a young spaniel, not an ornament.',
    fee: 60,
    portrait: {
      species: 'dog',
      coat: { base: '#8C5F3F', shade: '#6B462C', accent: '#EFE1CD', bg: '#F0E1D1' },
      marking: 'freckled',
      ears: 'floppy',
      mood: 'bright',
    },
  },
  {
    id: 'a10',
    photo: '1490650034439-fd184c3c86a5',
    name: 'Grits',
    species: 'cat',
    breed: 'Domestic shorthair',
    ageLabel: '6 years',
    ageBand: 'adult',
    sex: 'male',
    size: 'medium',
    shelterId: 'maple-ridge',
    status: 'available',
    inCareSince: 'In care 2 months',
    headline: 'Three legs, no notion that this is unusual.',
    story:
      'Hit by a car on Ridge Road and brought in by a neighbour. East Ridge Animal Hospital took the front leg and treated him for nothing. He gets around fine, jumps onto anything he likes, and would prefer an indoor home or a quiet garden.',
    personality: ['Unflappable', 'Solid, heavy purr', 'Enjoys being carried', 'Not remotely fragile'],
    goodWith: { children: true, dogs: true, cats: true },
    needs: 'Indoors or a quiet, enclosed garden. No ongoing medication.',
    fee: 45,
    portrait: {
      species: 'cat',
      coat: { base: '#B9AFA2', shade: '#8F857A', accent: '#EFEAE1', bg: '#EEEAE3' },
      marking: 'solid',
      ears: 'perky',
      mood: 'sleepy',
    },
  },
];

export function shelterOf(pet: AdoptablePet): Shelter {
  return SHELTERS.find((s) => s.id === pet.shelterId) ?? SHELTERS[0];
}
