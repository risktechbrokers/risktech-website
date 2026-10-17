// One endpoint for the motor platform. No database: the staff page keeps the running log and the spreadsheet is the record.
//   order       (public)  check a customer's order, give it a reference and a signature for the staff link
//   login       (public)  staff password -> session token (8 hours)
//   verify      (staff)   was this order link made by the website and left untouched?
//   check       (staff)   are the NPF settings present and does NPF's server answer?
//   npf         (staff)   send the policy to NPF; on SUCCESS returns a signed receipt
//   certificate (staff)   build the PDF; only works with a matching NPF receipt
import { json, readBody, sameOrigin, clientIp, isLimited, addHit, rateLimit, wait } from './_lib/http.js';
import { checkPassword, issueToken, isAdmin, signOrder, verifyOrder, npfReceipt, verifyReceipt } from './_lib/auth.js';
import { buildCertificate } from './_lib/certificate.js';
import { sendToNpf, checkConnection } from './_lib/npf.js';
import { validateOrder, policyNumbers, addYearMinusDay, newReference } from '../shared/motor.js';

const MIN = 60_000;

function preparePolicy(body) {
  const v = validateOrder(body.order || {}, { allowPastStart: true });
  if (!v.ok) return { error: 'Some order details are missing or wrong.', fields: v.errors };
  let nums;
  try { nums = policyNumbers(v.value.product, body.seq, v.value.start_date); }
  catch (e) { return { error: e.message, fields: { seq: e.message } }; }
  return {
    policy: {
      ...v.value,
      ...nums,
      end_date: addYearMinusDay(v.value.start_date),
      brown_card_no: String(body.brown_card_no || '').replace(/[<>"`]/g, '').trim().slice(0, 40) || null,
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!sameOrigin(req)) return json(res, 403, { error: 'Not allowed.' });
  const body = readBody(req);
  if (!body) return json(res, 400, { error: 'Request not understood.' });
  const ip = clientIp(req);

  try {
    if (body.action === 'order') {
      if (rateLimit(req, 'order', 10, 10 * MIN)) return json(res, 429, { error: 'Too many orders from this connection. Please wait a few minutes or WhatsApp us.' });
      const v = validateOrder(body.order || {});
      if (!v.ok) return json(res, 400, { error: 'Please correct the highlighted fields.', fields: v.errors });
      const order = { ...v.value, reference: newReference(), created_at: new Date().toISOString() };
      return json(res, 200, { order, sig: signOrder(order) });
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

    if (body.action === 'verify') {
      return json(res, 200, { valid: verifyOrder(body.order, body.sig) });
    }

    if (body.action === 'check') {
      return json(res, 200, await checkConnection());
    }

    if (body.action === 'npf') {
      const p = preparePolicy(body);
      if (p.error) return json(res, 400, p);
      const result = await sendToNpf(p.policy);
      console.log('NPF upload', p.policy.policy_no, result.status, result.httpStatus, result.message);
      return json(res, 200, {
        ...result,
        policy_no: p.policy.policy_no, certificate_no: p.policy.certificate_no, end_date: p.policy.end_date,
        receipt: result.status === 'SUCCESS' ? npfReceipt(p.policy) : undefined,
      });
    }

    if (body.action === 'certificate') {
      const p = preparePolicy(body);
      if (p.error) return json(res, 400, p);
      if (!verifyReceipt(p.policy, body.receipt)) {
        return json(res, 409, { error: 'Send this policy to NPF first. The certificate unlocks only after NPF says SUCCESS, and only for exactly the details NPF accepted.' });
      }
      const pdf = await buildCertificate(p.policy);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${p.policy.certificate_no.replace(/\//g, '-')}.pdf"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(Buffer.from(pdf));
    }

    return json(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('admin error', e?.stack || e);
    return json(res, 500, { error: 'Something went wrong on the server. Please try again. If it keeps happening, send a screenshot to IT.' });
  }
}
