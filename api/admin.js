// One endpoint for the motor platform. No database: the staff page keeps the running log and the spreadsheet is the record.
//   lists       (public)  makes, models and body types from NPF for the buy form (cached, no prices)
//   order       (public)  check a customer's order, give it a reference and lock it for the staff link
//   login       (public)  staff password -> session token (8 hours)
//   open        (staff)   unlock an order link from the email
//   verify      (staff)   old-style (v20) links: was the link changed?
//   check       (staff)   free NPF tests: key works, lists load, an empty request is refused (no unit used)
//   staff-lists (staff)   NPF lists for the staff page, including NPF's product names
//   npf         (staff)   issue the policy at NPF (never retried automatically)
//   document    (staff)   NPF's Certificate or Brown Card PDF
//   endorse     (staff)   correct details on a policy NPF issued
//   cancel      (staff)   cancel a policy NPF issued
import { json, readBody, sameOrigin, clientIp, isLimited, addHit, rateLimit, wait } from './_lib/http.js';
import { checkPassword, issueToken, isAdmin, verifyOrder, lockOrder, unlockOrder } from './_lib/auth.js';
import { getReference, publicLists, mapProducts, checkAgainstReference, issuePolicy, getDocument, endorsePolicy, cancelPolicy, checkConnection } from './_lib/npf.js';
import { validateOrder, newReference, addYearMinusDay, insuredName, LGAS } from '../shared/motor.js';

const MIN = 60_000;
const id = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const text = (v, max) => String(v ?? '').replace(/[<>"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

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
  if (c.state && Object.prototype.hasOwnProperty.call(LGAS, c.state)) out.state = c.state;
  if (c.lga) out.lga = text(c.lga, 60);
  for (const k of ['body_type_id', 'vehicle_make_id', 'vehicle_model_id']) if (id(c[k])) out[k] = id(c[k]);
  if (Number(c.vehicle_year) >= 1950 && Number(c.vehicle_year) <= 2100) out.vehicle_year = Number(c.vehicle_year);
  return out;
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!sameOrigin(req)) return json(res, 403, { error: 'Not allowed.' });
  const body = readBody(req);
  if (!body) return json(res, 400, { error: 'Request not understood.' });
  const ip = clientIp(req);

  try {
    if (body.action === 'lists') {
      if (rateLimit(req, 'lists', 60, 10 * MIN)) return json(res, 429, { error: 'Too many requests. Please wait a minute.' });
      const ref = await getReference();
      return json(res, 200, ref.ok ? { available: true, ...publicLists(ref.data) } : { available: false });
    }

    if (body.action === 'order') {
      if (rateLimit(req, 'order', 10, 10 * MIN)) return json(res, 429, { error: 'Too many orders from this connection. Please wait a few minutes or WhatsApp us.' });
      const v = validateOrder(body.order || {});
      if (!v.ok) return json(res, 400, { error: 'Please correct the highlighted fields.', fields: v.errors });
      const order = { ...v.value, reference: newReference(), created_at: new Date().toISOString() };
      const lock = lockOrder(order);
      if (!lock) return json(res, 500, { error: 'The website is not fully set up. Please WhatsApp us.' });
      return json(res, 200, { order, lock });
    }

    if (body.action === 'login') {
      // 5 wrong tries per connection, and 40 per 15 minutes in total, then a pause
      const k = `login:${ip}`;
      if (isLimited(k, 5, 15 * MIN) || isLimited('login:all', 40, 15 * MIN)) {
        return json(res, 429, { error: 'Too many wrong attempts. For safety, wait 15 minutes and try again.' });
      }
      if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) return json(res, 500, { error: 'Staff login is not set up (ADMIN_PASSWORD / ADMIN_SECRET missing in Vercel).' });
      if (!checkPassword(body.password)) {
        addHit(k, 15 * MIN); addHit('login:all', 15 * MIN);
        await wait(700); // slows down guessing
        return json(res, 401, { error: 'Wrong password.' });
      }
      return json(res, 200, { token: issueToken() });
    }

    if (!isAdmin(req)) return json(res, 401, { error: 'You were signed out for safety. Please sign in again.' });

    if (body.action === 'open') {
      const order = unlockOrder(body.lock);
      return order ? json(res, 200, { order }) : json(res, 400, { error: 'This order link was changed or is not from our website. Do not use it. Ask the customer to order again or enter the sale by hand.' });
    }

    if (body.action === 'verify') return json(res, 200, { valid: verifyOrder(body.order, body.sig) });

    if (body.action === 'check') return json(res, 200, await checkConnection());

    if (body.action === 'staff-lists') {
      const ref = await getReference();
      if (!ref.ok) return json(res, 502, { error: ref.message || 'Could not load NPF\'s lists.' });
      const map = mapProducts(ref.data);
      return json(res, 200, { ...publicLists(ref.data), mapping: Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v ? { product_name: v.product_name, vehicle_type: v.vehicle_type_name } : null])) });
    }

    if (body.action === 'npf') {
      const v = validateOrder(body.order || {}, { allowPastStart: true, strict: true });
      if (!v.ok) return json(res, 400, { error: 'Some details are missing or wrong. Fix the fields marked in red.', fields: v.errors });
      const ref = await getReference();
      if (!ref.ok) return json(res, 502, { error: `Could not load NPF's lists, so nothing was sent. ${ref.message || ''}`.trim() });
      const problem = checkAgainstReference(v.value, ref.data);
      if (problem) return json(res, 400, { error: problem.message, fields: { [problem.field]: problem.message } });
      const map = mapProducts(ref.data)[v.value.product];
      const result = await issuePolicy(v.value, map);
      console.log('NPF issue', v.value.reg_no, result.status, result.httpStatus, result.policy_number || result.message);
      return json(res, 200, { ...result, end_date: addYearMinusDay(v.value.start_date), insured_name: insuredName(v.value) });
    }

    if (body.action === 'document') {
      if (!id(body.policy_id)) return json(res, 400, { error: 'Missing policy.' });
      const d = await getDocument(id(body.policy_id), body.kind);
      if (!d.ok) return json(res, d.httpStatus === 404 ? 404 : 502, { error: d.message });
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
      return json(res, 200, await endorsePolicy(id(body.policy_id), reason, changes));
    }

    if (body.action === 'cancel') {
      const reason = text(body.reason, 300);
      if (!id(body.policy_id)) return json(res, 400, { error: 'Missing policy.' });
      if (reason.length < 5) return json(res, 400, { error: 'Write the reason for cancelling.' });
      return json(res, 200, await cancelPolicy(id(body.policy_id), reason));
    }

    return json(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('admin error', e?.stack || e);
    return json(res, 500, { error: 'Something went wrong on the server. Please try again. If it keeps happening, send a screenshot to IT.' });
  }
}
