/**
 * Drag the photo, size the frame, then keep it.
 *
 * Deliberately one square window rather than a resizable rectangle: the avatar
 * is always shown square, so anything else would be promising a choice that
 * does not survive being saved.
 *
 * Works with a mouse, a finger and a keyboard — arrow keys nudge, and the zoom
 * is a real range input rather than pinch-only, because pinch is the one
 * gesture people with one hand full of dog cannot do.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import {
  MAX_ZOOM, MIN_ZOOM,
  centredOffset, clampZoom, cropFor, offsetAfterZoom, previewTransform,
} from '@/lib/photo-crop';
import { MAX_EDGE, QUALITY_STEPS, SOURCE_EDGE, withinBudget } from '@/lib/photo-upload';

const VIEWPORT = 248;

export function PhotoCropper({
  src,
  initialCrop,
  onDone,
  onCancel,
  onError,
}: {
  /** The full-size photo, as an object URL or data URL. */
  src: string;
  /** Where the frame was last time, so reopening starts where you left off. */
  initialCrop?: { x: number; y: number; size: number };
  onDone: (result: { avatar: string; source: string; crop: { x: number; y: number; size: number } }) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragging = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      if (initialCrop && initialCrop.size > 0) {
        // Reopen exactly where they left it, rather than jumping to the middle.
        const shortest = Math.min(img.naturalWidth, img.naturalHeight);
        setZoom(clampZoom(shortest / initialCrop.size));
        setOffset({ x: initialCrop.x, y: initialCrop.y });
      } else {
        setOffset(centredOffset(img.naturalWidth, img.naturalHeight, 1));
      }
    };
    img.onerror = () => onError('That photo could not be read. A JPEG or PNG usually works.');
    img.src = src;
  }, [src, initialCrop, onError]);

  if (!image) {
    return (
      <div className="mt-3 rounded-[1rem] bg-secondary grid place-items-center" style={{ height: VIEWPORT }}>
        <span className="text-xs text-muted-foreground">Opening your photo…</span>
      </div>
    );
  }

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const crop = cropFor(width, height, zoom, offset.x, offset.y);
  const view = previewTransform(width, height, crop, VIEWPORT);

  /** One screen pixel is this many photo pixels. */
  const perPixel = crop.size / VIEWPORT;

  function moveBy(dx: number, dy: number) {
    setOffset((current) => {
      const next = cropFor(width, height, zoom, current.x + dx, current.y + dy);
      return { x: next.x, y: next.y };
    });
  }

  function changeZoom(next: number) {
    const clamped = clampZoom(next);
    setOffset((current) => offsetAfterZoom(width, height, zoom, clamped, current.x, current.y));
    setZoom(clamped);
  }

  function save() {
    setSaving(true);
    try {
      const canvas = document.createElement('canvas');
      const size = Math.min(MAX_EDGE, crop.size);
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no canvas');
      context.drawImage(image!, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);

      // The source is kept too, a bit larger than the avatar, so the frame can
      // be moved again later without hunting for the file.
      const sourceCanvas = document.createElement('canvas');
      const sourceScale = Math.min(1, SOURCE_EDGE / Math.max(image!.naturalWidth, image!.naturalHeight));
      sourceCanvas.width = Math.max(1, Math.round(image!.naturalWidth * sourceScale));
      sourceCanvas.height = Math.max(1, Math.round(image!.naturalHeight * sourceScale));
      const sourceContext = sourceCanvas.getContext('2d');
      sourceContext?.drawImage(image!, 0, 0, sourceCanvas.width, sourceCanvas.height);
      const source = sourceCanvas.toDataURL('image/jpeg', 0.72);
      // The crop is in source-image pixels, so it has to be scaled with it.
      const scaledCrop = {
        x: Math.round(crop.x * sourceScale),
        y: Math.round(crop.y * sourceScale),
        size: Math.max(1, Math.round(crop.size * sourceScale)),
      };

      for (const quality of QUALITY_STEPS) {
        const encoded = canvas.toDataURL('image/jpeg', quality);
        if (withinBudget(encoded)) {
          onDone({ avatar: encoded, source, crop: scaledCrop });
          return;
        }
      }
      onError('That photo will not fit once saved. Try zooming in a little.');
    } catch {
      onError('That photo could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3" data-testid="photo-cropper">
      <div
        className="relative overflow-hidden rounded-[1.3rem] bg-secondary mx-auto touch-none cursor-grab active:cursor-grabbing select-none"
        style={{ width: VIEWPORT, height: VIEWPORT }}
        role="application"
        aria-label="Drag to move the photo, arrow keys to nudge"
        tabIndex={0}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 40 : 12;
          if (e.key === 'ArrowLeft') { e.preventDefault(); moveBy(-step * perPixel, 0); }
          if (e.key === 'ArrowRight') { e.preventDefault(); moveBy(step * perPixel, 0); }
          if (e.key === 'ArrowUp') { e.preventDefault(); moveBy(0, -step * perPixel); }
          if (e.key === 'ArrowDown') { e.preventDefault(); moveBy(0, step * perPixel); }
        }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          dragging.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
        }}
        onPointerMove={(e) => {
          const drag = dragging.current;
          if (!drag) return;
          // Moving the photo right means moving the window left.
          const next = cropFor(
            width, height, zoom,
            drag.originX - (e.clientX - drag.startX) * perPixel,
            drag.originY - (e.clientY - drag.startY) * perPixel,
          );
          setOffset({ x: next.x, y: next.y });
        }}
        onPointerUp={() => { dragging.current = null; }}
        onPointerCancel={() => { dragging.current = null; }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute max-w-none pointer-events-none"
          style={{ left: view.left, top: view.top, width: view.width, height: view.height }}
        />
        {/* The frame, drawn over the photo so it is obvious what will be kept. */}
        <div className="absolute inset-0 pointer-events-none rounded-[1.3rem] ring-2 ring-inset ring-card/70" />
      </div>

      <div className="flex items-center gap-2.5 mt-3">
        <button
          type="button"
          onClick={() => changeZoom(zoom - 0.25)}
          className="p-1.5 rounded-lg hover:bg-secondary shrink-0"
          aria-label="Show more of the photo"
          data-testid="button-zoom-out"
        >
          <Minus size={14} />
        </button>
        <label className="sr-only" htmlFor="crop-zoom">How much of the photo to show</label>
        <input
          id="crop-zoom"
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          value={zoom}
          onChange={(e) => changeZoom(Number(e.target.value))}
          className="flex-1 accent-[hsl(var(--primary))]"
          data-testid="input-zoom"
        />
        <button
          type="button"
          onClick={() => changeZoom(zoom + 0.25)}
          className="p-1.5 rounded-lg hover:bg-secondary shrink-0"
          aria-label="Fill the frame with less of the photo"
          data-testid="button-zoom-in"
        >
          <Plus size={14} />
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
        Drag the photo to move it. Arrow keys nudge.
      </p>

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="action-button button-primary flex-1 text-xs min-h-0 py-2 disabled:opacity-60"
          data-testid="button-save-crop"
        >
          <Check size={14} /> Use this
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="action-button button-quiet text-xs min-h-0 py-2"
          data-testid="button-cancel-crop"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
