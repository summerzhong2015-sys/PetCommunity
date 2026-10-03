/**
 * Leaflet, fetched when a map is actually on screen.
 *
 * It comes from a CDN rather than the bundle on purpose: the map is one screen
 * of the app, and nobody who never opens their profile should pay to download
 * it. It also means no build step changes, which matters for a project that
 * deploys straight from the repo.
 *
 * Everything here is defensive about the load failing — on a flight, behind a
 * strict network, with the CDN down — because the page has to keep working
 * without it. The caller shows the landmark list instead.
 */

/** Only the handful of Leaflet we actually call. */
export type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  remove: () => void;
  setLatLng: (at: [number, number]) => void;
  bindTooltip: (text: string, options?: Record<string, unknown>) => LeafletLayer;
  setStyle: (options: Record<string, unknown>) => void;
};

export type LeafletMap = {
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
  setView: (at: [number, number], zoom?: number) => void;
  invalidateSize: () => void;
};

export type Leaflet = {
  map: (element: HTMLElement, options: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options: Record<string, unknown>) => LeafletLayer;
  circle: (at: [number, number], options: Record<string, unknown>) => LeafletLayer;
  circleMarker: (at: [number, number], options: Record<string, unknown>) => LeafletLayer;
};

const VERSION = '1.9.4';
const BASE = `https://unpkg.com/leaflet@${VERSION}/dist/`;

let pending: Promise<Leaflet> | null = null;

function addStylesheet(): void {
  if (document.querySelector('link[data-leaflet]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${BASE}leaflet.css`;
  link.setAttribute('data-leaflet', 'true');
  document.head.appendChild(link);
}

/** Resolves with Leaflet, or rejects if it cannot be had. Loads once per page. */
export function loadLeaflet(): Promise<Leaflet> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const existing = (window as unknown as { L?: Leaflet }).L;
  if (existing) return Promise.resolve(existing);
  if (pending) return pending;

  pending = new Promise<Leaflet>((resolve, reject) => {
    addStylesheet();
    const script = document.createElement('script');
    script.src = `${BASE}leaflet.js`;
    script.async = true;
    script.onload = () => {
      const loaded = (window as unknown as { L?: Leaflet }).L;
      if (loaded) resolve(loaded);
      else reject(new Error('Leaflet loaded but is not there'));
    };
    script.onerror = () => {
      pending = null;
      reject(new Error('Leaflet could not be reached'));
    };
    document.head.appendChild(script);
  });
  return pending;
}

/**
 * A theme colour as something Leaflet can draw with.
 *
 * The app keeps colours as HSL triples in custom properties so each section can
 * retint itself; Leaflet wants a plain colour string, so this reads the live
 * value rather than hardcoding one and losing the per-section palette.
 */
export function themeColour(property: string, fallback = '#2f6f52'): string {
  if (typeof window === 'undefined') return fallback;
  const triple = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  return triple ? `hsl(${triple})` : fallback;
}
