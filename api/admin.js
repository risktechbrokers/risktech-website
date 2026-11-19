// One endpoint for the motor platform.
//   lists          (public)  makes, models and body types from NPF for the buy form (cached, no prices) + paused products
//   order          (public)  check a customer's order, give it a reference and lock it for the staff link
//   login-info     (public)  is 2-step login switched on?
//   login          (public)  password (+ 6-digit code if 2-step is on) -> session token
//   --- everything below needs a signed-in staff member; each reply carries a refreshed token (30-minute idle limit) ---
//   ping                     keeps an active session alive
//   open / verify            open an order link from the email (new locked links / old v20 links)
//   check                    free NPF tests: key works, lists load, an empty request is refused (no unit used)
//   staff-lists              NPF lists for the staff page, including NPF's product names
//   npf                      issue the policy at NPF (never retried automatically) and save it to the shared list
//   document                 NPF's Certificate or Brown Card PDF
//   endorse / cancel         correct or cancel a policy NPF issued (shared list updated too)
//   policies                 the shared list of every policy, from every device
//   import-policies          one-time move of a device's own list into the shared list
//   settings / set-product   website switches (pause a product)
//   totp-setup / totp-check  set up 2-step login
//   claim          (public)  a claim from the claim form, with photos
//   activity                 history of everything done on the staff page and website orders
//   claims / claim-status    the claims list and moving a claim along (Received, Sent to insurer, Settled)
//   files                    the photos a customer sent with an order or a claim
//   logout                   records a sign-out in the history
import QRCode from 'qrcode';
import { json, readBody, sameOrigin, clientIp, isLimited, addHit, rateLimit, wait, MAX_BODY, MAX_PHOTO_BODY } from './_lib/http.js';
import { checkPhotos, ORDER_SLOTS, CLAIM_SLOTS } from './_lib/photos.js';
import { checkPassword, issueToken, isAdmin, refreshToken, recentlySignedIn, verifyOrder, lockOrder, unlockOrder, signSetup, checkSetup } from './_lib/auth.js';
import { getReference, publicLists, mapProducts, checkAgainstReference, issuePolicy, getDocument, endorsePolicy, cancelPolicy, checkConnection } from './_lib/npf.js';
import { storeEnabled, listPolicies, savePolicy, patchPolicy, importPolicies, getSettings, setPaused, logActivity, listActivity, filesAllowed, saveFile, readFile, listClaims, addClaim, patchClaim } from './_lib/store.js';
import { totpEnabled, verifyCode, newSecret, otpauthUrl } from './_lib/totp.js';
import { sendAlert, alertsEnabled } from './_lib/alerts.js';
import { validateOrder, newReference, addYearMinusDay, insuredName, maskNin, LGAS, PRODUCTS, INSURER } from '../shared/motor.js';

