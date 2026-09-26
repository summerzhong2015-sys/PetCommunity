/**
 * A real photograph of an animal, with the drawn portrait behind it.
 *
 * The photographs are hosted by Unsplash, which means they are one outage, one
 * blocked request or one flaky connection away from a blank grey box where a
 * dog's face should be. So the portrait renders first and the photo fades in
 * over it once the browser confirms it actually decoded; if it never does, or
 * if it errors, what stays on screen is the drawing. A listing is never empty.
 */

import { useEffect, useRef, useState } from 'react';
import { PetPortrait, type PortraitSpec } from '@/components/pet-portrait';

/** Unsplash serves a resized, modern-format image from these parameters. */
function source(photo: string, width: number): string {
  return `https://images.unsplash.com/photo-${photo}?w=${width}&h=${width}&fit=crop&crop=faces,entropy&q=72&auto=format`;
}

export function PetPhoto({
  photo,
  portrait,
  alt,
  className = '',
  width = 600,
  rounded,
}: {
  photo?: string;
  portrait: PortraitSpec;
  alt: string;
  className?: string;
  width?: number;
  rounded?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement | null>(null);

  // A cached image can finish decoding before React attaches onLoad, which
  // would leave the photo permanently invisible behind the portrait.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth > 0) setLoaded(true);
  }, [photo]);

  const showPhoto = Boolean(photo) && !failed;

  return (
    <span className={`relative block overflow-hidden ${className}`} data-testid={`pet-photo-${photo ?? 'none'}`}>
      <PetPortrait spec={portrait} className="w-full h-full" rounded={rounded} />
      {showPhoto && (
        <img
          ref={img}
          src={source(photo!, width)}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </span>
  );
}
