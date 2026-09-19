/**
 * Tests for deciding whether a host can supply a Clerk key.
 *
 * Pinned to a real failure: the deployed site at petcommunity-mvp.vercel.app
 * showed a white page on /sign-in because Replit's helper derived a perfectly
 * well-formed key from the Vercel hostname. Clerk then tried to load its script
 * from clerk.petcommunity-mvp.vercel.app, which does not exist:
 *
 *   failed to load script: https://clerk.petcommunity-mvp.vercel.app/npm/...
 *   code: failed_to_load_clerk_js
 *
 * Checking the key's shape does not catch that — the derived key looks real.
 * Only the host can tell you whether derivation means anything.
 *
 * Run with:  pnpm --filter @workspace/pet-community run test:clerk-host
 */

import { chooseKey, hostSuppliesKey, isUsableKey } from './clerk-host.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

/** What Replit's helper produces from a hostname: pk_live_ + base64(host + "$"). */
const derivedFrom = (host: string) => 'pk_live_' + Buffer.from(`clerk.${host}$`).toString('base64');

const REAL_KEY = 'pk_test_Y2xlcmsuZXhhbXBsZS5jb20k';

// --- key shape ---
{
  check('a real test key is usable', isUsableKey(REAL_KEY));
  check('a real live key is usable', isUsableKey('pk_live_Y2xlcmsuZXhhbXBsZS5jb20k'));
  check('surrounding whitespace is tolerated', isUsableKey(`  ${REAL_KEY}  `));
  for (const bad of ['', '   ', 'pk_test_', 'sk_test_abcdefgh', 'not-a-key', 'pk_prod_abcdefgh', null, undefined, 42, {}]) {
    check(`rejects ${JSON.stringify(bad)}`, !isUsableKey(bad));
  }
  // The crux: a derived key passes every shape check there is.
  check('a host-derived key is shaped exactly like a real one',
    isUsableKey(derivedFrom('petcommunity-mvp.vercel.app')),
    'shape alone cannot tell them apart');
}

// --- which hosts actually inject a key ---
{
  for (const host of ['x.replit.dev', 'abc-123.replit.dev', 'myapp.replit.app', 'thing.repl.co']) {
    check(`${host} supplies a key`, hostSuppliesKey(host));
  }
  for (const host of [
    'petcommunity-mvp.vercel.app', 'localhost', '127.0.0.1', 'example.com',
    'petcommunity.netlify.app', 'replit.dev.evil.com', 'notreplit.app', 'myrepl.co',
  ]) {
    check(`${host} does not supply a key`, !hostSuppliesKey(host));
  }
}

// --- the decision, end to end ---
{
  const derive = (h: string) => derivedFrom(h);

  check('Vercel with no env var runs without accounts — the actual bug',
    chooseKey({ explicit: undefined, hostname: 'petcommunity-mvp.vercel.app', derive }) === undefined);
  check('localhost with no env var runs without accounts',
    chooseKey({ explicit: undefined, hostname: 'localhost', derive }) === undefined);
  check('Replit still gets its derived key',
    chooseKey({ explicit: undefined, hostname: 'my-app.replit.dev', derive }) === derivedFrom('my-app.replit.dev'));

  check('an explicit key wins on any host',
    chooseKey({ explicit: REAL_KEY, hostname: 'petcommunity-mvp.vercel.app', derive }) === REAL_KEY);
  check('an explicit key beats derivation on Replit too',
    chooseKey({ explicit: REAL_KEY, hostname: 'my-app.replit.dev', derive }) === REAL_KEY);
  check('a junk env var falls through rather than being used',
    chooseKey({ explicit: 'paste-your-key-here', hostname: 'petcommunity-mvp.vercel.app', derive }) === undefined);

  check('a throwing deriver does not take the app down',
    chooseKey({ explicit: undefined, hostname: 'my-app.replit.dev', derive: () => { throw new Error('nope'); } }) === undefined);
  check('a deriver returning junk is ignored',
    chooseKey({ explicit: undefined, hostname: 'my-app.replit.dev', derive: () => 'whatever' }) === undefined);
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
