// Signing helpers. Everything is checked on the server with a secret the browser never sees.
import crypto from 'node:crypto';

const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
const SESSION_HOURS = 8;

// A different key for each purpose, so a signature made for one thing can never be reused for another.
function sign(purpose, payload) {
  return crypto.createHmac('sha256', `${secret()}:${purpose}`).update(payload).digest('base64url');
}

function same(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Short fingerprint of the current password: changing ADMIN_PASSWORD signs everybody out at once.
const pwVersion = () => crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || '').digest('base64url').slice(0, 10);

export function checkPassword(pw) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !pw) return false;
  // Compare hashes so the check takes the same time whatever the length
  const a = crypto.createHash('sha256').update(String(pw)).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function issueToken(hours = SESSION_HOURS) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + hours * 3600_000, v: pwVersion() })).toString('base64url');
  return `${payload}.${sign('session', payload)}`;
}

export function verifyToken(token) {
  if (!secret() || !token) return false;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig || !same(sig, sign('session', payload))) return false;
  try {
    const t = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return t.exp > Date.now() && t.v === pwVersion();
  } catch { return false; }
}

export function isAdmin(req) {
  const h = String(req.headers.authorization || '');
  return verifyToken(h.startsWith('Bearer ') ? h.slice(7) : '');
}

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
