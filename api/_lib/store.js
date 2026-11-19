// Shared storage for the staff page: one private JSON file per kind of data, kept in RiskTech's own
// Vercel Blob store (free on the current plan). Nothing here is public: files are private and only
// this server can read or write them.
//   rt/policies.json   every policy issued from any device (no full NIN, only the last 4 digits)
//   rt/settings.json   website switches (e.g. a product paused)
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

// Tests swap in an in-memory store; on Vercel this is never set.
const backend = () => globalThis.__rtStore || null;

export const storeEnabled = () => !!(backend() || process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN));

async function readRaw(path) {
  if (backend()) return backend().read(path);
  const r = await get(path, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  const text = await new Response(r.stream).text();
  return { text, etag: r.blob.etag };
}

async function writeRaw(path, text, etag) {
  if (backend()) return backend().write(path, text, etag);
  const res = await put(path, text, {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    ...(etag ? { ifMatch: etag } : {}),
  });
  return { etag: res.etag };
}

const isConflict = (e) => e instanceof BlobPreconditionFailedError || e?.code === 'conflict';

export async function readJson(path, fallback) {
  const r = await readRaw(path);
  if (!r) return { data: fallback, etag: null };
  try { return { data: JSON.parse(r.text), etag: r.etag }; } catch { return { data: fallback, etag: r.etag }; }
}

// Read, change, write back. If someone else saved in between, start again (up to 5 times),
// so two staff members issuing at the same moment never overwrite each other.
export async function updateJson(path, fallback, change) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, etag } = await readJson(path, fallback);
    const next = change(structuredClone(data));
    if (next === null) return data; // nothing to save
    try {
      await writeRaw(path, JSON.stringify(next), etag);
      return next;
    } catch (e) {
      if (!isConflict(e) || attempt === 4) throw e;
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }
  throw new Error('Could not save after several tries.');
}

// ---------- Policies and activity (one file, so issuing a policy and logging it is ONE save) ----------
const POLICIES = 'rt/policies.json';
const EMPTY = { policies: [], activity: [], writes: { month: '', count: 0 } };

// Vercel's free plan allows 2,000 saves a month; going over blocks storage for 30 days.
// Above SOFT_LIMIT, small events (sign-ins, downloads, orders) are no longer logged,
// so the saves left are kept for policies.
export const SAVE_LIMIT = 2000;
export const SOFT_LIMIT = 1500;
const ACTIVITY_MAX = 2000;
const YEAR_MS = 365 * 24 * 3600 * 1000;
const month = () => new Date().toISOString().slice(0, 7);
const savesThisMonth = (d) => (d?.writes?.month === month() ? Number(d.writes.count) || 0 : 0);

