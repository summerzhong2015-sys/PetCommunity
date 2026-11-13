/**
 * Two small pieces of interface for lock-screen alerts.
 *
 * `InstallNudge` asks an iPhone to add the app to its Home Screen, because on
 * iOS that is the only way push notifications exist at all — and Safari gives
 * a site no install prompt of its own, so asking in words is the only option.
 *
 * `AlertToggle` is the tap that turns them on. Apple requires the subscribe
 * call to happen inside a real gesture's handler, and will not let a person be
 * asked twice, so this is written to ask once, clearly, and to say plainly
 * what it cannot undo.
 */

import { useEffect, useState } from 'react';
import { BellRing, Check, Share, SquarePlus, X } from 'lucide-react';
import { currentTarget, isIOS, isStandalone, pushState, turnOn, type PushState } from '@/lib/push';
import { useStored } from '@/components/page-bits';
import type { Notify } from '@/components/page-bits';

/** Tell the server where to reach this phone. Write-only; never read back. */
async function remember(target: { endpoint: string; p256dh: string; auth: string }, off = false): Promise<boolean> {
  try {
    const response = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, off }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function InstallNudge() {
  const [dismissed, setDismissed] = useStored<boolean>('pc-install-dismissed', false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only an iPhone, only in a tab, only once they have not waved it away.
    setShow(isIOS() && !isStandalone() && !dismissed);
  }, [dismissed]);

  if (!show) return null;

  return (
    <div className="paper-card p-4 mb-5 flex items-start gap-3" data-testid="notice-install">
      <BellRing size={18} className="shrink-0 mt-0.5 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Put this on your Home Screen</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          It is the only way iPhone will let the app tell you a pet has gone missing nearby. Tap{' '}
          <Share size={12} className="inline align-text-bottom" /> below, then{' '}
          <strong className="font-bold">Add to Home Screen</strong>
          <SquarePlus size={12} className="inline align-text-bottom ml-1" />.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 text-muted-foreground"
        aria-label="Hide this"
        data-testid="button-dismiss-install"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function AlertToggle({ notify }: { notify: Notify }) {
  const [state, setState] = useState<PushState>('unsupported');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(pushState());
    // A subscription can quietly lapse after a week or two of the app not
    // being opened, so what is on the phone is checked rather than assumed.
    void currentTarget().then((target) => {
      if (target) void remember(target);
    });
  }, []);

  if (state === 'unsupported' || state === 'needs-install') return null;

  if (state === 'not-configured') {
    return (
      <p className="text-[11px] text-muted-foreground mt-3" data-testid="text-alerts-unconfigured">
        Lock-screen alerts are built but not switched on for this site yet.
      </p>
    );
  }

  if (state === 'on') {
    return (
      <p className="text-xs text-primary font-bold mt-3 flex items-center gap-1.5" data-testid="text-alerts-on">
        <Check size={14} /> You will be told when a pet goes missing nearby.
      </p>
    );
  }

  if (state === 'refused') {
    return (
      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed" data-testid="text-alerts-refused">
        Notifications are turned off for this app. iPhone will not ask again &mdash; to change it, remove the app from
        your Home Screen and add it back.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      // Straight from the tap: Apple requires the subscribe call to happen in
      // the gesture's own handler, so nothing is awaited before it.
      onClick={async () => {
        setBusy(true);
        const result = await turnOn();
        setBusy(false);
        if (!result.ok) {
          setState(pushState());
          notify({ tone: 'error', text: result.reason });
          return;
        }
        const saved = await remember(result.target);
        setState('on');
        notify({
          tone: saved ? 'success' : 'info',
          text: saved
            ? 'Alerts on. You will hear about a missing pet near you, even with the app closed.'
            : 'Alerts allowed on this phone, but the neighbourhood list could not be reached. Open the app again later.',
        });
      }}
      className="action-button button-primary mt-3 w-full"
      data-testid="button-turn-on-alerts"
    >
      <BellRing size={16} /> {busy ? 'Just a moment…' : 'Tell me when a pet goes missing nearby'}
    </button>
  );
}
