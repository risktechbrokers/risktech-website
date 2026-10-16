export function json(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

// Simple in-memory limiter (per warm serverless instance). Good enough to blunt form spam.
const hits = new Map();
export function rateLimit(req, key, max, windowMs) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const k = `${key}:${ip}`;
  const now = Date.now();
  const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(k, arr);
  return arr.length > max;
}
