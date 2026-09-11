/** Small presentational pieces shared across the app's pages. */

import { useEffect, useState, type ReactNode } from 'react';
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
