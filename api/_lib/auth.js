// Signing helpers. Everything is checked on the server with a secret the browser never sees.
import crypto from 'node:crypto';

const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
const IDLE_MIN = 30;   // signed out after 30 minutes with no activity
const MAX_HOURS = 8;   // and after 8 hours in total, whatever happens

// A different key for each purpose, so a signature made for one thing can never be reused for another.
function sign(purpose, payload) {
  return crypto.createHmac('sha256', `${secret()}:${purpose}`).update(payload).digest('base64url');
}

function same(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Short fingerprint of the current password and 2-step secret: changing either signs everybody out at once.
const pwVersion = () => crypto.createHash('sha256').update(`${process.env.ADMIN_PASSWORD || ''}|${process.env.ADMIN_TOTP_SECRET || ''}`).digest('base64url').slice(0, 10);

export function checkPassword(pw) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !pw) return false;
  // Compare hashes so the check takes the same time whatever the length
  const a = crypto.createHash('sha256').update(String(pw)).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function readToken(token, graceMs = 0) {
  if (!secret() || !token) return null;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig || !same(sig, sign('session', payload))) return null;
  try {
    const t = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const now = Date.now();
    if (!(t.exp > now - graceMs) || !(t.iat > now - MAX_HOURS * 3600_000 - graceMs) || t.v !== pwVersion()) return null;
    return t;
  } catch { return null; }
}

// iat = when the person signed in (never changes); exp = 30 minutes after the last activity.
export function issueToken(iat = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ iat, exp: Math.min(Date.now() + IDLE_MIN * 60_000, iat + MAX_HOURS * 3600_000), v: pwVersion() })).toString('base64url');
  return `${payload}.${sign('session', payload)}`;
}

export const verifyToken = (token) => !!readToken(token);

const bearer = (req) => { const h = String(req.headers.authorization || ''); return h.startsWith('Bearer ') ? h.slice(7) : ''; };

export function isAdmin(req) {
  return !!readToken(bearer(req));
}

// A genuine session that ended in the last few minutes. Used ONLY to record "signed out" in the
// history after the 30-minute timer ran out; it never gives access to anything.
export function recentlySignedIn(req, graceMs = 15 * 60_000) {
  return !!readToken(bearer(req), graceMs);
}

// A fresh token with the same sign-in time and a new 30-minute window: activity keeps you signed in.
export function refreshToken(req) {
  const t = readToken(bearer(req));
  return t ? issueToken(t.iat) : null;
}

// Proof that a 2-step secret shown on the setup screen really came from this server.
export const signSetup = (s) => sign('totp-setup', String(s));
export const checkSetup = (s, proof) => !!secret() && same(proof, signSetup(s));

// Orders: the website signs each order, so the staff page can tell if a link was edited by hand.
const ORDER_KEYS = ['reference', 'created_at', 'product', 'insured_name', 'email', 'phone', 'address', 'zone', 'reg_no', 'old_reg_no',
  'chassis_no', 'engine_no', 'engine_capacity', 'vehicle_make', 'vehicle_model', 'vehicle_type', 'vehicle_color', 'year_of_make', 'start_date'];
const orderText = (o) => JSON.stringify(ORDER_KEYS.map((k) => String(o?.[k] ?? '')));
export const signOrder = (o) => (secret() ? sign('order', orderText(o)) : '');
export const verifyOrder = (o, sig) => !!secret() && same(sig, sign('order', orderText(o)));

// Order links: the whole order (including the NIN) is encrypted with a key only the server has.
// The link in the email can only be opened by a signed-in staff member, and any change to it is detected.
const orderKey = () => crypto.createHash('sha256').update(`order-lock:${secret()}`).digest();

export function lockOrder(o) {
  if (!secret()) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', orderKey(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(o), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}

export function unlockOrder(token) {
  try {
    const b = Buffer.from(String(token || ''), 'base64url');
    if (b.length < 29 || !secret()) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', orderKey(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    const o = JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch { return null; }
}
