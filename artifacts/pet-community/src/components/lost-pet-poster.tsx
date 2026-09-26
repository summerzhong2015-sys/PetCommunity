/**
 * A poster you could actually put on a lamp post.
 *
 * Laid out for how one is read: at three metres, by someone walking past who
 * was not looking for it. So the name and the photograph take the top half,
 * one instruction sits in the largest remaining type, and the details go in a
 * band at the bottom in the order a passer-by needs them — where, when, what
 * they look like, who to call.
 *
 * It prints. `@media print` hides the rest of the app and gives this the page,
 * because the whole point is that it ends up on paper.
 */

import { Phone, MapPin, Clock3, ShieldCheck } from 'lucide-react';
import { PetPhoto } from '@/components/pet-photo';
import type { LostCase } from '@/lib/lost-pet-data';
import { buildPoster } from '@/lib/lost-pet-poster';

export function LostPetPoster({ item, minutesMissing }: { item: LostCase; minutesMissing: number }) {
  const poster = buildPoster(item, minutesMissing);

  return (
    <div
      className="poster rounded-[1.2rem] border border-border overflow-hidden bg-card"
      data-testid={`poster-${item.id}`}
    >
      <div className="bg-destructive text-destructive-foreground text-center py-3">
        <p className="mono text-xs uppercase tracking-[.4em]">Missing</p>
      </div>

      <div className="p-6 text-center">
        <h2 className="serif text-5xl leading-none">{poster.petName}</h2>
        <p className="text-sm text-muted-foreground mt-2">{poster.descriptor}</p>

        <PetPhoto
          photo={item.photo}
          portrait={item.portrait}
          alt={`${item.petName}, a ${item.breed}`}
          className="w-full aspect-square rounded-[1rem] mt-4"
          width={640}
        />

        <p
          className={`mt-5 px-4 py-3 rounded-[.8rem] serif text-xl leading-tight ${
            poster.instructionIsWarning
              ? 'bg-destructive/12 text-destructive'
              : 'bg-primary/10 text-primary'
          }`}
          data-testid={`poster-instruction-${item.id}`}
        >
          {poster.instruction}
        </p>

        <p className="prose-note no-cap mx-auto mt-4 text-left">{poster.blurb}</p>
      </div>

      <dl className="border-t border-border grid grid-cols-2 text-left">
        <div className="p-4 border-r border-border">
          <dt className="eyebrow flex items-center gap-1.5">
            <MapPin size={12} /> Last seen
          </dt>
          <dd className="text-sm font-bold mt-1">{poster.lastSeen}</dd>
        </div>
        <div className="p-4">
          <dt className="eyebrow flex items-center gap-1.5">
            <Clock3 size={12} /> Missing
          </dt>
          <dd className="text-sm font-bold mt-1">{poster.missingFor}</dd>
        </div>
        <div className="p-4 border-t border-r border-border">
          <dt className="eyebrow">Markings</dt>
          <dd className="text-sm mt-1">{poster.markings}</dd>
        </div>
        <div className="p-4 border-t border-border">
          <dt className="eyebrow">Microchipped</dt>
          <dd className="text-sm mt-1">{poster.microchipped ? 'Yes — please scan' : 'Not chipped'}</dd>
        </div>
      </dl>

      <div className="bg-secondary p-5 text-center border-t border-border">
        <p className="eyebrow flex items-center justify-center gap-1.5">
          <Phone size={12} /> If you see {poster.petName}
        </p>
        <p className="serif text-2xl mt-1.5">{poster.contact}</p>
        <p className="text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
          <ShieldCheck size={11} /> Posted through PetCommunity — no address is shared
        </p>
      </div>
    </div>
  );
}
