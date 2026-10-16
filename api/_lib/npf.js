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

const AUTH_RE = /account|enabled|authenticat|password|username|credential|unauthori/i;

// One attempt. Returns { status: SUCCESS | FAILED | RETRY | MANUAL_REVIEW, message, httpStatus }
export async function sendToNpf(policy, { fetchImpl = fetch } = {}) {
  const missing = configProblems();
  if (missing.length) {
    return { status: 'MANUAL_REVIEW', message: `Not sent: set ${missing.join(', ')} in Vercel settings.`, httpStatus: null };
  }
  let httpStatus = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const r = await fetchImpl(API_URL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildPayload(policy)),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    httpStatus = r.status;
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = null; }
    const apiStatus = body?.response?.status;
    const message = body?.response?.message || (body ? 'NPF returned no message.' : 'Unreadable response from NPF.');
    if (httpStatus >= 500) return { status: 'RETRY', message: `NPF server error (${httpStatus}). Try again in a few minutes.`, httpStatus };
    // HTTP 200 alone is not success: only response.status === true counts (NPF doc section 10)
    if (apiStatus === true) return { status: 'SUCCESS', message, httpStatus };
    if (AUTH_RE.test(message) || httpStatus === 401 || httpStatus === 403) return { status: 'MANUAL_REVIEW', message, httpStatus };
    return { status: 'FAILED', message, httpStatus };
  } catch (e) {
    const message = e?.name === 'AbortError' ? 'Timed out waiting for NPF. Try again.' : `Could not reach NPF: ${e?.message || e}`;
    return { status: 'RETRY', message, httpStatus };
  }
}
