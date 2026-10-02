/**
 * "Use a photo from your album", then choose which part of it.
 *
 * Two stages on purpose. Picking a file and framing it are different decisions,
 * and squashing them together is how you end up with a centre crop of a dog's
 * shoulder. The cropper does the framing; this handles the file and the
 * storage budget.
 *
 * Nothing leaves the browser — there is no server to send it to — and the drawn
 * portrait is still there underneath if they change their mind.
 */

import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { ACCEPTED_TYPES, checkFile } from '@/lib/photo-upload';
import { PhotoCropper } from '@/components/photo-cropper';

export function PhotoPicker({
  onPicked,
  onCleared,
  hasPhoto,
  onError,
  reframe,
  existingSource,
  existingCrop,
  onReframeHandled,
  fileInputRef,
}: {
  onPicked: (result: { avatar: string; source: string; crop: { x: number; y: number; size: number } }) => void;
  onCleared: () => void;
  hasPhoto: boolean;
  onError: (message: string) => void;
  /** Set true to open straight into the cropper on the saved photo. */
  reframe?: boolean;
  existingSource?: string;
  existingCrop?: { x: number; y: number; size: number };
  onReframeHandled?: () => void;
  /** Lets a button elsewhere — the pencil on the picture — open the album. */
  fileInputRef?: { current: HTMLInputElement | null };
}) {
  const ownInput = useRef<HTMLInputElement | null>(null);
  const input = fileInputRef ?? ownInput;
  // The photo being framed, at full size. Held only until it is saved.
  const [pending, setPending] = useState<string | null>(null);

  function handle(file: File | undefined) {
    if (!file) return;
    const verdict = checkFile(file);
    if (!verdict.ok) {
      onError(verdict.reason);
      return;
    }
    // Revoke any previous one first, or a few goes in a row leak the lot.
    if (pending) URL.revokeObjectURL(pending);
    setPending(URL.createObjectURL(file));
    if (input.current) input.current.value = '';
  }

  function finish(result: { avatar: string; source: string; crop: { x: number; y: number; size: number } }) {
    if (pending) URL.revokeObjectURL(pending);
    setPending(null);
    onPicked(result);
  }

  function cancel() {
    if (pending) URL.revokeObjectURL(pending);
    setPending(null);
  }

  // Re-framing the photo already saved: no file picker, no second trip to the
  // album, and the frame starts exactly where it was left.
  if (reframe && existingSource) {
    return (
      <PhotoCropper
        src={existingSource}
        initialCrop={existingCrop}
        onDone={(result) => { onReframeHandled?.(); onPicked(result); }}
        onCancel={() => onReframeHandled?.()}
        onError={(m) => { onError(m); onReframeHandled?.(); }}
      />
    );
  }

  if (pending) {
    return <PhotoCropper src={pending} onDone={finish} onCancel={cancel} onError={(m) => { onError(m); cancel(); }} />;
  }

  return (
    <div className="flex flex-col gap-2 mt-3">
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => handle(e.target.files?.[0])}
        data-testid="input-photo-file"
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="action-button button-quiet text-xs px-3 min-h-0 py-2 w-full"
        data-testid="button-pick-photo"
      >
        <ImagePlus size={14} />
        {hasPhoto ? 'Choose another photo' : 'Use a photo'}
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
