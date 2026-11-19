// 2-step login: the 6-digit codes shown by Google Authenticator / Microsoft Authenticator (RFC 6238).
// The shared secret lives only in the Vercel setting ADMIN_TOTP_SECRET.
import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf) {
  let bits = 0; let value = 0; let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0; let value = 0; const out = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) return null;
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

function codeAt(key, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

export const newSecret = () => base32Encode(crypto.randomBytes(20));

// Returns the time-step the code matched (to block re-use of the same code), or null.
// Accepts the previous and next 30-second window to allow for a phone clock that is slightly off.
export function verifyCode(secret, code, now = Date.now()) {
  const key = base32Decode(secret);
  const c = String(code || '').replace(/\D/g, '');
  if (!key || key.length < 10 || c.length !== 6) return null;
  const step = Math.floor(now / 30_000);
  for (const d of [0, -1, 1]) {
    const want = Buffer.from(codeAt(key, step + d));
    if (crypto.timingSafeEqual(want, Buffer.from(c))) return step + d;
  }
  return null;
}

// A too-short or mistyped secret counts as "off", so a bad paste can never lock everyone out
export const totpEnabled = () => (base32Decode(process.env.ADMIN_TOTP_SECRET || '')?.length || 0) >= 10;

export function otpauthUrl(secret) {
  const label = encodeURIComponent('RiskTech Staff:risktech-admin');
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent('RiskTech Staff')}&algorithm=SHA1&digits=6&period=30`;
}

export const _codeAt = (secret, step) => codeAt(base32Decode(secret), step); // tests only
