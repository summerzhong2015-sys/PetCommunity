/**
 * The neighbours in your circle.
 *
 * Lifted out of the Nearby page so Messages can offer the same people when you
 * start a conversation — there was no single list of who is around, so the two
 * screens would have drifted apart the first time one changed.
 */

import type { PortraitSpec } from '@/components/pet-portrait';

export type Neighbour = {
  id: string;
  name: string;
  initials: string;
  /** Their animal's name. */
  pet: string;
  /** Breed and age, as one line. */
  detail: string;
  /** What they are usually up to. */
  note: string;
  /** The block behind their photo while it loads, and if it never does. */
  color: string;
  /** The landmark they chose — the only location anyone shares. */
  area: string;
  photo?: string;
  avatar?: string;
  portrait?: PortraitSpec;
};

export const NEIGHBOURS: Neighbour[] = [{ id: 'mara', area: 'Old Yale Park', photo: '1761590961183-c838b662956f', name: 'Mara Singh', initials: 'MS', pet: 'Clover', detail: 'Border collie · 4 years', note: 'Usually exploring the garden loop', color: 'bg-[#d8e3c8]' }, { id: 'theo', area: 'the Nicomekl trail', photo: '1644187689076-37b6126afada', name: 'Theo Alvarez', initials: 'TA', pet: 'Basil', detail: 'Retriever mix · 2 years', note: 'Out walking until 6:15 today', color: 'bg-[#f2d9a7]' }, { id: 'nora', area: 'Murrayville Outdoor Activity Park', photo: '1649493850736-d5a1e47820a5', name: 'Nora Williams', initials: 'NW', pet: 'Penny', detail: 'Corgi · 6 years', note: 'Knows every shady bench', color: 'bg-[#e7c7bd]' }, { id: 'camille', area: 'Murrayville Library', photo: '1598752616969-12ffea9bd3de', name: 'Camille Jones', initials: 'CJ', pet: 'Miso', detail: 'Orange tabby · 3 years', note: 'Quiet garden side enthusiast', color: 'bg-[#d4dfe3]' },
{ id: 'dev', area: 'James Hill Park', photo: '1590010463818-c6d2104c243d', name: 'Dev Patel', initials: 'DP', pet: 'Scout', detail: 'Beagle · 5 years', note: 'Does the school run loop every morning', color: 'bg-[#e8dcc4]' },
{ id: 'jun', area: 'Murrayville Cemetery', photo: '1726848294969-2c278ae7c06d', name: 'June Harper', initials: 'JH', pet: 'Pepper', detail: 'Black cat · 9 years', note: 'Indoor cat, sits in the front window', color: 'bg-[#d8d3dd]' },
{ id: 'ab', area: 'the Nicomekl trail', photo: '1743521800435-946eaad03e33', name: 'Abel Nkemdirim', initials: 'AN', pet: 'Moss', detail: 'Greyhound · 11 years', note: 'Slow laps, three stops for a sit down', color: 'bg-[#cfd8d3]' },
{ id: 'lin', area: 'Five Corners', photo: '1669277336130-f5efae4b4d60', name: 'Lin Zhao', initials: 'LZ', pet: 'Dumpling', detail: 'Bichon mix · 2 years', note: 'Known at every doorway on 48th', color: 'bg-[#f0e4d4]' },
{ id: 'sam', area: 'Derek Doubleday Arboretum', photo: '1781715631840-6bce98f2fdd0', name: 'Sam Okonjo', initials: 'SO', pet: 'Rune', detail: 'German shepherd · 3 years', note: 'Long line practice, mid-morning', color: 'bg-[#dce3d6]' },
{ id: 'ros', area: 'Murrayville Library', photo: '1776624384033-a0f7956ae4d1', name: 'Rosa Medina', initials: 'RM', pet: 'Clementine', detail: 'Orange tabby · 4 years', note: 'Sunbathes on the library steps', color: 'bg-[#f3dcc4]' }];
