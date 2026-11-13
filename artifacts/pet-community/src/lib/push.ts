/**
 * Lock-screen alerts for a missing animal.
 *
 * This is the one thing in the app that is worth more than everything else put
 * together: a neighbour's dog gets out, and the people who could spot it find
 * out while it still matters, instead of next time they open a tab.
 *
 * Apple's rules, from WebKit's own documentation, shape all of this:
 *
 *   - It works only in a web app **added to the Home Screen**. In a Safari
 *     tab there is no PushManager at all. So the app has to ask people to
 *     install it before it can ask them anything else.
 *   - The subscribe call must happen **inside the handler of a real tap**.
 *     Asking on page load does nothing, and asking in a `setTimeout` does
 *     nothing. There is no second chance either: a person who says no cannot
 *     be asked again until they delete the app and add it back.
 *   - Every push **must** show a notification. Apple revokes the permission
 *     for a site that pushes silently, so there is no using this as a
 *     background channel, and we do not try.
 *
 * iOS 16.4 and later. Nothing here needs an Apple Developer account.
 */

/** Set at build time from the VAPID key pair. Empty until that is done. */
export const VAPID_PUBLIC_KEY: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_VAPID_PUBLIC_KEY ?? '';

export type PushState =
  /** Not a browser that can do this at all. */
  | 'unsupported'
  /** An iPhone, in a Safari tab: it has to be on the Home Screen first. */
  | 'needs-install'
  /** Installed and able to ask. */
  | 'can-ask'
  /** Already on. */
  | 'on'
  /** They said no, and iOS will not ask again until the app is reinstalled. */
  | 'refused'
  /** The keys are not configured yet, so there is nothing to subscribe to. */
  | 'not-configured';

/** Running as an installed app rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS reports itself as a Mac, so a touch check is the only way to tell
  // an iPad from a desktop.
  const ua = navigator.userAgent;
  const iPadOS = /Macintosh/.test(ua) && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1;
  return /iPhone|iPod|iPad/.test(ua) || iPadOS;
}

/** Where this browser stands, so the interface can say something true. */
export function pushState(): PushState {
  if (typeof window === 'undefined') return 'unsupported';
  const hasApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  // On an iPhone the API only exists once installed, so a missing API there
  // means "add it to your Home Screen", not "your phone cannot do this".
  if (!hasApi) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!VAPID_PUBLIC_KEY) return 'not-configured';
  if (Notification.permission === 'granted') return 'on';
  if (Notification.permission === 'denied') return 'refused';
  return 'can-ask';
}

/**
 * The VAPID public key, as the push API wants it.
 *
 * It is published as base64url; `PushManager.subscribe` wants raw bytes.
 */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const raw = atob(withPadding);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** What the server needs to reach one phone. */
export type PushTarget = { endpoint: string; p256dh: string; auth: string };

function encodeKey(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function describeSubscription(subscription: PushSubscription): PushTarget {
  return {
    endpoint: subscription.endpoint,
    p256dh: encodeKey(subscription.getKey('p256dh')),
    auth: encodeKey(subscription.getKey('auth')),
  };
}

/**
 * Ask, and subscribe. **Call this straight from a click handler** — Apple
 * requires the subscribe call to happen inside the gesture's own handler, and
 * anything awaited before it can cost you the gesture.
 */
export async function turnOn(): Promise<{ ok: true; target: PushTarget } | { ok: false; reason: string }> {
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'Alerts are not switched on for this site yet.' };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        ok: false,
        reason:
          permission === 'denied'
            ? 'Notifications are blocked. iPhone will not ask again until the app is removed from your Home Screen and added back.'
            : 'No answer given, so nothing changed.',
      };
    }
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        // Apple revokes the permission of a site that pushes without showing
        // anything, so this is not optional and never will be.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));
    return { ok: true, target: describeSubscription(subscription) };
  } catch (error) {
    return { ok: false, reason: `Could not switch alerts on: ${String(error).slice(0, 120)}` };
  }
}

/** The subscription this phone already has, if any. */
export async function currentTarget(): Promise<PushTarget | null> {
  try {
    if (!('serviceWorker' in navigator)) return null;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? describeSubscription(subscription) : null;
  } catch {
    return null;
  }
}
