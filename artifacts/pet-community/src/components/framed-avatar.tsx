/**
 * A profile picture with a frame around it, and an optional edit badge.
 *
 * The frame is drawn in the section's own accent, so the same avatar looks
 * right in a green Walks tab and a plum Chip in tab without anybody choosing
 * twice. The picture is inset by however much room the frame needs, so a
 * frame never eats the face.
 */

import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { framePadding, ringPoints, scallopRing, type FrameId } from '@/lib/avatar-frame';

function FrameArt({ id }: { id: FrameId }) {
  if (id === 'none') return null;

  if (id === 'ring') {
    return (
      <>
        <circle cx="50" cy="50" r="47" fill="none" stroke="hsl(var(--accent))" strokeWidth="5" />
        <circle cx="50" cy="50" r="42.5" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" opacity="0.5" />
      </>
    );
  }

  if (id === 'scallop') {
    return <path d={scallopRing()} fillRule="evenodd" fill="hsl(var(--accent))" />;
  }

  if (id === 'stitch') {
    return (
      <>
        <circle cx="50" cy="50" r="47" fill="none" stroke="hsl(var(--accent))" strokeWidth="5.5" />
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.4"
          strokeDasharray="3.4 3.4"
          strokeLinecap="round"
          opacity="0.75"
        />
      </>
    );
  }

  if (id === 'paws') {
    return (
      <>
        <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--accent))" strokeWidth="9.5" />
        {ringPoints(7, 44).map((point) => (
          <g key={point.angle} transform={`translate(${point.x} ${point.y}) rotate(${point.angle + 90}) scale(1.95)`}>
            {/* One paw: a pad and four toes, punched out of the band. */}
            <ellipse cx="0" cy="1.2" rx="2.1" ry="1.7" fill="hsl(var(--card))" />
            <circle cx="-2.2" cy="-1.5" r="0.9" fill="hsl(var(--card))" />
            <circle cx="-0.75" cy="-2.4" r="0.9" fill="hsl(var(--card))" />
            <circle cx="0.75" cy="-2.4" r="0.9" fill="hsl(var(--card))" />
            <circle cx="2.2" cy="-1.5" r="0.9" fill="hsl(var(--card))" />
          </g>
        ))}
      </>
    );
  }

  if (id === 'daisy') {
    return (
      <>
        <circle cx="50" cy="50" r="44.5" fill="none" stroke="hsl(var(--accent))" strokeWidth="5" opacity="0.5" />
        {ringPoints(8, 44.5).map((point) => (
          <g key={point.angle} transform={`translate(${point.x} ${point.y}) rotate(${point.angle})`}>
            {[0, 72, 144, 216, 288].map((petal) => (
              <ellipse
                key={petal}
                cx="0"
                cy="-3.1"
                rx="1.9"
                ry="3.3"
                fill="hsl(var(--card))"
                stroke="hsl(var(--accent))"
                strokeWidth="0.7"
                transform={`rotate(${petal})`}
              />
            ))}
            <circle cx="0" cy="0" r="2" fill="hsl(var(--accent))" />
          </g>
        ))}
      </>
    );
  }

  if (id === 'tag') {
    return (
      <>
        {/* The loop the tag hangs from, then the tag itself, sitting below it. */}
        <circle cx="50" cy="6.8" r="5.2" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.6" />
        <circle cx="50" cy="52.5" r="43" fill="none" stroke="hsl(var(--accent))" strokeWidth="6" />
        <circle cx="50" cy="52.5" r="38.6" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.45" />
      </>
    );
  }

  return null;
}

export function FramedAvatar({
  frame,
  className = '',
  children,
  onEdit,
  editLabel = 'Change your picture',
}: {
  frame: FrameId;
  className?: string;
  /** The picture itself — usually a PetPhoto. */
  children: ReactNode;
  /** When given, a small pencil sits on the corner. */
  onEdit?: () => void;
  editLabel?: string;
}) {
  const pad = framePadding(frame);

  return (
    <span className={`relative inline-block ${className}`} data-testid={`framed-avatar-${frame}`}>
      <span
        className="absolute rounded-full overflow-hidden"
        style={{ inset: `${pad}%` }}
      >
        {children}
      </span>

      {frame !== 'none' && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          <FrameArt id={frame} />
        </svg>
      )}

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          title={editLabel}
          className="absolute -bottom-1 -right-1 grid place-items-center w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform"
          data-testid="button-edit-avatar"
        >
          <Pencil size={15} strokeWidth={2.4} />
        </button>
      )}
    </span>
  );
}
