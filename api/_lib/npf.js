// NPF Motor Insurance Platform: Partner API (manual v1.0, October 2026).
// Base URL https://motor.npfinsurance.com/partner, X-Api-Key / X-Api-Secret headers on every call.
import { PRODUCTS, LGAS, insuredName, addYearMinusDay } from '../../shared/motor.js';

const BASE = () => (process.env.NPF_API_BASE || 'https://motor.npfinsurance.com/partner').replace(/\/+$/, '');

export function configProblems() {
  return ['NPF_API_KEY', 'NPF_API_SECRET'].filter((k) => !process.env[k]);
}

// Never let the key or secret travel back to the browser, even if NPF echoes them.
export function scrub(text) {
  let t = String(text ?? '');
  for (const k of ['NPF_API_SECRET', 'NPF_API_KEY']) {
    const v = process.env[k];
    if (v && v.length >= 6) t = t.split(v).join('******');
  }
  return t.slice(0, 1500);
}

async function call(method, path, { body, pdf = false, timeoutMs = 25000, fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(BASE() + path, {
      method,
      headers: {
        'X-Api-Key': process.env.NPF_API_KEY || '',
        'X-Api-Secret': process.env.NPF_API_SECRET || '',
        Accept: pdf ? 'application/pdf' : 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (pdf && r.ok && /pdf/i.test(r.headers.get('content-type') || '')) {
      return { ok: true, status: r.status, pdf: Buffer.from(await r.arrayBuffer()), filename: (r.headers.get('content-disposition') || '').match(/filename="?([^";]+)"?/)?.[1] || '' };
    }
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { ok: r.ok && json?.status !== false, status: r.status, json, raw: scrub(text) };
  } catch (e) {
    return { ok: false, status: null, error: e?.name === 'AbortError' ? 'timeout' : 'network', detail: scrub(e?.message || e).slice(0, 150) };
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Reference data (makes, body types, products), cached ----------
let refCache = null; // { at, data }
const REF_MS = 6 * 3600_000;

export async function getReference({ fresh = false, allowStale = true, fetchImpl } = {}) {
  if (!fresh && refCache && Date.now() - refCache.at < REF_MS) return { ok: true, data: refCache.data, cached: true };
  if (configProblems().length) return { ok: false, status: null, message: `Missing in Vercel: ${configProblems().join(', ')}.` };
  const r = await call('GET', '/reference', { fetchImpl, timeoutMs: 15000 });
  if (r.ok && r.json?.status === true) {
    refCache = { at: Date.now(), data: r.json };
    return { ok: true, data: r.json };
  }
  if (refCache && allowStale && r.status !== 401) return { ok: true, data: refCache.data, stale: true };
  return { ok: false, status: r.status, message: r.json?.message || (r.error === 'timeout' ? 'NPF took too long to answer.' : r.error ? 'Could not reach NPF.' : 'NPF did not return the lists.'), raw: r.raw };
}

// Which NPF product and vehicle type each RiskTech product uses.
// Can be fixed in Vercel with NPF_PRODUCT_ID_PRIVATE_MOTOR / NPF_PRODUCT_ID_MOTORCYCLE if NPF has several similar products.
export function mapProducts(ref) {
  const out = {};
  const types = ref?.vehicle_types || [];
  const prods = ref?.products || [];
  for (const [key, p] of Object.entries(PRODUCTS)) {
    const vt = types.find((t) => p.npfVehicleType.test(t.name || ''));
    const envId = Number(process.env[`NPF_PRODUCT_ID_${key.toUpperCase()}`]);
    let prod = envId ? prods.find((x) => x.id === envId) : null;
    if (!prod && vt) {
      const fits = prods.filter((x) => (x.compatible_vehicle_type_ids || []).includes(vt.id));
      prod = fits.find((x) => /third/i.test(`${x.name} ${x.code}`)) || fits[0] || null;
    }
    out[key] = prod && vt ? {
      voucher_type_id: prod.id,
      product_name: prod.name,
      vehicle_type_id: (prod.compatible_vehicle_type_ids || []).includes(vt.id) ? vt.id : (prod.compatible_vehicle_type_ids || [])[0],
      vehicle_type_name: vt.name,
      make_ids: prod.compatible_vehicle_make_ids || [],
      price_per_unit: prod.price_per_unit,
    } : null;
  }
  return out;
}

// What the public buy form needs: makes, models, body types and which makes fit each product. No prices.
export function publicLists(ref) {
  const map = mapProducts(ref);
  return {
    makes: (ref?.vehicle_makes || []).map((m) => ({ id: m.id, name: m.name, models: (m.models || []).map((x) => ({ id: x.id, name: x.name })) })),
    body_types: (ref?.body_types || []).map((b) => ({ id: b.id, name: b.name })),
    products: Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v ? { make_ids: v.make_ids } : null])),
  };
}

// Checks the order against NPF's lists before spending anything. Returns an error message or null.
export function checkAgainstReference(order, ref) {
  const map = mapProducts(ref)[order.product];
  if (!map) return { field: 'product', message: `NPF has no matching product for ${PRODUCTS[order.product].short} on RiskTech's account. Ask NPF to enable it.` };
  const make = (ref.vehicle_makes || []).find((m) => m.id === order.vehicle_make_id);
  if (!make) return { field: 'vehicle_make_id', message: 'This make is not on NPF\'s list. Pick it again.' };
  if (map.make_ids.length && !map.make_ids.includes(make.id)) return { field: 'vehicle_make_id', message: `NPF does not allow ${make.name} for ${map.product_name}.` };
  if (order.vehicle_model_id && !(make.models || []).some((x) => x.id === order.vehicle_model_id)) return { field: 'vehicle_model_id', message: 'This model does not belong to the make. Pick it again.' };
  if (!(ref.body_types || []).some((b) => b.id === order.body_type_id)) return { field: 'body_type_id', message: 'This body type is not on NPF\'s list. Pick it again.' };
  if (!LGAS[order.state]?.includes(order.lga)) return { field: 'lga', message: 'Pick the LGA again.' };
  return null;
}

export function buildPayload(o, map) {
  const p = {
    insured_type: o.insured_type,
    mobile_no: o.phone,
    state: o.state,
    lga: o.lga,
    address: o.address,
    nin: String(o.nin), // always a string, or a leading zero is lost
    vehicle_type_id: map.vehicle_type_id,
    body_type_id: o.body_type_id,
    vehicle_make_id: o.vehicle_make_id,
    plate_number: o.reg_no,
    chassis_number: o.chassis_no,
    engine_number: o.engine_no,
    vehicle_color: o.vehicle_color,
    voucher_type_id: map.voucher_type_id,
    policy_start_date: o.start_date,
    policy_end_date: addYearMinusDay(o.start_date),
  };
  if (o.insured_type === 'company') { p.company_name = o.company_name; if (o.company_rc_number) p.company_rc_number = o.company_rc_number; }
  else { p.firstname = o.firstname; p.lastname = o.lastname; }
  if (o.email) p.email = o.email;
  if (o.vehicle_model_id) p.vehicle_model_id = o.vehicle_model_id;
  if (o.engine_capacity) p.engine_capacity = o.engine_capacity;
  if (Number(o.year_of_make)) p.vehicle_year = Number(o.year_of_make);
  return p;
}

// Plain-English explanation for staff, shown above NPF's own words.
export function explain(status, httpStatus, message) {
  if (status === 'SUCCESS') return 'NPF has issued this policy. Download the Certificate and Brown Card below.';
  if (status === 'UNKNOWN') return 'NPF did not answer in time, so we do not know if the policy was created. Do NOT send again: that could create a second policy and use a second unit. WhatsApp Aliyu the plate number and the time, and ask whether it was created.';
  if (httpStatus === 401) return 'NPF did not accept RiskTech\'s API Key or Secret. Check NPF_API_KEY and NPF_API_SECRET in Vercel, or ask NPF if the account is active.';
  if (httpStatus === 402 && /unit/i.test(message)) return 'RiskTech\'s NPF wallet has no units left for this product. Ask NPF to load units, then send again. Nothing was used.';
  if (httpStatus === 402) return 'NPF could not save the policy and used no unit. Check the details and send again. If it repeats, contact NPF.';
  if (httpStatus === 422) return 'NPF rejected a detail and used no unit. Read "NPF said" below, correct it, and send again.';
  return 'NPF did not issue the policy. Read NPF\'s reply below. If it is unclear, send a screenshot to Aliyu.';
}

// Issue one policy. Never retried automatically: NPF has no protection against duplicates.
export async function issuePolicy(order, map, { fetchImpl } = {}) {
  const r = await call('POST', '/policies', { body: buildPayload(order, map), fetchImpl, timeoutMs: 25000 });
  const message = scrub(r.json?.message || '').slice(0, 300);
  if (r.status === 201 && r.json?.status === true && r.json.policy_id) {
    return {
      status: 'SUCCESS', httpStatus: 201, message,
      policy_id: r.json.policy_id, policy_number: String(r.json.policy_number || ''), certificate_no: String(r.json.certificate_no || ''),
      explain: explain('SUCCESS'), raw: r.raw,
    };
  }
  // A timeout, a lost connection, a server error or an unreadable reply: the policy MAY exist.
  if (!r.status || r.status >= 500 || (r.status === 201 && !r.json?.policy_id)) {
    return { status: 'UNKNOWN', httpStatus: r.status, message: r.error === 'timeout' ? 'No answer from NPF within 25 seconds.' : r.error ? 'The connection to NPF was lost.' : `NPF server error (${r.status}).`, explain: explain('UNKNOWN'), raw: r.raw || '' };
  }
  return { status: r.status === 401 ? 'ACCOUNT' : 'FAILED', httpStatus: r.status, message: message || 'NPF gave no reason.', explain: explain('FAILED', r.status, message), raw: r.raw };
}

export async function getDocument(policyId, kind, { fetchImpl } = {}) {
  const path = `/policies/${Number(policyId)}/${kind === 'brown-card' ? 'brown-card' : 'certificate'}`;
  const r = await call('GET', path, { pdf: true, fetchImpl, timeoutMs: 25000 });
  if (r.pdf) return { ok: true, pdf: r.pdf, filename: r.filename };
  const msg = r.json?.message || (r.error ? 'Could not reach NPF. Try again.' : 'NPF did not return the document.');
  return { ok: false, httpStatus: r.status, message: /not yet available/i.test(msg) ? 'NPF is still preparing this document. Wait a minute and try again.' : scrub(msg) };
}

const ENDORSABLE = ['firstname', 'lastname', 'company_name', 'company_rc_number', 'mobile_no', 'email', 'state', 'lga', 'address', 'nin', 'body_type_id', 'vehicle_make_id', 'vehicle_model_id', 'plate_number', 'chassis_number', 'engine_number', 'vehicle_color', 'engine_capacity', 'vehicle_year'];

export async function endorsePolicy(policyId, reason, changes, { fetchImpl } = {}) {
  const body = { endorsement_reason: String(reason) };
  for (const k of ENDORSABLE) if (changes[k] !== undefined && changes[k] !== '') body[k] = changes[k];
  const r = await call('POST', `/policies/${Number(policyId)}/endorse`, { body, fetchImpl });
  return { ok: r.ok && r.json?.status === true, httpStatus: r.status, message: scrub(r.json?.message || (r.error ? 'Could not reach NPF. It is safe to try again.' : 'No reply from NPF.')), fields_changed: r.json?.fields_changed || [], raw: r.raw };
}

export async function cancelPolicy(policyId, reason, { fetchImpl } = {}) {
  const r = await call('POST', `/policies/${Number(policyId)}/cancel`, { body: { cancellation_reason: String(reason) }, fetchImpl });
  return { ok: r.ok && r.json?.status === true, httpStatus: r.status, message: scrub(r.json?.message || (r.error ? 'Could not reach NPF. It is safe to try again.' : 'No reply from NPF.')), raw: r.raw };
}

// Free checks for "Check NPF connection": the reference call, and an empty issue request NPF must refuse (422 uses no unit).
export async function checkConnection({ fetchImpl } = {}) {
  const missing = configProblems();
  if (missing.length) return { ok: false, missing, message: `Missing in Vercel: ${missing.join(', ')}.` };
  const started = Date.now();
  const ref = await getReference({ fresh: true, allowStale: false, fetchImpl });
  const out = { ok: ref.ok, missing: [], ms: Date.now() - started };
  if (!ref.ok) return { ...out, message: ref.status === 401 ? 'NPF did not accept the API Key or Secret.' : ref.message, httpStatus: ref.status };
  const map = mapProducts(ref.data);
  out.products = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v ? { name: v.product_name, vehicle_type: v.vehicle_type_name, makes: v.make_ids.length, price_per_unit: v.price_per_unit } : null]));
  out.counts = { makes: (ref.data.vehicle_makes || []).length, body_types: (ref.data.body_types || []).length };
  // An empty request: NPF must answer 422 "Missing required field(s)". This proves sending works and uses no unit.
  const empty = await call('POST', '/policies', { body: {}, fetchImpl, timeoutMs: 15000 });
  out.sendTest = { httpStatus: empty.status, ok: empty.status === 422, message: scrub(empty.json?.message || '').slice(0, 200) };
  return out;
}

export const _resetCache = () => { refCache = null; };
export { insuredName };
