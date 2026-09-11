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

function resolveKey(): string | undefined {
  try {
    const key = publishableKeyFromHost(
      window.location.hostname,
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    );
    return key || undefined;
  } catch {
    // The host-based resolver throws on hostnames it does not recognise, which
    // includes localhost. That is not an error worth crashing the app over.
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
