/**
 * The neighbour's own profile: who they are, who their animal is, and the
 * portrait everyone else recognises them by.
 *
 * Profiles saved by earlier versions only had a username, a pet name and a
 * species, so everything read back out goes through `normalizeProfile` — a
 * stored object missing the newer fields would otherwise read as `undefined`
 * halfway down a render and take the page out.
 */

import { DEFAULT_PORTRAIT, type PortraitSpec } from './portrait-spec.ts';
import { LANDMARKS } from './neighborhood-map.ts';

export type PetType = 'dog' | 'cat';

export type PetProfile = {
  /** A neighbourhood name, not a legal one. */
  username: string;
  petName: string;
  petType: PetType;
  breed: string;
  age: string;
  /** Where they walk, drawn from the same landmarks the search map uses. */
  neighbourhood: string;
  /**
   * Whether to appear in the neighbours list. Off until you say otherwise:
   * even a landmark is more than some people want to share.
   */
  shareArea: boolean;
  /** What neighbours should know — the bit that makes a hello easy. */
  bio: string;
  portrait: PortraitSpec;
  /** A photo from their album, kept in this browser. Beats the drawing when set. */
  avatar?: string;
};

export const NEIGHBOURHOODS = LANDMARKS.map((l) => l.name);

export const defaultProfile: PetProfile = {
  username: 'Your neighbour',
  petName: 'Your pet',
  petType: 'dog',
  breed: '',
  age: '',
  neighbourhood: NEIGHBOURHOODS[0],
  shareArea: false,
  bio: '',
  portrait: DEFAULT_PORTRAIT,
};

export const BIO_LIMIT = 240;

/** Fills in anything an older stored profile is missing, without losing what it has. */
export function normalizeProfile(value: Partial<PetProfile> | null | undefined): PetProfile {
  const petType: PetType = value?.petType === 'cat' ? 'cat' : 'dog';
  const portrait = value?.portrait;
  return {
    username: value?.username?.trim() || defaultProfile.username,
    petName: value?.petName?.trim() || defaultProfile.petName,
    petType,
    breed: value?.breed ?? '',
    age: value?.age ?? '',
    neighbourhood: value?.neighbourhood || defaultProfile.neighbourhood,
    // Opting in has to be explicit: an older stored profile, or a corrupted
    // one, must never read as consent to be listed.
    shareArea: value?.shareArea === true,
    // Only a data URL we produced ourselves is kept; anything else is dropped
    // rather than handed to an <img src>.
    avatar: typeof value?.avatar === 'string' && value.avatar.startsWith('data:image/') ? value.avatar : undefined,
    bio: value?.bio ?? '',
    portrait:
      portrait && portrait.coat && portrait.marking && portrait.ears && portrait.mood
        ? { ...portrait, species: petType }
        : { ...DEFAULT_PORTRAIT, species: petType },
  };
}

/** True once someone has actually filled it in, rather than left the defaults. */
export function isProfileSet(profile: PetProfile): boolean {
  return profile.username !== defaultProfile.username && profile.petName !== defaultProfile.petName;
}

/**
 * Whether anything has been made their own yet.
 *
 * Looser than `isProfileSet` on purpose. That one guards prefilling a lost-pet
 * report, where a placeholder name would be worse than a blank. This one decides
 * whether to put their picture in the sidebar, and one changed field — a name,
 * a breed, a coat colour — is reason enough to show it.
 */
export function isProfileStarted(profile: PetProfile): boolean {
  return (
    profile.username !== defaultProfile.username ||
    profile.petName !== defaultProfile.petName ||
    profile.breed.trim() !== '' ||
    profile.age.trim() !== '' ||
    profile.bio.trim() !== '' ||
    profile.petType !== defaultProfile.petType ||
    JSON.stringify(profile.portrait) !== JSON.stringify(defaultProfile.portrait)
  );
}
