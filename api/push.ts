/**
 * Where a phone leaves its address, so the neighbourhood can reach it.
 *
 * Kept apart from /api/state on purpose, and write-only. A push subscription
 * is a private address for one person's phone; the shared state endpoint hands
 * its whole contents to anyone who asks, and these must never be in there.
 * There is no GET here at all.
 *
 * Sending is a separate job — see IOS.md. This half only collects.
 */

export const config = { runtime: 'edge' };

/** The web globals this function uses. See api/state.ts for why they are here. */
type WebRequest = { method: string; json: () => Promise<unknown> };
type WebResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<WebResponse>;
type ResponseLike = new (body: string, init: { status: number; headers: Record<string, string> }) => object;
const web = globalThis as unknown as { fetch: FetchLike; Response: ResponseLike };

const KEY = 'pc:push';
/** Enough for a neighbourhood several times over. The oldest fall off. */
const MAX_TARGETS = 2000;

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

function json(body: unknown, status = 200): object {
  return new web.Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Only an address that could have come from a real push service. */
function readTarget(value: unknown): { endpoint: string; p256dh: string; auth: string } | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const endpoint = typeof raw.endpoint === 'string' ? raw.endpoint : '';
  const p256dh = typeof raw.p256dh === 'string' ? raw.p256dh : '';
  const auth = typeof raw.auth === 'string' ? raw.auth : '';
  if (!endpoint.startsWith('https://') || endpoint.length > 600) return null;
  if (p256dh.length < 20 || p256dh.length > 200) return null;
  if (auth.length < 10 || auth.length > 100) return null;
  return { endpoint, p256dh, auth };
}

export default async function handler(request: WebRequest): Promise<object> {
  const at = store();
  if (!at) return json({ ok: false, reason: 'no-store' }, 501);

  // No reading. Ever. These are people's phones.
  if (request.method !== 'POST') return json({ ok: false, reason: 'write-only' }, 405);

  try {
    const body = (await request.json().catch(() => null)) as { target?: unknown; off?: boolean } | null;
    const target = readTarget(body?.target);
    if (!target) return json({ ok: false, reason: 'not-a-subscription' }, 400);

    const raw = await redis(['GET', KEY], at);
    let targets: { endpoint: string; p256dh: string; auth: string }[] = [];
    if (typeof raw === 'string' && raw !== '') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) targets = parsed.filter((t) => readTarget(t) !== null);
      } catch {
        targets = [];
      }
    }

    // One row per endpoint, so turning alerts off and on again does not leave
    // a phone listed twice and get it two of everything.
    const others = targets.filter((t) => t.endpoint !== target.endpoint);
    const next = body?.off === true ? others : [...others, target].slice(-MAX_TARGETS);
    await redis(['SET', KEY, JSON.stringify(next)], at);

    return json({ ok: true, listening: next.length });
  } catch (error) {
    return json({ ok: false, reason: 'store-error', detail: String(error).slice(0, 200) }, 502);
  }
}
