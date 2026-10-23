// Shared by the website (browser) and the serverless functions.
// Change prices, wording or the bank account here and both sides follow.
import { LGAS, NPF_STATES } from './lgas.js';

export { LGAS };
export const STATES = NPF_STATES;

// RiskTech's selling prices. NPF's own product and vehicle-type numbers come from NPF's reference list.
export const PRODUCTS = {
  private_motor: {
    label: 'Private Motor (Third Party)',
    short: 'Private Motor',
    premium: 15000,
    npfVehicleType: /private/i,      // which NPF vehicle type this product is for
  },
  motorcycle: {
    label: 'Motorcycle (Third Party)',
    short: 'Motorcycle',
    premium: 3000,
    npfVehicleType: /motor\s*cycle|bike/i,
  },
};

export const BANK = {
  bankName: 'Jaiz Bank',
  accountName: 'Risktech Insurance Brokers',
  accountNumber: '0025096325',
};

// One number for everything: calls, WhatsApp and payment receipts
export const WHATSAPP = '2349134206766';
export const CONTACT_PHONE = '09134206766';
export const CONTACT_PHONE_DISPLAY = '0913 420 6766';
export const CONTACT_EMAIL = 'risktechbrokers@gmail.com';

// NPF's public page where customers download their own Certificate and Brown Card
export const NPF_LOOKUP_URL = 'https://motor.npfinsurance.com/policy-lookup';

const clean = (v, max = 200) =>
  String(v ?? '').replace(/<[^>]*>/g, '').replace(/[<>"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const normReg = (v) => clean(v, 20).toUpperCase().replace(/[\s-]/g, '');
const normVin = (v) => clean(v, 30).toUpperCase().replace(/\s/g, '');
const toId = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const own = (obj, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(obj, k);

export function normalisePhone(v) {
  let p = String(v ?? '').replace(/[^\d+]/g, '');
  if (p.startsWith('+234')) p = '0' + p.slice(4);
  else if (p.startsWith('234') && p.length === 13) p = '0' + p.slice(3);
  return p;
}

export function todayLagos() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }); // YYYY-MM-DD
}

export function addYearMinusDay(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const insuredName = (o) =>
  o?.insured_type === 'company' ? clean(o.company_name, 150) : clean(`${o?.firstname ?? ''} ${o?.lastname ?? ''}`, 150);

// Checks an order.
//   opts.allowPastStart: staff may issue with an earlier start date
//   opts.strict: the order is about to go to NPF, so NPF's list numbers (make, body type) must be present
export function validateOrder(input, opts = {}) {
  const errors = {};
  const i = input && typeof input === 'object' ? input : {};
  const product = own(PRODUCTS, i.product) ? i.product : null;
  if (!product) errors.product = 'Choose a cover type.';
  const insured_type = i.insured_type === 'company' ? 'company' : 'personal';

  const v = {
    product,
    insured_type,
    firstname: insured_type === 'personal' ? clean(i.firstname, 60) : '',
    lastname: insured_type === 'personal' ? clean(i.lastname, 60) : '',
    company_name: insured_type === 'company' ? clean(i.company_name, 150) : '',
    company_rc_number: insured_type === 'company' ? clean(i.company_rc_number, 20).toUpperCase() : '',
    nin: String(i.nin ?? '').replace(/\D/g, '').slice(0, 11),
    email: clean(i.email, 120).toLowerCase(),
    phone: normalisePhone(i.phone),
    address: clean(i.address, 250),
    state: own(LGAS, i.state) ? i.state : '',
    lga: '',
    reg_no: normReg(i.reg_no),
    chassis_no: normVin(i.chassis_no),
    engine_no: normVin(i.engine_no),
    engine_capacity: clean(i.engine_capacity, 10),
    vehicle_make_id: toId(i.vehicle_make_id),
    vehicle_make: clean(i.vehicle_make, 60),
    vehicle_model_id: toId(i.vehicle_model_id),
    vehicle_model: clean(i.vehicle_model, 60),
    body_type_id: toId(i.body_type_id),
    vehicle_type: clean(i.vehicle_type, 40), // body type name, e.g. Saloon
    vehicle_color: clean(i.vehicle_color, 30),
    year_of_make: clean(i.year_of_make, 4),
    start_date: clean(i.start_date, 10),
  };
  if (v.state && LGAS[v.state].includes(i.lga)) v.lga = i.lga;

  if (insured_type === 'personal') {
    if (v.firstname.length < 2) errors.firstname = 'Enter the first name.';
    if (v.lastname.length < 2) errors.lastname = 'Enter the last name.';
  } else if (v.company_name.length < 3) errors.company_name = 'Enter the registered company name.';
  if (!/^\d{11}$/.test(v.nin)) errors.nin = 'Enter the 11-digit NIN.';
  if (!/^0\d{10}$/.test(v.phone)) errors.phone = 'Enter an 11-digit Nigerian phone number.';
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = 'Enter a valid email address.';
  if (v.address.length < 5) errors.address = 'Enter the contact address.';
  if (!v.state) errors.state = 'Select the state.';
  if (!v.lga) errors.lga = 'Select the LGA.';
  if (v.reg_no.length < 5) errors.reg_no = 'Enter the plate number.';
  if (v.chassis_no.length < 5) errors.chassis_no = 'Enter the chassis number.';
  if (v.engine_no.length < 3) errors.engine_no = 'Enter the engine number.';
  if (!v.vehicle_make_id && !v.vehicle_make) errors.vehicle_make_id = 'Choose the make.';
  if (!v.body_type_id && !v.vehicle_type) errors.body_type_id = 'Choose the body type.';
  if (opts.strict) {
    if (!v.vehicle_make_id) errors.vehicle_make_id = 'Pick the make from NPF\'s list.';
    if (!v.body_type_id) errors.body_type_id = 'Pick the body type from NPF\'s list.';
  }
  if (!v.vehicle_color) errors.vehicle_color = 'Enter the colour.';
  const yr = Number(v.year_of_make);
  if (!(yr >= 1950 && yr <= new Date().getFullYear() + 1)) errors.year_of_make = 'Enter a valid year.';

  const today = todayLagos();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.start_date)) v.start_date = today;
  if (!opts.allowPastStart && v.start_date < today) v.start_date = today;
  const max = new Date(today + 'T00:00:00Z');
  max.setUTCDate(max.getUTCDate() + 30);
  if (v.start_date > max.toISOString().slice(0, 10)) errors.start_date = 'Start date can be at most 30 days ahead.';

  return { ok: Object.keys(errors).length === 0, errors, value: v };
}

export function newReference() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
  const pad = (x) => String(x).padStart(2, '0');
  const bytes = new Uint8Array(3);
  globalThis.crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `RT-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${code}`;
}

// Order data travels inside the staff link in the email (no database).
export function encodeOrder(obj) {
  const json = JSON.stringify(obj);
  const b64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeOrder(s) {
  try {
    const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function'
      ? decodeURIComponent(escape(atob(b64)))
      : Buffer.from(b64, 'base64').toString('utf8');
    const o = JSON.parse(json);
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch { return null; }
}

export const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

// Masks a NIN for display: 12345678901 -> *******8901
export const maskNin = (n) => (n ? '*'.repeat(Math.max(0, String(n).length - 4)) + String(n).slice(-4) : '');
