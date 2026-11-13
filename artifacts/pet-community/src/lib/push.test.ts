/**
 * Tests for the push helpers.
 *
 * The key conversion is the part that fails silently: a wrong byte array is
 * accepted by `subscribe` and then every push is rejected by Apple with a key
 * mismatch, which is a miserable thing to debug. So it is checked against a
 * known value here.
 *
 * Run with:  node --experimental-strip-types src/lib/push.test.ts
 */

import { urlBase64ToUint8Array } from './push.ts';

let pass = 0, fail = 0;
const out: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; out.push(`  ok   ${name}`); }
  else { fail++; out.push(`  FAIL ${name} ${detail}`); }
}

// --- base64url to bytes ---------------------------------------------------
{
  // "hello" in plain base64 is aGVsbG8=
  const hello = urlBase64ToUint8Array('aGVsbG8');
  check('decodes without padding', [...hello].join(',') === '104,101,108,108,111', [...hello].join(','));
  check('decodes with padding too', [...urlBase64ToUint8Array('aGVsbG8=')].join(',') === '104,101,108,108,111');

  // base64url swaps + and / for - and _; those bytes must come back the same.
  const plain = 'a+b/c9+/';
  const urlSafe = 'a-b_c9-_';
  check('- and _ mean + and /',
    [...urlBase64ToUint8Array(urlSafe)].join(',') === [...urlBase64ToUint8Array(plain)].join(','));

  // A real VAPID public key is 65 bytes and starts with 0x04 (an uncompressed
  // P-256 point). Anything else and Apple rejects every push we send.
  const vapidShaped = 'BAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0-P0A';
  const bytes = urlBase64ToUint8Array(vapidShaped);
  check('a VAPID-shaped key decodes to 65 bytes', bytes.length === 65, String(bytes.length));
  check('it keeps the uncompressed-point marker', bytes[0] === 4, String(bytes[0]));

  check('an empty string decodes to nothing', urlBase64ToUint8Array('').length === 0);
  check('the result is a real byte array', urlBase64ToUint8Array('aGVsbG8') instanceof Uint8Array);
  check('every byte is a byte', [...urlBase64ToUint8Array(vapidShaped)].every((b) => b >= 0 && b <= 255));
}

console.log(out.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
