import { describeShared } from '@/lib/shared-status';
import type { SharedStatus } from '@/lib/shared';

/**
 * Whether what you are looking at is the shared copy.
 *
 * A page that silently falls back to this browser looks exactly like a page
 * that is working, which is how you end up posting into a void and only
 * finding out when somebody says they cannot see it.
 */
export function SharedLine({ status }: { status: SharedStatus }) {
  const line = describeShared(status);
  const colour = line.tone === 'good' ? 'bg-primary' : line.tone === 'waiting' ? 'bg-muted-foreground' : 'bg-destructive';
  return (
    <p
      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
      title={line.detail}
      data-testid={`status-shared-${status}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colour}`} aria-hidden="true" />
      <span className="sr-only">{line.detail}</span>
      <span aria-hidden="true">{line.label}</span>
    </p>
  );
}
