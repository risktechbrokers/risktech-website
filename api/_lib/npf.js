import { PRODUCTS } from './config.js';

const API_URL = () => process.env.NPF_API_URL || 'https://agency.npfinsurance.com/policy/api';

// NPF wants MM/DD/YYYY
export const mdy = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${m}/${d}/${y}`;
};

export function buildPayload(p, { withCredentials = true } = {}) {
  const prod = PRODUCTS[p.product];
  return {
    CertificateNo: p.certificate_no,
    PolicyNo: p.policy_no,
    ChassisNo: p.chassis_no,
    ContactAddress: p.address,
    CoverNoteNo: '',
    EffectiveCoverDate: mdy(p.start_date),
    ExpirationDate: mdy(p.end_date),
    Email: p.email || '',
    EngineCapacity: p.engine_capacity || '',
    EngineNo: p.engine_no,
    GSMNo: p.phone,
    GeographicalZone: p.zone,
    InsuredName: p.insured_name,
    NiaNaicomID: process.env.NPF_NIA_NAICOM_ID || '',
    OldRegistrationNo: p.old_reg_no || p.reg_no,
    Username: withCredentials ? process.env.NPF_USERNAME || '' : '******',
    Password: withCredentials ? process.env.NPF_PASSWORD || '' : '******',
    Premium: Number(prod.premium),
    RegistrationNo: p.reg_no,
    SumAssured: Number(prod.sumAssured),
    TypeOfCover: prod.typeOfCover,
    CoverType: prod.coverType,
    VehicleCategory: prod.vehicleCategory,
    VehicleColor: p.vehicle_color,
    VehicleMake: p.vehicle_make,
    VehicleModel: p.vehicle_model,
    VehicleType: p.vehicle_type,
    YearofMake: String(p.year_of_make),
  };
}

export function configProblems() {
  return ['NPF_USERNAME', 'NPF_PASSWORD', 'NPF_NIA_NAICOM_ID'].filter((k) => !process.env[k]);
}

// Never let the NPF username or password travel back to the browser, even if NPF echoes them.
export function scrub(text) {
  let t = String(text ?? '');
  for (const k of ['NPF_PASSWORD', 'NPF_USERNAME']) {
    const v = process.env[k];
    if (v && v.length >= 3) t = t.split(v).join('******');
  }
  return t.replace(/("?(password|username)"?\s*[:=]\s*)"[^"]*"/gi, '$1"******"').slice(0, 1200);
}

const AUTH_RE = /account|enabled|activat|authenticat|password|username|credential|unauthori|forbidden|access denied/i;
const DUP_RE = /already|exist|duplicate/i;

// Plain-English explanation for staff, shown above NPF's own words.
export function explain(status, message, httpStatus) {
  if (status === 'SUCCESS') return 'NPF has accepted this policy. You can now download the certificate.';
  if (status === 'RETRY') return 'NPF did not answer properly. Nothing was confirmed. Wait a few minutes and press Send to NPF again.';
  if (status === 'MANUAL_REVIEW') {
    if (/Vercel settings/.test(message)) return 'The website is missing an NPF setting. Add it in Vercel and redeploy.';
    return 'NPF refused the login for RiskTech\'s account (it may not be activated yet). Send NPF\'s reply below to Aliyu.';
  }
  if (DUP_RE.test(message)) return 'NPF says this policy or certificate number already exists. Check the spreadsheet; if it is a new sale, use the next number.';
  if (httpStatus === 400 || httpStatus === 422) return 'NPF rejected some of the details. Read NPF\'s reply below, correct the field, and send again.';
  return 'NPF did not accept this policy. Read NPF\'s reply below. If it is unclear, send a screenshot to Aliyu.';
}

// Same policy sent twice within 30 minutes (double tap, refresh): answer from memory instead of sending again.
const accepted = new Map();
const ACCEPT_MS = 30 * 60_000;

// One attempt. Returns { status: SUCCESS | FAILED | RETRY | MANUAL_REVIEW, message, explain, raw, httpStatus }
export async function sendToNpf(policy, { fetchImpl = fetch, timeoutMs = 20000 } = {}) {
  const missing = configProblems();
  if (missing.length) {
    const message = `Not sent: set ${missing.join(', ')} in Vercel settings.`;
    return { status: 'MANUAL_REVIEW', message, explain: explain('MANUAL_REVIEW', message), raw: '', httpStatus: null };
  }
  // Only an identical policy (every field the same) counts as a repeat
  const key = JSON.stringify(buildPayload(policy, { withCredentials: false }));
  const prev = accepted.get(key);
  if (prev && Date.now() - prev.at < ACCEPT_MS) return { ...prev.result, repeat: true };

  let httpStatus = null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(API_URL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildPayload(policy)),
      signal: ctrl.signal,
    });
    httpStatus = r.status;
    const text = await r.text();
    const raw = scrub(text);
    let body; try { body = JSON.parse(text); } catch { body = null; }
    const resp = body?.response ?? body;
    const apiStatus = resp?.status;
    const message = scrub(resp?.message || (body ? 'NPF returned no message.' : 'Unreadable response from NPF.')).slice(0, 300);
    let status;
    if (httpStatus >= 500) status = 'RETRY';
    // HTTP 200 alone is not success: only response.status === true counts (NPF doc section 10)
    else if (apiStatus === true || apiStatus === 'true') status = 'SUCCESS';
    else if (httpStatus === 401 || httpStatus === 403 || AUTH_RE.test(message)) status = 'MANUAL_REVIEW';
    else status = 'FAILED';
    const result = { status, message: status === 'RETRY' ? `NPF server error (${httpStatus}).` : message, explain: explain(status, message, httpStatus), raw, httpStatus };
    if (status === 'SUCCESS') { accepted.set(key, { at: Date.now(), result }); if (accepted.size > 500) accepted.clear(); }
    return result;
  } catch (e) {
    const message = e?.name === 'AbortError' ? 'NPF took too long to answer.' : `Could not reach NPF (${scrub(e?.message || e).slice(0, 120)}).`;
    return { status: 'RETRY', message, explain: explain('RETRY', message), raw: '', httpStatus };
  } finally {
    clearTimeout(timer);
  }
}

// "Check NPF connection": confirms the settings exist and NPF's server answers. Sends no policy and no password.
export async function checkConnection({ fetchImpl = fetch } = {}) {
  const missing = configProblems();
  const url = new URL(API_URL());
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const started = Date.now();
  let reachable = false; let httpStatus = null; let error = '';
  try {
    const r = await fetchImpl(url.origin + '/', { method: 'GET', signal: ctrl.signal, redirect: 'manual' });
    httpStatus = r.status; reachable = true;
  } catch (e) {
    error = e?.name === 'AbortError' ? 'No answer within 8 seconds.' : String(e?.message || e).slice(0, 120);
  } finally { clearTimeout(timer); }
  return {
    settingsOk: missing.length === 0,
    missing,
    naicomId: process.env.NPF_NIA_NAICOM_ID || '',
    reachable, httpStatus, ms: Date.now() - started, error,
    host: url.host,
  };
}
