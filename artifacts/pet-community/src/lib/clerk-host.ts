/**
 * Deciding whether this host can supply a Clerk key at all.
 *
 * Replit injects the key by deriving it from the hostname, and its helper will
 * derive one from *any* hostname — including a Vercel URL. The result is a
 * correctly shaped key whose frontend API points at `clerk.<your-host>`, a
 * subdomain that does not exist. Clerk then fails to load its script, renders
 * nothing, and the page goes white with no error in the UI.
 *
 * So shape is not enough to tell a real key from a derived one. Host derivation
 * is only trusted on hosts that actually do the injecting; everywhere else the
 * key has to be given explicitly.
 *
 * Pure and dependency-free so it can be tested directly.
 */

/** Clerk publishable keys always start like this. */
const KEY_SHAPE = /^pk_(test|live)_[A-Za-z0-9+/=_-]{8,}$/;

/** Hosts where the platform injects a Clerk key derived from the hostname. */
const DERIVING_HOSTS = /(^|\.)(replit\.dev|replit\.app|repl\.co)$/i;

export function isUsableKey(value: unknown): value is string {
  return typeof value === 'string' && KEY_SHAPE.test(value.trim());
}

/** True only where a hostname-derived key is actually backed by something. */
export function hostSuppliesKey(hostname: string): boolean {
  return DERIVING_HOSTS.test(hostname.trim());
}

/**
 * The key to use, or undefined to run without accounts.
 * An explicit key always wins; derivation is a fallback for deriving hosts only.
 */
export function chooseKey(options: {
  explicit: unknown;
  hostname: string;
  derive: (hostname: string) => unknown;
}): string | undefined {
  if (isUsableKey(options.explicit)) return options.explicit.trim();
  if (!hostSuppliesKey(options.hostname)) return undefined;
  try {
    const derived = options.derive(options.hostname);
    return isUsableKey(derived) ? derived.trim() : undefined;
  } catch {
    return undefined;
  }
}
