/**
 * Clerk is optional.
 *
 * On Replit the publishable key is injected from the host. Running locally
 * there is usually no key at all, and ClerkProvider throws on a missing one —
 * which shows up as a blank white page rather than a useful error. So when no
 * key resolves, the app runs signed-out: everything that does not need an
 * account still works, profiles fall back to this browser, and the sign-in
 * screens explain what is missing.
 *
 * Set VITE_CLERK_PUBLISHABLE_KEY to turn accounts back on.
 *
 * The hook bindings are chosen once at module load and never per render, so
 * React's hook order is stable whichever branch is live.
 */

import { useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';

/** Clerk publishable keys always look like this. Anything else is not a key. */
const KEY_SHAPE = /^pk_(test|live)_[A-Za-z0-9]/;

function resolveKey(): string | undefined {
  try {
    const key = publishableKeyFromHost(
      window.location.hostname,
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    );
    // The host resolver can hand back a placeholder or an empty-ish value on a
    // host it does not know — localhost, a preview URL, a static host. Mounting
    // ClerkProvider with one of those throws during render, above the error
    // boundary, and the whole page goes white with nothing in the UI to say why.
    // So the key has to actually look like a key before accounts are turned on.
    return typeof key === 'string' && KEY_SHAPE.test(key.trim()) ? key.trim() : undefined;
  } catch {
    return undefined;
  }
}

export const clerkPublishableKey = resolveKey();
export const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;
export const authEnabled = Boolean(clerkPublishableKey);

type AuthUser = { isSignedIn: boolean; user: { id: string } | null };
type AuthActions = { signOut: (options?: { redirectUrl?: string }) => unknown };

const useSignedOutUser = (): AuthUser => ({ isSignedIn: false, user: null });
const useNoAuthActions = (): AuthActions => ({ signOut: () => undefined });

// Clerk's own hook types are wider than the two fields the app reads, so the
// casts narrow them to the shared shape rather than loosening anything.
export const useAuthUser: () => AuthUser = authEnabled
  ? (useUser as unknown as () => AuthUser)
  : useSignedOutUser;

export const useAuthActions: () => AuthActions = authEnabled
  ? (useClerk as unknown as () => AuthActions)
  : useNoAuthActions;
