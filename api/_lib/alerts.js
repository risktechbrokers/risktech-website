// Email alerts from the staff page, sent through RiskTech's existing EmailJS account.
// Turned on by Vercel settings; if they are missing, alerts are simply skipped (nothing breaks).
//   EMAILJS_PRIVATE_KEY         EmailJS > Account > API keys > Private key
//   EMAILJS_ALERT_TEMPLATE_ID   a template whose "To email" is {{to_email}} (falls back to the order template)
//   ALERT_EMAIL_COMPANY         defaults to risktechbrokers@gmail.com
//   ALERT_EMAIL_PERSONAL        Head of IT's own email
import { CONTACT_EMAIL } from '../../shared/motor.js';

const SERVICE_ID = 'service_r9hj031';
const ORDER_TEMPLATE_ID = 'template_20jtn8c';
const PUBLIC_KEY = '2Q8Nq2E5ZLTAwqv7a'; // public by design (it is in the website's own code)

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const alertsEnabled = () => !!process.env.EMAILJS_PRIVATE_KEY;

// Who gets which alert
function recipients(kind) {
  const company = process.env.ALERT_EMAIL_COMPANY || CONTACT_EMAIL;
  const personal = process.env.ALERT_EMAIL_PERSONAL || '';
  const both = [company, personal].filter(Boolean);
  const map = { issued: [company], corrected: both, cancelled: both, login: [personal || company] };
  return [...new Set(map[kind] || [company])];
}

// Login alerts at most once an hour, so a busy day does not use up the EmailJS monthly limit.
let lastLoginAlert = 0;

export async function sendAlert(kind, subject, rows, { fetchImpl = fetch, timeoutMs = 6000 } = {}) {
  if (!alertsEnabled()) return { sent: 0, skipped: 'not set up' };
  if (kind === 'login') {
    if (Date.now() - lastLoginAlert < 3600_000) return { sent: 0, skipped: 'hourly limit' };
    lastLoginAlert = Date.now();
  }
  const when = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });
  const table = rows.map(([k, v]) => `<tr><td style="padding:6px 10px;font-weight:bold;color:#0B1F4B">${esc(k)}</td><td style="padding:6px 10px">${esc(v)}</td></tr>`).join('');
  const message = `<div style="font-family:Arial,sans-serif;font-size:14px"><p style="background:#0B1F4B;color:#fff;padding:10px 14px;font-weight:bold;margin:0">STAFF PAGE ALERT &middot; ${esc(subject)}</p><table style="border-collapse:collapse;margin-top:8px">${table}<tr><td style="padding:6px 10px;font-weight:bold;color:#0B1F4B">Time (Lagos)</td><td style="padding:6px 10px">${esc(when)}</td></tr></table><p style="color:#666;font-size:12px">If you did not expect this, change the staff password in Vercel straight away.</p></div>`;
  let sent = 0;
  for (const to of recipients(kind)) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetchImpl('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: SERVICE_ID,
          template_id: process.env.EMAILJS_ALERT_TEMPLATE_ID || ORDER_TEMPLATE_ID,
          user_id: PUBLIC_KEY,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
          template_params: { to_email: to, from_name: 'RiskTech staff page', from_email: 'no-reply@risktechinsurance.com', from_phone: '', subject: `RiskTech: ${subject}`, message },
        }),
        signal: ctrl.signal,
      });
      if (r.ok) sent++;
      else console.error('alert email failed', r.status, (await r.text()).slice(0, 200));
    } catch (e) {
      console.error('alert email error', e?.message || e);
    } finally { clearTimeout(t); }
  }
  return { sent };
}

export const _resetAlertThrottle = () => { lastLoginAlert = 0; };
