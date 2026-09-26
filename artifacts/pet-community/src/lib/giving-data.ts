/**
 * Fundraising campaigns: shelter operating costs, hospital emergency funds,
 * individual animals needing treatment, neighbours who cannot afford their
 * pet's care, and the research that changes outcomes for everyone.
 */

import type { PortraitSpec } from '@/components/pet-portrait';

export type CampaignKind = 'shelter' | 'hospital' | 'pet' | 'neighbour' | 'research';

export type CampaignUpdate = { date: string; text: string };

export type Campaign = {
  id: string;
  title: string;
  beneficiary: string;
  kind: CampaignKind;
  /** One line under the title. */
  blurb: string;
  story: string;
  goal: number;
  raised: number;
  donors: number;
  daysLeft: number | null;
  urgent: boolean;
  /** Where the money actually goes, so nobody has to take it on trust. */
  breakdown: { label: string; amount: number }[];
  updates: CampaignUpdate[];
  /** Portrait for campaigns about a specific animal. */
  portrait?: PortraitSpec;
  /** A photograph of the animal a campaign is for, where there is one. */
  photo?: string;
  /** Shown when a local business is matching contributions. */
  matchNote?: string;
};

export const CAMPAIGN_LABEL: Record<CampaignKind, string> = {
  shelter: 'Shelter',
  hospital: 'Animal hospital',
  pet: 'One animal',
  neighbour: 'A neighbour',
  research: 'Research',
};

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    title: 'The stray fund at East Ridge',
    beneficiary: 'East Ridge Animal Hospital',
    kind: 'hospital',
    blurb: 'Treatment for animals brought in with nobody to bill.',
    story:
      'Every stray the shelter picks up comes here first, and the hospital treats it before anyone knows who is paying. Last year that was 214 animals and about $31,000 the practice absorbed. This fund is what lets them keep saying yes at 2am without checking a balance first.',
    goal: 24000,
    raised: 17420,
    donors: 268,
    daysLeft: null,
    urgent: false,
    breakdown: [
      { label: 'Emergency treatment for strays', amount: 15000 },
      { label: 'Free microchip scanning and reunification', amount: 3200 },
      { label: 'Monthly low-cost neuter clinic', amount: 4200 },
      { label: 'Recovery kennel supplies', amount: 1600 },
    ],
    updates: [
      { date: 'This week', text: 'Grits, the three-legged tabby now up for adoption, was this fund. Amputation, four nights in, and a bill nobody sent.' },
      { date: 'Last month', text: 'The Sunday neuter clinic did 38 animals — the highest in a single day since it started.' },
    ],
    matchNote: 'Fern & Finch are matching the first $2,000 this month.',
  },
  {
    id: 'c2',
    photo: '1668970565681-9373b86a1d4e',
    title: 'Keep Bess with Mr Halloran',
    beneficiary: 'Dennis Halloran, Alder Street',
    kind: 'neighbour',
    blurb: 'Chemotherapy for a fourteen-year-old dog, so her person does not have to choose.',
    story:
      'Dennis has walked Bess down Alder Street every morning for eleven years. She has lymphoma, and the treatment that would give her another good year costs more than his month. He did not ask for this — his neighbour set it up and then told him. The shortfall is the difference between a year and a fortnight.',
    goal: 4800,
    raised: 3960,
    donors: 141,
    daysLeft: 9,
    urgent: true,
    breakdown: [
      { label: 'Chemotherapy course (6 sessions)', amount: 3600 },
      { label: 'Bloodwork and monitoring', amount: 700 },
      { label: 'Anti-sickness and pain relief', amount: 500 },
    ],
    updates: [
      { date: '2 days ago', text: 'Session two done. She ate a whole dinner afterwards and slept through, which the vet says is exactly what they want to see.' },
      { date: 'Last week', text: 'Dennis asked us to say thank you and that he is "not very good at this bit". They walked to the park gate and back this morning.' },
    ],
    portrait: {
      species: 'dog',
      coat: { base: '#C9B69B', shade: '#9C8464', accent: '#EFE6D6', bg: '#F3EADC' },
      marking: 'solid',
      ears: 'floppy',
      mood: 'sleepy',
    },
  },
  {
    id: 'c3',
    photo: '1637424864218-b040b739ac44',
    title: 'Nutmeg needs a hip',
    beneficiary: 'Maple Ridge Animal Shelter',
    kind: 'pet',
    blurb: 'One surgery between a shelter kitten and a normal life.',
    story:
      'Nutmeg was found in the depot yard with a hip that had healed wrong after a fall. She gets around, but she will be in pain by four years old without a repair. The shelter cannot fund elective orthopaedics from its operating budget, so she waits. She is nine months old.',
    goal: 2600,
    raised: 1180,
    donors: 63,
    daysLeft: 21,
    urgent: true,
    breakdown: [
      { label: 'Femoral head ostectomy', amount: 1900 },
      { label: 'Imaging and pre-op bloods', amount: 380 },
      { label: 'Six weeks of physiotherapy', amount: 320 },
    ],
    updates: [
      { date: 'Yesterday', text: 'Surgery is booked provisionally for the 24th. It goes ahead if we clear the goal by the 20th.' },
    ],
    portrait: {
      species: 'cat',
      coat: { base: '#DE9E62', shade: '#B57841', accent: '#9E5A2A', bg: '#FAEBD8' },
      marking: 'tabby',
      ears: 'perky',
      mood: 'bright',
    },
  },
  {
    id: 'c4',
    title: 'Heat the kennels before November',
    beneficiary: 'Maple Ridge Animal Shelter',
    kind: 'shelter',
    blurb: 'The boiler is thirty years old and failed twice last winter.',
    story:
      'When the boiler goes down the dogs get moved into the corridor and volunteers sit with them overnight. It has failed twice in two winters. A replacement plus insulation on the north run costs less than one more emergency call-out season, and it would not need doing again for twenty years.',
    goal: 15000,
    raised: 9640,
    donors: 187,
    daysLeft: 54,
    urgent: false,
    breakdown: [
      { label: 'Replacement boiler and install', amount: 9800 },
      { label: 'Insulating the north kennel run', amount: 3400 },
      { label: 'Thermostats and safety cut-outs', amount: 1100 },
      { label: 'Contingency', amount: 700 },
    ],
    updates: [
      { date: 'This week', text: 'Two local plumbers have offered labour at cost, which took about $2,300 off the estimate.' },
      { date: '3 weeks ago', text: 'Survey done. The north run is losing more heat through the roof than the walls, so that gets insulated first.' },
    ],
  },
  {
    id: 'c5',
    title: 'Neuter the garden colony',
    beneficiary: 'Willow Gate Cat Rescue',
    kind: 'shelter',
    blurb: 'Twenty-two cats behind the community garden. Trap, neuter, return.',
    story:
      'The colony behind the community garden has grown from nine to twenty-two in two years. Trapping and neutering all of them stops that permanently and stops the kitten seasons that fill the shelter every spring. It is about $95 a cat, all in.',
    goal: 2100,
    raised: 1615,
    donors: 94,
    daysLeft: 30,
    urgent: false,
    breakdown: [
      { label: 'Neuter and vaccinate, 22 cats', amount: 1650 },
      { label: 'Ear-tipping and chipping', amount: 250 },
      { label: 'Two more humane traps', amount: 200 },
    ],
    updates: [
      { date: 'This week', text: 'Fourteen done. The remaining eight are the wary ones, which always take longest.' },
    ],
  },
  {
    id: 'c6',
    title: 'Early detection for feline kidney disease',
    beneficiary: 'Riverside Veterinary Research Group',
    kind: 'research',
    blurb: 'A cheap screening test could catch it years earlier than we do now.',
    story:
      'Chronic kidney disease kills more older cats than anything else, and by the time it shows on standard bloodwork most of the function is gone. This study is validating a screening marker that flags it two to three years earlier, when diet and management still change the outcome. Local funding covers the sample collection the grant does not.',
    goal: 12000,
    raised: 4380,
    donors: 71,
    daysLeft: 88,
    urgent: false,
    breakdown: [
      { label: 'Sample collection, 400 cats', amount: 6800 },
      { label: 'Lab assay costs', amount: 3600 },
      { label: 'Open-access publication', amount: 1600 },
    ],
    updates: [
      { date: 'Last month', text: 'Enrolment opened at three practices including East Ridge. If your cat is over eight, they can take the sample at a routine visit.' },
    ],
  },
];

export const PRESET_AMOUNTS = [10, 25, 50, 100];

export function pctOf(campaign: Campaign): number {
  return Math.min(100, (campaign.raised / campaign.goal) * 100);
}

export function money(amount: number): string {
  // Rounded because a counting-up total passes through fractions on its way.
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}
