/**
 * A real photograph of an animal, with a drawing as the safety net.
 *
 * The drawing used to render underneath and the photo fade in over it, which
 * meant every card flashed a cartoon dog for a moment before the real animal
 * arrived — the drawing was doing its job as a fallback and also, accidentally,
 * as a loading state. So now nothing recognisable shows while an image is in
 * flight: a plain tinted block holds the space, the photo appears when it has
 * actually decoded, and the drawing appears only if the photo never arrives.
 *
 * The photographs are hosted by Unsplash, so they are one outage or one blocked
 * request away from a grey broken-image box. That is what the drawing is for.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PetPortrait, type PortraitSpec } from '@/components/pet-portrait';

/**
 * Unsplash serves a resized, modern-format image from these parameters.
 *
 * `height` defaults to a square because most of these are animal portraits; a
 * route banner passes its own, otherwise a landscape photo gets cropped to a
 * square and then stretched back out by the layout.
 */
function source(photo: string, width: number, height = width): string {
  return `https://images.unsplash.com/photo-${photo}?w=${width}&h=${height}&fit=crop&crop=faces,entropy&q=72&auto=format`;
}

export function PetPhoto({
  photo,
  portrait,
  fallback,
  alt,
  className = '',
  width = 600,
  height,
  rounded,
}: {
  photo?: string;
  /** Drawn likeness, shown only if the photograph cannot be loaded. */
  portrait?: PortraitSpec;
  /** What to show instead of a portrait when there is no drawing for this one. */
  fallback?: ReactNode;
  alt: string;
  className?: string;
  width?: number;
  /** Pixel height to request. Defaults to a square crop. */
  height?: number;
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
  // The drawing is the fallback, never the loading state.
  const showDrawing = !photo || failed;

  return (
    <span
      className={`relative block overflow-hidden bg-secondary ${className}`}
      data-testid={`pet-photo-${photo ?? 'none'}`}
      data-state={showDrawing ? 'drawn' : loaded ? 'photo' : 'loading'}
    >
      {showDrawing && portrait && <PetPortrait spec={portrait} className="w-full h-full" rounded={rounded} />}
      {showDrawing && !portrait && fallback}
      {/* While the photograph is in flight the space would otherwise be an
          empty block, which reads as something broken rather than something
          arriving. A shimmer says "coming". */}
      {showPhoto && !loaded && <span className="absolute inset-0 photo-loading" />}
      {showPhoto && (
        <img
          ref={img}
          src={source(photo!, width, height)}
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
