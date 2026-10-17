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

// NPF receipt: given only when NPF says SUCCESS. A certificate can only be built with a matching receipt.
const RECEIPT_KEYS = ['policy_no', 'certificate_no', 'product', 'insured_name', 'reg_no', 'chassis_no', 'engine_no', 'start_date', 'end_date'];
const receiptText = (p) => JSON.stringify(RECEIPT_KEYS.map((k) => String(p?.[k] ?? '')));
export const npfReceipt = (p) => sign('npf-receipt', receiptText(p));
export const verifyReceipt = (p, r) => !!secret() && same(r, sign('npf-receipt', receiptText(p)));
