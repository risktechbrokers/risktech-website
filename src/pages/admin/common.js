// Small pieces shared by the staff page sections.
import { longDate, store } from "../../lib/api";
import { PRODUCTS, NPF_LOOKUP_URL } from "../../../shared/motor.js";

export const input = "w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-700";

// This device's own copy of the log. Still kept as a backup, and used when the shared list is off.
const LOG_KEY = "rt_npf_log";
export const readLog = () => { try { const l = JSON.parse(store.get(LOG_KEY) || "[]"); return Array.isArray(l) ? l : []; } catch { return []; } };
export const writeLog = (l) => store.set(LOG_KEY, JSON.stringify(l.slice(0, 500)));

export const COLS = ["Date issued", "Reference", "Policy No", "Certificate No", "NPF policy ID", "Cover", "Premium", "Policy holder", "NIN (last 4)", "Phone", "Plate", "Start", "End", "NPF status", "NPF message"];
export const toRow = (e) => [e.at?.slice(0, 10), e.reference, e.policy_number, e.certificate_no, e.policy_id, PRODUCTS[e.product]?.short, e.premium, e.name, e.nin_masked, e.phone, e.reg_no, e.start_date, e.end_date, e.status, e.message];

// A leading = + - @ would run as a formula in Excel, so it is neutralised
export function downloadCsv(rows, filename) {
  const q = (v) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const csv = rows.map((r) => r.map(q).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const waCustomer = (e) => {
  const phone = "234" + String(e.phone).replace(/\D/g, "").replace(/^0/, "");
  const text = `Hello ${e.name}, your payment is confirmed and NPF Insurance has issued your third party policy for ${e.reg_no}.\nPolicy number: ${e.policy_number}\nCertificate number: ${e.certificate_no}\nValid ${longDate(e.start_date)} to ${longDate(e.end_date)}.\nYour Certificate and Brown Card are attached. You can also download them any time at ${NPF_LOOKUP_URL} with your policy number, plate number and phone number.\nThank you for choosing RiskTech Insurance Brokers.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

// Same policy in two lists? (NPF's policy id, or the device key for "no answer" entries)
export const samePolicy = (a, b) => (a.policy_id && b.policy_id && String(a.policy_id) === String(b.policy_id)) || (a.key && a.key === b.key);
