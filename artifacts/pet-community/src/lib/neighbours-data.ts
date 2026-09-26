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

export const NEIGHBOURS: Neighbour[] = [{ id: 'mara', area: 'the community garden', photo: '1761590961183-c838b662956f', name: 'Mara Singh', initials: 'MS', pet: 'Clover', detail: 'Border collie · 4 years', note: 'Usually exploring the garden loop', color: 'bg-[#d8e3c8]' }, { id: 'theo', area: 'the creek bend', photo: '1644187689076-37b6126afada', name: 'Theo Alvarez', initials: 'TA', pet: 'Basil', detail: 'Retriever mix · 2 years', note: 'Out walking until 6:15 today', color: 'bg-[#f2d9a7]' }, { id: 'nora', area: 'Maple Park south lawn', photo: '1649493850736-d5a1e47820a5', name: 'Nora Williams', initials: 'NW', pet: 'Penny', detail: 'Corgi · 6 years', note: 'Knows every shady bench', color: 'bg-[#e7c7bd]' }, { id: 'camille', area: 'Oak Terrace', photo: '1598752616969-12ffea9bd3de', name: 'Camille Jones', initials: 'CJ', pet: 'Miso', detail: 'Orange tabby · 3 years', note: 'Quiet garden side enthusiast', color: 'bg-[#d4dfe3]' }];