const MIN = 60_000;
const id = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const text = (v, max) => String(v ?? '').replace(/[<>"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const own = (obj, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(obj, k);

// Only the fields NPF lets us change, cleaned
function cleanChanges(c = {}) {
  const out = {};
  const s = (k, max, f = (x) => x) => { if (c[k] !== undefined && String(c[k]).trim() !== '') out[k] = f(text(c[k], max)); };
  s('firstname', 60); s('lastname', 60); s('company_name', 150); s('company_rc_number', 20, (x) => x.toUpperCase());
  s('email', 120, (x) => x.toLowerCase()); s('address', 250); s('vehicle_color', 30); s('engine_capacity', 10);
  s('plate_number', 20, (x) => x.toUpperCase().replace(/[\s-]/g, '')); s('chassis_number', 30, (x) => x.toUpperCase().replace(/\s/g, ''));
  s('engine_number', 30, (x) => x.toUpperCase().replace(/\s/g, ''));
  if (c.mobile_no) out.mobile_no = String(c.mobile_no).replace(/\D/g, '').slice(0, 11);
  if (c.nin) out.nin = String(c.nin).replace(/\D/g, '');
  if (c.state && own(LGAS, c.state)) out.state = c.state;
  if (c.lga) out.lga = text(c.lga, 60);
  for (const k of ['body_type_id', 'vehicle_make_id', 'vehicle_model_id']) if (id(c[k])) out[k] = id(c[k]);
  if (Number(c.vehicle_year) >= 1950 && Number(c.vehicle_year) <= 2100) out.vehicle_year = Number(c.vehicle_year);
  return out;
}

// What a correction changes in our own record (never the full NIN)
function recordPatch(ch) {
  const p = {};
  if (ch.plate_number) p.reg_no = ch.plate_number;
  if (ch.mobile_no) p.phone = ch.mobile_no;
  if (ch.email) p.email = ch.email;
  if (ch.address) p.address = ch.address;
  if (ch.chassis_number) p.chassis_no = ch.chassis_number;
  if (ch.engine_number) p.engine_no = ch.engine_number;
  if (ch.vehicle_color) p.vehicle_color = ch.vehicle_color;
  if (ch.body_type_id) p.body_type_id = ch.body_type_id;
  if (ch.nin) p.nin_masked = maskNin(ch.nin);
  if (ch.firstname) p.firstname = ch.firstname;
  if (ch.lastname) p.lastname = ch.lastname;
  if (ch.company_name) p.name = ch.company_name;
  return p;
}

// Saving to the shared list must never break issuing: if storage fails, say so and carry on.
async function safely(fn) {
  if (!storeEnabled()) return { saved: false, reason: 'off' };
  try { const r = await fn(); return { saved: true, r }; } catch (e) { console.error('store error', e?.message || e); return { saved: false, reason: 'error' }; }
}

// Plain names for the history ("colour", not "vehicle_color")
const FIELD_NAMES = { firstname: 'first name', lastname: 'last name', company_name: 'company name', company_rc_number: 'RC number', email: 'email', address: 'address',
  vehicle_color: 'colour', engine_capacity: 'engine capacity', plate_number: 'plate', chassis_number: 'chassis number', engine_number: 'engine number', mobile_no: 'phone',
  nin: 'NIN', state: 'state', lga: 'LGA', body_type_id: 'body type', vehicle_make_id: 'make', vehicle_model_id: 'model', vehicle_year: 'year' };

let lastTotpStep = -1; // blocks re-use of the same 6-digit code

// ---------- Activity history ----------
// Which device, roughly where (Vercel adds the city), and the network address
function deviceName(ua = '') {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android phone' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows PC' : /Linux/.test(ua) ? 'Linux' : 'Unknown device';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return br ? `${os}, ${br}` : os;
}
function place(req) {
  const dec = (v) => { try { return decodeURIComponent(String(v || '')); } catch { return ''; } };
  return [dec(req.headers['x-vercel-ip-city']), dec(req.headers['x-vercel-ip-country'])].filter(Boolean).join(', ');
}
const ev = (req, kind, txt) => ({ kind, text: txt, device: deviceName(String(req.headers['user-agent'] || '')), place: place(req), ip: clientIp(req) });

// Small events (sign-ins, downloads, failed tries) are throttled so they can't use up the month's saves
const recent = new Map();
function seenRecently(key, ms) {
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > 30 * MIN) recent.delete(k);
  if (recent.has(key) && now - recent.get(key) < ms) return true;
  recent.set(key, now); return false;
}
let failedSince = 0; // failed sign-ins not yet written to the history
export const _resetActivityThrottle = () => { recent.clear(); }; // for tests
const log = (events, opts) => safely(() => logActivity(events, opts));

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!sameOrigin(req)) return json(res, 403, { error: 'Not allowed.' });
  // Only the two forms that carry photos may send a large request
  const body = readBody(req, MAX_PHOTO_BODY);
  if (!body) {
    const size = typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body ?? '').length;
    return size > MAX_PHOTO_BODY ? json(res, 413, { error: 'The photos are too large. Please remove one and try again.' }) : json(res, 400, { error: 'Request not understood.' });
  }
  if (body.action !== 'order' && body.action !== 'claim' && JSON.stringify(body).length > MAX_BODY) return json(res, 400, { error: 'Request not understood.' });
  const ip = clientIp(req);

  try {
    if (body.action === 'lists') {
      if (rateLimit(req, 'lists', 60, 10 * MIN)) return json(res, 429, { error: 'Too many requests. Please wait a minute.' });
      const [ref, settings, uploads] = await Promise.all([getReference(), getSettings(), filesAllowed()]);
      return json(res, 200, ref.ok ? { available: true, ...publicLists(ref.data), paused: settings.paused, uploads } : { available: false, paused: settings.paused, uploads });
    }

    if (body.action === 'order') {
      if (rateLimit(req, 'order', 10, 10 * MIN)) return json(res, 429, { error: 'Too many orders from this connection. Please wait a few minutes or WhatsApp us.' });
      const v = validateOrder(body.order || {});
      if (!v.ok) return json(res, 400, { error: 'Please correct the highlighted fields.', fields: v.errors });
      if (body.confirmed !== true) return json(res, 400, { error: 'Please confirm that your details are correct and accept the terms.' });
      const { paused } = await getSettings();
      if (paused[v.value.product]) return json(res, 409, { error: `${PRODUCTS[v.value.product].short} cover is temporarily unavailable online. Please WhatsApp us.` });
      const pics = checkPhotos(body.photos, { slots: ORDER_SLOTS, max: 3 });
      if (!pics.ok) return json(res, 400, { error: pics.error });
      const order = { ...v.value, reference: newReference(), created_at: new Date().toISOString(), confirmed_at: new Date().toISOString(), photos: 0 };
      // Photos never stop an order: if they can't be saved, the customer is asked to WhatsApp them
      let photosSaved = !pics.photos.length;
      if (pics.photos.length && await filesAllowed({ fresh: true })) {
        try { await saveFile('order', order.reference, { reference: order.reference, at: order.created_at, photos: pics.photos }); order.photos = pics.photos.length; photosSaved = true; }
        catch (e) { console.error('photo save failed', e?.message || e); }
      }
      const lock = lockOrder(order);
      if (!lock) return json(res, 500, { error: 'The website is not fully set up. Please WhatsApp us.' });
      const unlisted = !order.vehicle_make_id ? ` (make not on the insurer's list: ${order.vehicle_make})` : '';
      await log(ev(req, 'order', `New order ${order.reference} from the website: ${insuredName(order)}, ${order.reg_no}, ${PRODUCTS[order.product].short}${order.photos ? `, ${order.photos} photo${order.photos > 1 ? 's' : ''}` : ''}${unlisted}`),
        order.photos ? { optional: false, extraSaves: 1 } : undefined);
      return json(res, 200, { order, lock, photosSaved });
    }

    if (body.action === 'claim') {
      if (rateLimit(req, 'claim', 5, 10 * MIN)) return json(res, 429, { error: 'Too many claims from this connection. Please wait a few minutes or call us.' });
      const c = body.claim || {};
      const f = {
        name: text(c.name, 100), phone: String(c.phone || '').replace(/[^\d+]/g, '').slice(0, 16), email: text(c.email, 120).toLowerCase(),
        policy_number: text(c.policy_number, 60), insurance_type: text(c.insurance_type, 80), incident_date: text(c.incident_date, 10),
        incident_location: text(c.incident_location, 200), description: text(c.description, 2000), estimated_loss: text(c.estimated_loss, 40),
      };
      const missing = ['name', 'phone', 'email', 'insurance_type', 'incident_date', 'incident_location', 'description'].filter((k) => !f[k]);
      if (missing.length) return json(res, 400, { error: 'Please fill in all the required fields.' });
      if (!/^\S+@\S+\.\S+$/.test(f.email)) return json(res, 400, { error: 'Enter a valid email address.' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f.incident_date)) return json(res, 400, { error: 'Enter the date of the incident.' });
      const pics = checkPhotos(body.photos, { slots: CLAIM_SLOTS, max: 8 });
      if (!pics.ok) return json(res, 400, { error: pics.error });
      if (!storeEnabled()) return json(res, 200, { saved: false, photosSaved: false });
      const id = newReference().replace(/^RT-/, 'CL-');
      const at = new Date().toISOString();
      let photos = 0; let photosSaved = !pics.photos.length;
      if (pics.photos.length && await filesAllowed({ fresh: true })) {
        try { await saveFile('claim', id, { id, at, photos: pics.photos }); photos = pics.photos.length; photosSaved = true; }
        catch (e) { console.error('photo save failed', e?.message || e); }
      }
      const saved = await safely(() => addClaim({ id, at, ...f, photos, status: 'RECEIVED', history: [] },
        [ev(req, 'claim', `New claim ${id}: ${f.name}, ${f.insurance_type}${f.policy_number ? `, policy ${f.policy_number}` : ''}${photos ? `, ${photos} photo${photos > 1 ? 's' : ''}` : ''}`)], photos ? 1 : 0));
      return json(res, 200, { saved: saved.saved, id: saved.saved ? id : null, photosSaved: saved.saved && photosSaved });
    }

    if (body.action === 'login-info') return json(res, 200, { totp: totpEnabled() });

    // Can the claim form save photos right now?
    if (body.action === 'upload-info') {
      if (rateLimit(req, 'upload-info', 60, 10 * MIN)) return json(res, 429, { error: 'Too many requests.' });
      return json(res, 200, { uploads: await filesAllowed() });
    }

    if (body.action === 'login') {
      // 5 wrong tries per connection, and 40 per 15 minutes in total, then a pause
      const k = `login:${ip}`;
      if (isLimited(k, 5, 15 * MIN) || isLimited('login:all', 40, 15 * MIN)) {
        return json(res, 429, { error: 'Too many wrong attempts. For safety, wait 15 minutes and try again.' });
      }
      if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) return json(res, 500, { error: 'Staff login is not set up (ADMIN_PASSWORD / ADMIN_SECRET missing in Vercel).' });
      const pwOk = checkPassword(body.password);
      let codeOk = true;
      if (totpEnabled()) {
        const step = pwOk ? verifyCode(process.env.ADMIN_TOTP_SECRET, body.code) : null;
        codeOk = step !== null && step > lastTotpStep;
        if (codeOk) lastTotpStep = step;
      }
      if (!pwOk || !codeOk) {
        addHit(k, 15 * MIN); addHit('login:all', 15 * MIN);
        // at most one history line per 10 minutes, counting the tries in between
        failedSince++;
        if (!seenRecently('login-failed', 10 * MIN)) {
          const n = failedSince; failedSince = 0;
          await log(ev(req, 'login-failed', n > 1 ? `${n} failed sign-in attempts (wrong ${totpEnabled() ? 'password or code' : 'password'})` : `Failed sign-in attempt (wrong ${totpEnabled() ? 'password or code' : 'password'})`));
        }
        await wait(700); // slows down guessing
        // One message for both, so a guesser cannot tell which part was wrong
        return json(res, 401, { error: totpEnabled() ? 'Wrong password or code. The code changes every 30 seconds: use the newest one.' : 'Wrong password.' });
      }
      await Promise.all([
        sendAlert('login', 'Someone signed in to the staff page', [['Device', deviceName(String(req.headers['user-agent'] || ''))], ['Location', place(req) || 'unknown'], ['Network (IP)', ip]]),
        log(ev(req, 'login', `Signed in${totpEnabled() ? ' with password and 6-digit code' : ''}`)),
      ]);
      return json(res, 200, { token: issueToken() });
    }

    // Sign-out is recorded even if the session has just run out (the 30-minute timer)
    if (body.action === 'logout') {
      if (!recentlySignedIn(req)) return json(res, 401, { error: 'Not signed in.' });
      if (!seenRecently(`logout:${ip}`, 60_000)) await log(ev(req, 'logout', body.reason === 'idle' ? 'Signed out automatically after 30 minutes with no activity' : 'Signed out'));
      return json(res, 200, { ok: true });
    }

    if (!isAdmin(req)) return json(res, 401, { error: 'You were signed out for safety. Please sign in again.' });
    const fresh = refreshToken(req);
    if (fresh) res.setHeader('X-Session-Token', fresh);

    if (body.action === 'ping') return json(res, 200, { ok: true });

    if (body.action === 'activity') {
      if (!storeEnabled()) return json(res, 200, { enabled: false, activity: [] });
      return json(res, 200, { enabled: true, ...(await listActivity()) });
    }

    if (body.action === 'open') {
      const order = unlockOrder(body.lock);
      return order ? json(res, 200, { order }) : json(res, 400, { error: 'This order link was changed or is not from our website. Do not use it. Ask the customer to order again or enter the sale by hand.' });
    }

    if (body.action === 'verify') return json(res, 200, { valid: verifyOrder(body.order, body.sig) });

    if (body.action === 'check') return json(res, 200, await checkConnection());

    if (body.action === 'staff-lists') {
      const ref = await getReference();
      if (!ref.ok) return json(res, 502, { error: ref.message || 'Could not load the insurer\'s lists.' });
      const map = mapProducts(ref.data);
      return json(res, 200, { ...publicLists(ref.data), mapping: Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v ? { product_name: v.product_name, vehicle_type: v.vehicle_type_name } : null])) });
    }

    if (body.action === 'npf') {
      const v = validateOrder(body.order || {}, { allowPastStart: true, strict: true });
      if (!v.ok) return json(res, 400, { error: 'Some details are missing or wrong. Fix the fields marked in red.', fields: v.errors });
      const reference = text(body.order?.reference, 30);

      // Double-issue guard across ALL devices (shared list), not just this one
      if (storeEnabled() && reference) {
        try {
          const prev = (await listPolicies()).find((p) => p.reference === reference && (p.status === 'SUCCESS' || p.status === 'UNKNOWN'));
          if (prev?.status === 'SUCCESS') return json(res, 409, { error: `Order ${reference} was already issued as ${prev.policy_number}. It cannot be sent twice.` });
          if (prev?.status === 'UNKNOWN' && body.confirmed_not_created !== true) return json(res, 409, { error: `Order ${reference} was sent before and the insurer did not answer. Confirm with the insurer that it was NOT created before sending again.` });
        } catch (e) { console.error('store read failed', e?.message || e); }
      }

      const ref = await getReference();
      if (!ref.ok) return json(res, 502, { error: `Could not load the insurer's lists, so nothing was sent. ${ref.message || ''}`.trim() });
      const problem = checkAgainstReference(v.value, ref.data);
      if (problem) return json(res, 400, { error: problem.message, fields: { [problem.field]: problem.message } });
      const map = mapProducts(ref.data)[v.value.product];
      const result = await issuePolicy(v.value, map);
      console.log('NPF issue', v.value.reg_no, result.status, result.httpStatus, result.policy_number || result.message);
      const end_date = addYearMinusDay(v.value.start_date);
      const name = insuredName(v.value);

      const o = v.value;
      const who = `${name}, ${o.reg_no}, ${PRODUCTS[o.product].short}${reference ? `, order ${reference}` : ', walk-in'}`;
      const issueEvent = ev(req, result.status === 'SUCCESS' ? 'issued' : result.status === 'UNKNOWN' ? 'no-answer' : 'not-issued',
        result.status === 'SUCCESS' ? `Policy issued: ${result.policy_number} (${who})`
          : result.status === 'UNKNOWN' ? `Sent to ${INSURER.name}, NO ANSWER: ${who}. Ask the insurer before sending again.${body.confirmed_not_created === true ? ' (Re-sent after the insurer confirmed the first was not created.)' : ''}`
            : `${INSURER.name} did not issue (${result.httpStatus || result.status}): ${who}. The insurer said: ${text(result.message, 120)}`);
      let shared = { saved: false, reason: 'not needed' };
      if (result.status !== 'SUCCESS' && result.status !== 'UNKNOWN') await log(issueEvent, { optional: false });
      if (result.status === 'SUCCESS' || result.status === 'UNKNOWN') {
        shared = await safely(() => savePolicy({
          key: result.policy_id ? `p${result.policy_id}` : (text(body.key, 40) || `u${Date.now()}`), at: new Date().toISOString(), reference, product: o.product,
          premium: PRODUCTS[o.product].premium, name, insured_type: o.insured_type, firstname: o.firstname, lastname: o.lastname,
          nin_masked: maskNin(o.nin), phone: o.phone, email: o.email, address: o.address, reg_no: o.reg_no, chassis_no: o.chassis_no,
          engine_no: o.engine_no, vehicle_color: o.vehicle_color, vehicle_type: o.vehicle_type, body_type_id: o.body_type_id,
          start_date: o.start_date, end_date, policy_id: result.policy_id || null, policy_number: result.policy_number || '',
          certificate_no: result.certificate_no || '', status: result.status, message: result.message,
          insurer: INSURER.name, photos: Math.min(3, Math.max(0, Number.parseInt(body.order?.photos, 10) || 0)),
        }, [issueEvent]));
        await sendAlert('issued', result.status === 'SUCCESS' ? `Policy issued: ${result.policy_number}` : `The insurer did not answer for ${o.reg_no}`, [
          ['Policy holder', name], ['Plate', o.reg_no], ['Cover', PRODUCTS[o.product].label], ['Premium', `N${PRODUCTS[o.product].premium.toLocaleString()}`],
          ['Policy number', result.policy_number || '(none)'], ['Order reference', reference || 'Walk-in'], ['Status', result.status],
        ]);
      }
      return json(res, 200, { ...result, end_date, insured_name: name, shared: shared.saved, sharedReason: shared.reason });
    }

    if (body.action === 'document') {
      if (!id(body.policy_id)) return json(res, 400, { error: 'Missing policy.' });
      const d = await getDocument(id(body.policy_id), body.kind);
      if (!d.ok) return json(res, d.httpStatus === 404 ? 404 : 502, { error: d.message });
      const kindName = body.kind === 'brown-card' ? 'Brown Card' : 'Certificate';
      if (!seenRecently(`doc:${id(body.policy_id)}:${kindName}`, 10 * MIN)) {
        let label = `policy ID ${id(body.policy_id)}`;
        try { const p = (await listPolicies()).find((x) => String(x.policy_id) === String(id(body.policy_id))); if (p) label = `${p.policy_number} (${p.name}, ${p.reg_no})`; } catch { /* label stays */ }
        await log(ev(req, 'download', `Downloaded the ${kindName}: ${label}`));
      }
      const name = (d.filename || `${body.kind === 'brown-card' ? 'brown-card' : 'certificate'}-${id(body.policy_id)}.pdf`).replace(/[^\w.-]/g, '-');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(d.pdf);
    }

    if (body.action === 'endorse') {
      const reason = text(body.reason, 300);
      if (!id(body.policy_id)) return json(res, 400, { error: 'Missing policy.' });
      if (reason.length < 5) return json(res, 400, { error: 'Write the reason for the change.' });
      const changes = cleanChanges(body.changes);
      if (changes.nin && !/^\d{11}$/.test(changes.nin)) return json(res, 400, { error: 'The NIN must be exactly 11 digits.' });
      if (changes.mobile_no && !/^0\d{10}$/.test(changes.mobile_no)) return json(res, 400, { error: 'Enter an 11-digit phone number.' });
      if (!Object.keys(changes).length) return json(res, 400, { error: 'Nothing to change.' });
      const r = await endorsePolicy(id(body.policy_id), reason, changes);
      if (r.ok) {
        const fields = (r.fields_changed || []).length ? r.fields_changed : Object.keys(changes);
        const changedNames = Object.keys(changes).map((k) => FIELD_NAMES[k] || k.replace(/_/g, ' ')).join(', ');
        const rec = await safely(() => patchPolicy(id(body.policy_id), { ...recordPatch(changes), message: `Corrected: ${reason}` }, `Corrected (${fields.join(', ')}): ${reason}`,
          (p) => [ev(req, 'corrected', `Correction saved at ${INSURER.name}: ${p ? `${p.policy_number} (${p.name}, ${p.reg_no})` : `policy ID ${id(body.policy_id)}`}. Changed: ${changedNames}. Reason: ${reason}`)]));
        await sendAlert('corrected', `Policy corrected: ${rec.r?.policy_number || body.policy_id}`, [
          ['Policy', rec.r?.policy_number || String(body.policy_id)], ['Policy holder', rec.r?.name || ''], ['Changed', Object.keys(changes).filter((k) => k !== 'nin').join(', ') + (changes.nin ? ', NIN' : '')], ['Reason', reason],
        ]);
        r.shared = rec.saved;
      }
      return json(res, 200, r);
    }

    if (body.action === 'cancel') {
      const reason = text(body.reason, 300);
      if (!id(body.policy_id)) return json(res, 400, { error: 'Missing policy.' });
      if (reason.length < 5) return json(res, 400, { error: 'Write the reason for cancelling.' });
      const r = await cancelPolicy(id(body.policy_id), reason);
      if (r.ok) {
        const rec = await safely(() => patchPolicy(id(body.policy_id), { status: 'CANCELLED', message: `Cancelled: ${reason}` }, `Cancelled: ${reason}`,
          (p) => [ev(req, 'cancelled', `Policy CANCELLED at ${INSURER.name}: ${p ? `${p.policy_number} (${p.name}, ${p.reg_no})` : `policy ID ${id(body.policy_id)}`}. Reason: ${reason}`)]));
        await sendAlert('cancelled', `Policy CANCELLED: ${rec.r?.policy_number || body.policy_id}`, [
          ['Policy', rec.r?.policy_number || String(body.policy_id)], ['Policy holder', rec.r?.name || ''], ['Plate', rec.r?.reg_no || ''], ['Reason', reason],
        ]);
        r.shared = rec.saved;
      }
      return json(res, 200, r);
    }

    if (body.action === 'policies') {
      if (!storeEnabled()) return json(res, 200, { enabled: false, policies: [] });
      return json(res, 200, { enabled: true, policies: await listPolicies() });
    }

    if (body.action === 'import-policies') {
      if (!storeEnabled()) return json(res, 400, { error: 'The shared list is not switched on yet.' });
      const list = Array.isArray(body.policies) ? body.policies.slice(0, 500) : [];
      const added = await importPolicies(list.filter((p) => p && typeof p === 'object' && (p.status === 'SUCCESS' || p.status === 'CANCELLED' || p.status === 'UNKNOWN')),
        (n) => (n ? [ev(req, 'import', `Moved ${n} ${n === 1 ? 'policy' : 'policies'} from this device to the shared list`)] : []));
      return json(res, 200, { added });
    }

    if (body.action === 'settings') {
      const s = await getSettings({ fresh: true });
      let usage = null;
      if (storeEnabled()) { try { const a = await listActivity(); usage = { saves: a.saves, limit: a.limit, softLimit: a.softLimit }; } catch { /* shown as unknown */ } }
      return json(res, 200, { paused: s.paused, storage: storeEnabled(), usage, totp: totpEnabled(), alerts: alertsEnabled(), alertPersonal: !!process.env.ALERT_EMAIL_PERSONAL });
    }

    if (body.action === 'set-product') {
      if (!own(PRODUCTS, body.product)) return json(res, 400, { error: 'Unknown cover.' });
      if (!storeEnabled()) return json(res, 400, { error: 'Switch on the shared storage first (see SETUP.md).' });
      const s = await setPaused(body.product, body.paused === true);
      await log(ev(req, 'setting', `${PRODUCTS[body.product].short} ${body.paused === true ? 'PAUSED on the website (customers cannot buy it)' : 'switched back ON on the website'}`), { optional: false, extraSaves: 1 });
      return json(res, 200, { paused: s.paused });
    }

    if (body.action === 'claims') {
      if (!storeEnabled()) return json(res, 200, { enabled: false, claims: [] });
      return json(res, 200, { enabled: true, claims: await listClaims() });
    }

    if (body.action === 'claim-status') {
      const STATUS = { RECEIVED: 'Received', SENT: 'Sent to insurer', SETTLED: 'Settled' };
      const cid = text(body.id, 20);
      const note = text(body.note, 300);
      if (!/^CL-\d{6}-[0-9A-F]{6}$/.test(cid) || !own(STATUS, body.status)) return json(res, 400, { error: 'Unknown claim or status.' });
      if (!storeEnabled()) return json(res, 400, { error: 'The shared storage is not switched on yet.' });
      const c = await patchClaim(cid, { status: body.status }, `${STATUS[body.status]}${note ? `: ${note}` : ''}`,
        (x) => [ev(req, 'claim', `Claim ${cid}${x ? ` (${x.name})` : ''} marked "${STATUS[body.status]}"${note ? `: ${note}` : ''}`)]);
      return c ? json(res, 200, { claim: c }) : json(res, 404, { error: 'Claim not found. Press Refresh.' });
    }

    if (body.action === 'files') {
      const okId = body.kind === 'order' ? /^RT-\d{6}-[0-9A-F]{6}$/.test(body.id) : body.kind === 'claim' ? /^CL-\d{6}-[0-9A-F]{6}$/.test(body.id) : false;
      if (!okId) return json(res, 400, { error: 'Unknown order or claim.' });
      if (!storeEnabled()) return json(res, 404, { error: 'No photos saved.' });
      const f = await readFile(body.kind, body.id);
      return f?.photos?.length ? json(res, 200, { photos: f.photos.map((p) => ({ label: p.label, data: p.data })) }) : json(res, 404, { error: 'No photos were saved for this one.' });
    }

    if (body.action === 'totp-setup') {
      if (totpEnabled()) return json(res, 400, { error: '2-step login is already on. To set it up again, delete ADMIN_TOTP_SECRET in Vercel and redeploy.' });
      const secret = newSecret();
      const qr = await QRCode.toString(otpauthUrl(secret), { type: 'svg', margin: 1, width: 220, errorCorrectionLevel: 'M' });
      return json(res, 200, { secret, qr, proof: signSetup(secret) });
    }

    if (body.action === 'totp-check') {
      if (!checkSetup(body.secret, body.proof)) return json(res, 400, { error: 'Setup expired. Press "Set up 2-step login" again.' });
      if (verifyCode(body.secret, body.code) !== null) {
        await log(ev(req, 'security', '2-step login set up and checked (it turns on once ADMIN_TOTP_SECRET is added in Vercel)'), { optional: false });
        return json(res, 200, { ok: true });
      }
      return json(res, 400, { error: 'That code did not match. Check the phone\'s time is set automatically and try the newest code.' });
    }

    return json(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('admin error', e?.stack || e);
    return json(res, 500, { error: 'Something went wrong on the server. Please try again. If it keeps happening, send a screenshot to IT.' });
  }
}