const KINDS = ['login', 'login-failed', 'logout', 'order', 'issued', 'not-issued', 'no-answer', 'corrected', 'cancelled', 'download', 'setting', 'security', 'import', 'storage'];
const short = (v, n) => String(v ?? '').replace(/[<>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
function cleanEvent(e) {
  return {
    at: e.at || new Date().toISOString(),
    kind: KINDS.includes(e.kind) ? e.kind : 'setting',
    text: short(e.text, 300),
    device: short(e.device, 60),
    place: short(e.place, 60),
    ip: short(e.ip, 45),
  };
}

// Every save of the main file goes through here: count it, add any events, drop events older than a year.
function stamp(d, events = [], extraSaves = 0) {
  const out = { ...d };
  out.policies = Array.isArray(d.policies) ? d.policies : [];
  out.writes = { month: month(), count: savesThisMonth(d) + 1 + extraSaves };
  const cutoff = Date.now() - YEAR_MS;
  const old = Array.isArray(d.activity) ? d.activity : [];
  out.activity = [...events.map(cleanEvent).reverse(), ...old].filter((e) => Date.parse(e.at) > cutoff).slice(0, ACTIVITY_MAX);
  return out;
}

// Only these fields are ever stored. The full NIN is never stored.
const FIELDS = ['key', 'at', 'reference', 'product', 'premium', 'name', 'insured_type', 'firstname', 'lastname', 'nin_masked', 'phone', 'email',
  'address', 'reg_no', 'chassis_no', 'engine_no', 'vehicle_color', 'vehicle_type', 'body_type_id', 'start_date', 'end_date',
  'policy_id', 'policy_number', 'certificate_no', 'status', 'message', 'history'];
const clean = (r) => {
  const o = {};
  for (const k of FIELDS) if (r[k] !== undefined) o[k] = r[k];
  if (o.nin_masked && /\d{5,}/.test(String(o.nin_masked).replace(/\*/g, ''))) o.nin_masked = '*******' + String(o.nin_masked).slice(-4);
  if (Array.isArray(o.history)) o.history = o.history.slice(-20);
  return o;
};
const sameRecord = (a, b) => (a.policy_id && b.policy_id && String(a.policy_id) === String(b.policy_id)) || (a.key && a.key === b.key);

export async function listPolicies() {
  const { data } = await readJson(POLICIES, EMPTY);
  return Array.isArray(data?.policies) ? data.policies : [];
}

// Activity history plus how many saves were used this month
export async function listActivity() {
  const { data } = await readJson(POLICIES, EMPTY);
  return { activity: Array.isArray(data?.activity) ? data.activity : [], saves: savesThisMonth(data), limit: SAVE_LIMIT, softLimit: SOFT_LIMIT };
}

// Log events on their own. optional = skip when the month's saves are nearly used up.
// extraSaves counts a save made elsewhere (e.g. the settings file) in the monthly total.
export async function logActivity(events, { optional = true, extraSaves = 0 } = {}) {
  const list = (Array.isArray(events) ? events : [events]).filter(Boolean);
  if (!list.length) return { logged: false };
  let logged = false;
  await updateJson(POLICIES, EMPTY, (d) => {
    if (optional && savesThisMonth(d) >= SOFT_LIMIT) return null;
    logged = true;
    return stamp(d, list, extraSaves);
  });
  return { logged };
}

export async function savePolicy(record, events = []) {
  const r = clean(record);
  return updateJson(POLICIES, EMPTY, (d) => {
    const list = Array.isArray(d.policies) ? d.policies : [];
    const i = list.findIndex((x) => sameRecord(x, r));
    // never let a later "no answer" overwrite a policy NPF already issued
    if (i >= 0 && list[i].status === 'SUCCESS' && r.status !== 'SUCCESS' && r.status !== 'CANCELLED') return stamp({ ...d, policies: list }, events);
    if (i >= 0) list[i] = { ...list[i], ...r };
    else list.unshift(r);
    return stamp({ ...d, policies: list.slice(0, 5000) }, events);
  });
}

// Change a stored policy found by NPF's policy id; returns the updated record or null.
// events: a function given the updated record (or null), returning the activity to log in the same save
export async function patchPolicy(policyId, patch, note, events = () => []) {
  let found = null;
  await updateJson(POLICIES, EMPTY, (d) => {
    const list = Array.isArray(d.policies) ? d.policies : [];
    const i = list.findIndex((x) => String(x.policy_id) === String(policyId));
    if (i < 0) return stamp({ ...d, policies: list }, events(null));
    const history = [...(list[i].history || []), { at: new Date().toISOString(), note }].slice(-20);
    const merged = { ...list[i], ...patch, history };
    if (merged.insured_type !== 'company' && (patch.firstname || patch.lastname)) merged.name = `${merged.firstname || ''} ${merged.lastname || ''}`.trim();
    list[i] = clean(merged);
    found = list[i];
    return stamp({ ...d, policies: list }, events(found));
  });
  return found;
}

// One-time move of a device's own list into the shared list. Existing shared records win.
export async function importPolicies(records, events = () => []) {
  let added = 0;
  await updateJson(POLICIES, EMPTY, (d) => {
    added = 0; // the change can run again after a save conflict
    const list = Array.isArray(d.policies) ? d.policies : [];
    for (const raw of records) {
      const r = clean(raw);
      if (!r.key && !r.policy_id) continue;
      if (list.some((x) => sameRecord(x, r))) continue;
      list.push(r); added++;
    }
    list.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    return stamp({ ...d, policies: list.slice(0, 5000) }, events(added));
  });
  return added;
}

// ---------- Settings (product on/off) ----------
const SETTINGS = 'rt/settings.json';
let settingsCache = null; // { at, data }

export async function getSettings({ fresh = false } = {}) {
  if (!storeEnabled()) return { paused: {} };
  if (!fresh && settingsCache && Date.now() - settingsCache.at < 60_000) return settingsCache.data;
  try {
    const { data } = await readJson(SETTINGS, { paused: {} });
    const s = { paused: data && typeof data.paused === "object" && data.paused ? data.paused : {} };
    settingsCache = { at: Date.now(), data: s };
    return s;
  } catch {
    return settingsCache?.data || { paused: {} }; // storage down: never block sales by accident
  }
}

export async function setPaused(product, paused) {
  const next = await updateJson(SETTINGS, { paused: {} }, (d) => ({ ...d, paused: { ...(d.paused || {}), [product]: !!paused } }));
  settingsCache = { at: Date.now(), data: { paused: next.paused } };
  return next;
}

export const _resetSettingsCache = () => { settingsCache = null; };
