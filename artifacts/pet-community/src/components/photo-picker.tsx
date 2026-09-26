/**
 * "Use a photo from your album."
 *
 * Reads a file the person chose, crops it square from the centre, redraws it
 * small, and re-encodes it until it fits the storage budget. Nothing leaves
 * the browser — there is no server to send it to — and the drawn portrait is
 * still there underneath if they change their mind.
 */

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  ACCEPTED_TYPES, MAX_EDGE, QUALITY_STEPS,
  centreCrop, checkFile, fitWithin, withinBudget,
} from '@/lib/photo-upload';

async function toSquareDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('could not decode'));
      img.src = url;
    });

    const crop = centreCrop(image.naturalWidth, image.naturalHeight);
    const size = fitWithin(crop.size, crop.size, MAX_EDGE).width;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('no canvas');
    context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, size, size);

    for (const quality of QUALITY_STEPS) {
      const encoded = canvas.toDataURL('image/jpeg', quality);
      if (withinBudget(encoded)) return encoded;
    }
    throw new Error('too large even at low quality');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoPicker({
  onPicked,
  onCleared,
  hasPhoto,
  onError,
}: {
  onPicked: (dataUrl: string) => void;
  onCleared: () => void;
  hasPhoto: boolean;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    const verdict = checkFile(file);
    if (!verdict.ok) {
      onError(verdict.reason);
      return;
    }
    setBusy(true);
    try {
      onPicked(await toSquareDataUrl(file));
    } catch {
      onError('That photo could not be read. A JPEG or PNG usually works.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2 mt-3">
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => void handle(e.target.files?.[0])}
        data-testid="input-photo-file"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="action-button button-quiet text-xs px-3 min-h-0 py-2 w-full disabled:opacity-60"
        data-testid="button-pick-photo"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
        {busy ? 'Reading…' : hasPhoto ? 'Choose another photo' : 'Use a photo'}
      </button>
      {hasPhoto && (
        <button
          type="button"
          onClick={onCleared}
          className="action-button button-quiet text-xs px-3 min-h-0 py-2 w-full"
          data-testid="button-clear-photo"
        >
          <Trash2 size={14} /> Back to the drawing
        </button>
      )}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Kept in this browser only — there is nowhere for it to be uploaded to.
      </p>
    </div>
  );
}
