// Staff-only endpoint. Login, build a certificate PDF, send a policy to NPF.
// No database: the staff page keeps the running log and the spreadsheet is the record.
import { json, readBody, rateLimit } from './_lib/http.js';
import { checkPassword, issueToken, isAdmin } from './_lib/auth.js';
import { buildCertificate } from './_lib/certificate.js';
import { sendToNpf } from './_lib/npf.js';
import { validateOrder, policyNumbers, addYearMinusDay } from '../shared/motor.js';

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
      brown_card_no: String(body.brown_card_no || '').trim().slice(0, 40) || null,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const body = readBody(req);

  try {
    if (body.action === 'login') {
      if (rateLimit(req, 'login', 8, 15 * 60_000)) return json(res, 429, { error: 'Too many attempts. Wait 15 minutes.' });
      if (!process.env.ADMIN_PASSWORD) return json(res, 500, { error: 'ADMIN_PASSWORD is not set in Vercel.' });
      if (!checkPassword(body.password)) return json(res, 401, { error: 'Wrong password.' });
      return json(res, 200, { token: issueToken() });
    }

    if (!isAdmin(req)) return json(res, 401, { error: 'Please sign in again.' });

    if (body.action === 'certificate') {
      const p = preparePolicy(body);
      if (p.error) return json(res, 400, p);
      const pdf = await buildCertificate(p.policy);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${p.policy.certificate_no.replace(/\//g, '-')}.pdf"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(pdf);
    }

    if (body.action === 'npf') {
      const p = preparePolicy(body);
      if (p.error) return json(res, 400, p);
      const result = await sendToNpf(p.policy);
      console.log('NPF upload', p.policy.policy_no, result.status, result.message);
      return json(res, 200, { ...result, policy_no: p.policy.policy_no, certificate_no: p.policy.certificate_no, end_date: p.policy.end_date });
    }

    return json(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('admin error', e?.message || e);
    return json(res, 500, { error: e?.message || 'Server error' });
  }
}
