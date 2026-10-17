export function json(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}

const MAX_BODY = 20_000; // an order is about 1 KB; anything huge is refused

export function readBody(req) {
  let b = req.body;
  if (typeof b === 'string') {
    if (b.length > MAX_BODY) return null;
    try { b = JSON.parse(b || '{}'); } catch { return null; }
  }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b === undefined ? {} : null;
  if (JSON.stringify(b).length > MAX_BODY) return null;
  return b;
}

// Requests from a browser must come from our own website, not from another site.
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // server-to-server or same-origin GET; staff actions still need a login
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

export function clientIp(req) {
  return String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}

// In-memory limiter (per warm serverless instance). Blunts password guessing and form spam.
const hits = new Map();
const recent = (k, windowMs) => {
  const now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
  hits.set(k, arr);
  if (hits.size > 5000) hits.clear();
  return arr;
};
export const isLimited = (k, max, windowMs) => recent(k, windowMs).length >= max;
export const addHit = (k, windowMs) => { recent(k, windowMs).push(Date.now()); };

// Old helper kept for simple cases: counts this request and reports if over the limit.
export function rateLimit(req, key, max, windowMs) {
  const k = `${key}:${clientIp(req)}`;
  addHit(k, windowMs);
  return recent(k, windowMs).length > max;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
