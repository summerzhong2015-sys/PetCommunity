/**
 * Clerk is optional.
 *
 * On Replit the publishable key is injected by deriving it from the hostname.
 * Nowhere else does that, and the helper will happily derive a well-formed key
 * from any host — one that points Clerk at a subdomain that does not exist. See
 * clerk-host.ts for how a real key is told apart from a derived one.
 *
 * When no usable key resolves the app runs signed-out: everything that does not
 * need an account still works, profiles fall back to this browser, and the
 * sign-in screens explain what is missing.
 *
 * Set VITE_CLERK_PUBLISHABLE_KEY to turn accounts back on.
 *
 * The hook bindings are chosen once at module load and never per render, so
 * React's hook order is stable whichever branch is live.
 */

import { useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { chooseKey } from './clerk-host';

function resolveKey(): string | undefined {
  return chooseKey({
    explicit: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    hostname: window.location.hostname,
    derive: (hostname) => publishableKeyFromHost(hostname, undefined),
  });
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
