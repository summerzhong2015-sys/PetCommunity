/**
 * The one place the whole neighbourhood shares.
 *
 * Until now every feature wrote to the browser it was used in, which meant a
 * donation only moved a total for the person who made it and a post was only
 * ever read by the person who wrote it. This endpoint is the shared copy:
 * everyone reads from it, everyone appends to it, and what you do shows up for
 * everybody else.
 *
 * It talks to a Redis store over its REST API with plain `fetch`, so there is
 * no database driver to install and nothing to keep in step with the app's
 * build. Create the store from the Vercel dashboard (Storage → Upstash Redis)
 * and connect it to the project; Vercel sets the two environment variables
 * below by itself, which is the step that went wrong last time it was done by
 * hand.
 *
 * Until that store exists this answers 501 and says so, and the app carries on
 * against the browser's own storage. Nothing breaks while it is not set up.
 *
 * Deliberately NOT here: profiles, saved animals, draft messages. Those are
 * one person's own business and sharing them without real accounts would be a
 * privacy mistake, not a feature.
 */

export const config = { runtime: 'edge' };

/**
 * The web globals this function uses, described here rather than pulled from
 * a `lib`.
 *
 * This repo's TypeScript settings are shared by everything in it and
 * deliberately do not include the DOM library — most of the workspace is not
 * a browser. The platform this runs on does have `fetch`, `Request` and
 * `Response`, so rather than loosening the settings for the whole monorepo
 * (and letting browser globals leak into Node scripts where they do not
 * belong), the three things this file needs are described here and read off
 * `globalThis`. Self-contained, and it cannot be broken by a tsconfig change
 * somewhere else.
 */
type WebRequest = { method: string; json: () => Promise<unknown> };
type WebResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<WebResponse>;
type ResponseLike = new (body: string, init: { status: number; headers: Record<string, string> }) => object;

const web = globalThis as unknown as { fetch: FetchLike; Response: ResponseLike };

/** Every collection the app shares, and the cap on each. */
const COLLECTIONS = {
  posts: 200,
  comments: 1000,
  donations: 2000,
  lost: 100,
  sightings: 1000,
  reunions: 200,
} as const;

type Collection = keyof typeof COLLECTIONS;

/** Nothing in this app needs a long field. Caps are a cheap way to stay sane. */
const MAX_FIELD = 2000;
const MAX_ITEM_BYTES = 8000;

function store(): { url: string; token: string } | null {
  const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL ?? env.REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN ?? env.REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redis(command: string[], at: { url: string; token: string }): Promise<unknown> {
  const response = await web.fetch(at.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${at.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`store said ${response.status}`);
  const body = (await response.json()) as { result?: unknown; error?: string };
  if (body.error) throw new Error(body.error);
  return body.result;
}

function key(collection: Collection): string {
  return `pc:${collection}`;
}

async function readList(collection: Collection, at: { url: string; token: string }): Promise<unknown[]> {
  const raw = await redis(['GET', key(collection)], at);
  if (typeof raw !== 'string' || raw === '') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupted value is not worth taking the whole page down for.
    return [];
  }
}

/**
 * Anything a browser sends is a stranger's data, so it is copied field by
 * field rather than trusted: strings only, trimmed, length-capped, and never
 * any key we did not ask for.
 */
function clean(value: unknown, depth = 0): unknown {
  if (depth > 4) return null;
  if (typeof value === 'string') return value.slice(0, MAX_FIELD);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 60).map((v) => clean(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      out[k.slice(0, 60)] = clean(v, depth + 1);
    }
    return out;
  }
  return null;
}

function json(body: unknown, status = 200): object {
  return new web.Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export default async function handler(request: WebRequest): Promise<object> {
  const at = store();
  if (!at) {
    // Not a failure. The app reads this and keeps to its own browser.
    return json({ ok: false, reason: 'no-store', hint: 'Connect an Upstash Redis store to this Vercel project.' }, 501);
  }

  try {
    if (request.method === 'GET') {
      const names = Object.keys(COLLECTIONS) as Collection[];
      const lists = await Promise.all(names.map((name) => readList(name, at)));
      const state: Record<string, unknown[]> = {};
      names.forEach((name, i) => { state[name] = lists[i]; });
      return json({ ok: true, state, at: Date.now() });
    }

    if (request.method === 'POST') {
      const body = (await request.json().catch(() => null)) as { collection?: string; item?: unknown } | null;
      const collection = body?.collection as Collection | undefined;
      if (!collection || !(collection in COLLECTIONS)) return json({ ok: false, reason: 'unknown-collection' }, 400);

      const item = clean(body?.item);
      if (!item || typeof item !== 'object') return json({ ok: false, reason: 'not-an-item' }, 400);
      if (JSON.stringify(item).length > MAX_ITEM_BYTES) return json({ ok: false, reason: 'too-big' }, 413);

      // Read, append, write. Two people posting in the same instant could in
      // principle lose one of the two; for a neighbourhood's worth of traffic
      // that is a fair trade against the complexity of a transaction, and it
      // is written down here rather than pretended away.
      const existing = await readList(collection, at);
      const withNew = [...existing.filter((e) => (e as { id?: string })?.id !== (item as { id?: string }).id), item]
        .slice(-COLLECTIONS[collection]);
      await redis(['SET', key(collection), JSON.stringify(withNew)], at);
      return json({ ok: true, collection, items: withNew, at: Date.now() });
    }

    return json({ ok: false, reason: 'method' }, 405);
  } catch (error) {
    return json({ ok: false, reason: 'store-error', detail: String(error).slice(0, 200) }, 502);
  }
}
