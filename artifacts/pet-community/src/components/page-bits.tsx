/** Small presentational pieces shared across the app's pages. */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';

export type Notice = { tone: 'success' | 'error' | 'info'; text: string };
export type Notify = (notice: Notice) => void;

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-wrap pt-8 pb-6 md:pt-12 md:pb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="serif text-4xl md:text-5xl tracking-tight leading-[.98]" data-testid="text-page-title">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-xl leading-relaxed">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Avatar({ initials, className = '' }: { initials: string; className?: string }) {
  return (
    <span className={`avatar ${className}`} aria-hidden="true">
      {initials}
    </span>
  );
}

export function EmptyState({
  title,
  copy,
  icon: Icon = Search,
}: {
  title: string;
  copy: string;
  icon?: typeof Search;
}) {
  return (
    <div className="paper-card p-8 text-center">
      <Icon size={28} className="mx-auto text-muted-foreground mb-3" />
      <h3 className="serif text-xl">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{copy}</p>
    </div>
  );
}

/** A labelled statistic, used across the search, adoption and giving pages. */
export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="serif text-2xl mt-1 leading-none">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ pct, tone = 'accent' }: { pct: number; tone?: 'accent' | 'primary' }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="progress-fill"
        style={{
          width: `${clamped}%`,
          background: tone === 'primary' ? 'hsl(var(--primary))' : undefined,
        }}
      />
    </div>
  );
}

/** Re-renders on an interval so elapsed-time labels stay honest while a page sits open. */
/**
 * Walks a displayed number from where it was to where it now is.
 *
 * A total that jumps is easy to miss — people look away for the half second it
 * changes and cannot tell whether their contribution registered. Counting up
 * puts the change where the eye already is. Honours reduced-motion by snapping.
 */
export function useCountUp(target: number, duration = 850): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const latest = useRef(target);

  useEffect(() => {
    const start = from.current;
    if (start === target) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      from.current = target;
      latest.current = target;
      setShown(target);
      return;
    }

    let frame = 0;
    const began = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = start + (target - start) * eased;
      latest.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = target;
    };
    frame = requestAnimationFrame(step);

    // Leaving mid-count: resume from where the number actually is, not from the
    // target, so a second contribution still animates.
    return () => {
      cancelAnimationFrame(frame);
      from.current = latest.current;
    };
  }, [target, duration]);

  return shown;
}

/**
 * A number that counts to its new value and gives a short nudge when it lands,
 * so a change is felt as well as read.
 */
export function CountUp({
  value,
  format,
  className = '',
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const shown = useCountUp(value);
  const [nudge, setNudge] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setNudge(true);
    const timer = setTimeout(() => setNudge(false), 640);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span className={`${className}${nudge ? ' value-bump' : ''}`} data-counting={nudge || undefined}>
      {format(shown)}
    </span>
  );
}

export function useTicker(intervalMs = 15000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return tick;
}

export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readStored(key, fallback));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage can be unavailable; the app still works without persistence */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/**
 * Brings a panel into view when a selection opens it.
 *
 * List-and-detail layouts put the detail after the list, so on a narrow screen
 * — or any stacked breakpoint — the panel opens below the fold and the control
 * that opened it looks broken. Pass the selection key; the panel scrolls itself
 * into view when that changes, and only when it is actually off-screen, so
 * nothing jumps on a wide layout where both are already visible.
 */
export function useRevealWhen<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (key === null || key === undefined || key === false) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const alreadyVisible = rect.top >= 0 && rect.top < window.innerHeight * 0.6;
    if (alreadyVisible) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [key]);
  return ref;
}
