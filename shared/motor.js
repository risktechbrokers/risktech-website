// Shared by the website (browser) and the serverless functions.
// Change prices, wording or the bank account here and both sides follow.

export const PRODUCTS = {
  private_motor: {
    label: 'Private Motor (Third Party)',
    short: 'Private Motor',
    premium: 15000,
    sumAssured: 1000000,
    coverType: 'PRIVATE MOTOR',
    typeOfCover: 'P',
    vehicleCategory: 'Car',
    policyPrefix: 'RP',
    limitation: 'THIRD PARTY (PRIVATE MOTOR)',
    bodyTypes: ['Saloon', 'SUV', 'Hatchback', 'Wagon', 'Coupe', 'Bus', 'Pickup', 'Van'],
  },
  motorcycle: {
    label: 'Motorcycle (Third Party)',
    short: 'Motorcycle',
    premium: 3000,
    sumAssured: 1000000,
    coverType: 'MOTORCYCLE',
    typeOfCover: 'P',
    vehicleCategory: 'Motorcycle',
    policyPrefix: 'RP',
    limitation: 'THIRD PARTY (MOTORCYCLE)',
    bodyTypes: ['Motorcycle'],
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

// Number series agreed with NPF: NPF/EMPT/RP/26/011*** and WAX26/011***
export const SERIES = { block: '011', width: 3, max: 999 };

export const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

export const FIELDS = ['product','insured_name','email','phone','address','zone','reg_no','old_reg_no','chassis_no','engine_no','engine_capacity','vehicle_make','vehicle_model','vehicle_type','vehicle_color','year_of_make','start_date'];

const clean = (v, max = 200) =>
  String(v ?? '').replace(/<[^>]*>/g, '').replace(/[<>"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const normReg = (v) => clean(v, 20).toUpperCase().replace(/[\s-]/g, '');
const normVin = (v) => clean(v, 30).toUpperCase().replace(/\s/g, '');

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

// opts.allowPastStart: staff may issue with an earlier start date if they choose to
export function validateOrder(input, opts = {}) {
  const errors = {};
  const product = typeof input?.product === 'string' && Object.prototype.hasOwnProperty.call(PRODUCTS, input.product) ? input.product : null;
  if (!product) errors.product = 'Choose a cover type.';

  const v = {
    product,
    insured_name: clean(input.insured_name, 120),
    email: clean(input.email, 120).toLowerCase(),
    phone: normalisePhone(input.phone),
    address: clean(input.address, 250),
    zone: clean(input.zone, 60),
    reg_no: normReg(input.reg_no),
    old_reg_no: normReg(input.old_reg_no) || normReg(input.reg_no),
    chassis_no: normVin(input.chassis_no),
    engine_no: normVin(input.engine_no),
    engine_capacity: clean(input.engine_capacity, 10),
    vehicle_make: clean(input.vehicle_make, 60),
    vehicle_model: clean(input.vehicle_model, 60),
    vehicle_type: clean(input.vehicle_type, 40),
    vehicle_color: clean(input.vehicle_color, 30),
    year_of_make: clean(input.year_of_make, 4),
    start_date: clean(input.start_date, 10),
  };

  if (v.insured_name.length < 3) errors.insured_name = 'Enter the full name of the policy holder.';
  if (!/^0\d{10}$/.test(v.phone)) errors.phone = 'Enter an 11-digit Nigerian phone number.';
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = 'Enter a valid email address.';
  if (v.address.length < 5) errors.address = 'Enter the contact address.';
  if (!v.zone) errors.zone = 'Select the state.';
  if (v.reg_no.length < 5) errors.reg_no = 'Enter the plate number.';
  if (v.chassis_no.length < 5) errors.chassis_no = 'Enter the chassis number.';
  if (v.engine_no.length < 3) errors.engine_no = 'Enter the engine number.';
  if (!v.vehicle_make) errors.vehicle_make = 'Enter the make.';
  if (!v.vehicle_model) errors.vehicle_model = 'Enter the model.';
  if (!v.vehicle_type) errors.vehicle_type = 'Choose the body type.';
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

export function policyNumbers(product, seq, isoDate) {
  const n = Number(seq);
  if (!Number.isInteger(n) || n < 1 || n > SERIES.max) throw new Error(`Sequence must be a whole number from 1 to ${SERIES.max}.`);
  const yy = String(isoDate || todayLagos()).slice(2, 4);
  const suffix = SERIES.block + String(n).padStart(SERIES.width, '0');
  return {
    policy_no: `NPF/EMPT/${PRODUCTS[product].policyPrefix}/${yy}/${suffix}`,
    certificate_no: `WAX${yy}/${suffix}`,
  };
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
    return JSON.parse(json);
  } catch { return null; }
}

export const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
