// Staff page: open an order (from the email link, or type in a walk-in sale),
// give it the next number, download the certificate, send the policy to NPF.
// No database: this page keeps a log on this device; the office spreadsheet is the official record.
import { useEffect, useMemo, useState } from "react";
import { LogOut, FileDown, Send, AlertTriangle, CheckCircle, Copy, Download, MessageCircle, ClipboardPaste } from "lucide-react";
import { api, naira, longDate, store } from "../lib/api";
import { PRODUCTS, STATES, SERIES, decodeOrder, policyNumbers, addYearMinusDay, todayLagos, validateOrder } from "../../shared/motor.js";

const LOG_KEY = "rt_issue_log";
const SEQ_KEY = "rt_last_seq";
const input = "w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const blank = () => ({
  product: "private_motor", insured_name: "", phone: "", email: "", address: "", zone: "Lagos",
  reg_no: "", old_reg_no: "", vehicle_make: "", vehicle_model: "", vehicle_type: "Saloon", vehicle_color: "", year_of_make: "",
  chassis_no: "", engine_no: "", engine_capacity: "", start_date: todayLagos(), reference: "",
});

const readLog = () => { try { return JSON.parse(store.get(LOG_KEY) || "[]"); } catch { return []; } };
const writeLog = (l) => store.set(LOG_KEY, JSON.stringify(l));

const COLS = ["Date issued", "Reference", "Policy No", "Certificate No", "Brown Card", "Cover", "Premium", "Policy holder", "Phone", "Plate", "Start", "End", "NPF status", "NPF message"];
const toRow = (e) => [e.at?.slice(0, 10), e.reference, e.policy_no, e.certificate_no, e.brown_card_no, PRODUCTS[e.product]?.short, e.premium, e.insured_name, e.phone, e.reg_no, e.start_date, e.end_date, e.npf_status, e.npf_message];

const F = ({ label, k, o, set, errors, children, wide }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <label className="block text-gray-600 text-xs font-semibold mb-1">{label}</label>
    {children || <input className={input + (errors[k] ? " border-red-400" : " border-gray-300")} value={o[k] || ""} onChange={(e) => set(k, e.target.value)} />}
    {errors[k] && <p className="text-red-600 text-xs mt-0.5">{errors[k]}</p>}
  </div>
);

const AdminPage = ({ navigate }) => {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem("rt_admin") || ""; } catch { return ""; } });
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const [o, setO] = useState(() => {
    const d = new URLSearchParams(window.location.search).get("d");
    const dec = d ? decodeOrder(d) : null;
    return dec ? { ...blank(), ...dec } : blank();
  });
  const [fromLink] = useState(() => !!new URLSearchParams(window.location.search).get("d"));
  const [seq, setSeq] = useState(() => String((Number(store.get(SEQ_KEY)) || 0) + 1));
  const [brown, setBrown] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [log, setLog] = useState(readLog);
  const [paste, setPaste] = useState("");
  const [paid, setPaid] = useState(false);
  const [issuedNow, setIssuedNow] = useState("");

  useEffect(() => {
    // clean the long link out of the address bar once the order is loaded
    if (fromLink) window.history.replaceState({}, "", "/admin");
  }, [fromLink]);

  const set = (k, v) => setO((p) => ({ ...p, [k]: v }));
  const prod = PRODUCTS[o.product];

  const nums = useMemo(() => { try { return policyNumbers(o.product, seq, o.start_date); } catch { return null; } }, [o.product, seq, o.start_date]);
  const used = log.find((e) => nums && e.certificate_no === nums.certificate_no && e.certificate_no !== issuedNow);
  const dupRef = o.reference && log.find((e) => e.reference === o.reference && e.certificate_no !== issuedNow);

  const signOut = () => { try { sessionStorage.removeItem("rt_admin"); } catch { /* ignore */ } setToken(""); };

  const login = async (e) => {
    e.preventDefault(); setErr("");
    try {
      const r = await api("/api/admin", { method: "POST", body: { action: "login", password: pw } });
      try { sessionStorage.setItem("rt_admin", r.token); } catch { /* ignore */ }
      setToken(r.token); setPw("");
    } catch (x) { setErr(x.message); }
  };

  const check = () => {
    const v = validateOrder(o, { allowPastStart: true });
    setErrors(v.errors);
    if (!v.ok) { setMsg({ kind: "err", text: "Fix the highlighted fields first." }); return false; }
    if (!nums) { setMsg({ kind: "err", text: `Number must be 1 to ${SERIES.max}.` }); return false; }
    if (!paid) { setMsg({ kind: "err", text: "Tick the box to confirm the money is in the bank account." }); return false; }
    return true;
  };

  const upsertLog = (patch) => {
    const entry = {
      ...o, ...nums, brown_card_no: brown || "", premium: prod.premium,
      end_date: addYearMinusDay(o.start_date), at: new Date().toISOString(), npf_status: "NOT SENT", npf_message: "",
    };
    const existing = readLog();
    const i = existing.findIndex((e) => e.certificate_no === nums.certificate_no);
    const merged = i >= 0 ? { ...existing[i], ...entry, ...patch, at: existing[i].at } : { ...entry, ...patch };
    const next = i >= 0 ? existing.map((e, j) => (j === i ? merged : e)) : [merged, ...existing];
    writeLog(next); setLog(next); setIssuedNow(nums.certificate_no);
    if (Number(seq) > (Number(store.get(SEQ_KEY)) || 0)) store.set(SEQ_KEY, String(Number(seq)));
  };

  const download = async () => {
    if (!check()) return;
    if (used && !window.confirm(`${nums.certificate_no} was already used on this device for ${used.insured_name}. Download again anyway?`)) return;
    setBusy("cert"); setMsg(null);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "certificate", order: o, seq: Number(seq), brown_card_no: brown }) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); if (res.status === 401) signOut(); throw new Error(j.error || "Could not build certificate."); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${nums.certificate_no.replace(/\//g, "-")}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      upsertLog({});
      setMsg({ kind: "ok", text: `Certificate ${nums.certificate_no} downloaded. Now send it to NPF.` });
    } catch (x) { setMsg({ kind: "err", text: x.message }); } finally { setBusy(""); }
  };

  const sendNpf = async () => {
    if (!check()) return;
    const prior = log.find((e) => e.certificate_no === nums.certificate_no);
    if (prior?.npf_status === "SUCCESS" && !window.confirm(`NPF already accepted ${nums.policy_no}. Sending again may create a duplicate. Continue?`)) return;
    if (!window.confirm(`Send ${nums.policy_no} for ${o.insured_name} (${o.reg_no}) to NPF now?`)) return;
    setBusy("npf"); setMsg(null);
    try {
      const r = await api("/api/admin", { method: "POST", token, body: { action: "npf", order: o, seq: Number(seq), brown_card_no: brown } });
      upsertLog({ npf_status: r.status, npf_message: r.message });
      setMsg({ kind: r.status === "SUCCESS" ? "ok" : "err", text: `NPF: ${r.status.replace("_", " ")}. ${r.message}` });
    } catch (x) { if (x.status === 401) signOut(); setMsg({ kind: "err", text: x.message }); } finally { setBusy(""); }
  };

  const loadPasted = () => {
    const m = paste.match(/[?&]d=([A-Za-z0-9_-]+)/);
    const dec = decodeOrder(m ? m[1] : paste.trim());
    if (!dec) { setMsg({ kind: "err", text: "That link or code could not be read." }); return; }
    setIssuedNow(""); setO({ ...blank(), ...dec }); setPaste(""); setPaid(false); setBrown(""); setErrors({});
    setSeq(String((Number(store.get(SEQ_KEY)) || 0) + 1));
    setMsg({ kind: "ok", text: `Loaded order ${dec.reference || ""}.` });
  };

  const newSale = () => { setIssuedNow(""); setO(blank()); setPaid(false); setBrown(""); setErrors({}); setMsg(null); setSeq(String((Number(store.get(SEQ_KEY)) || 0) + 1)); };

  const copyRow = async (e) => { try { await navigator.clipboard.writeText(toRow(e).map((x) => x ?? "").join("\t")); setMsg({ kind: "ok", text: "Row copied. Paste it into the spreadsheet." }); } catch { /* ignore */ } };
  const downloadCsv = () => {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [COLS, ...log.map(toRow)].map((r) => r.map(q).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `risktech-motor-log-${todayLagos()}.csv`; a.click();
  };
  const waCustomer = (e) => {
    const phone = "234" + String(e.phone).replace(/^0/, "");
    const text = `Hello ${e.insured_name}, your payment is confirmed. Your NPF third party certificate ${e.certificate_no} (policy ${e.policy_no}) for ${e.reg_no} is attached, valid ${longDate(e.start_date)} to ${longDate(e.end_date)}. Thank you for choosing RiskTech Insurance Brokers.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B1F4B] flex items-center justify-center px-4">
        <form onSubmit={login} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <img src="/risktech_logo.png" alt="RiskTech" className="h-12 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Staff sign in</h1>
          <p className="text-gray-500 text-sm mb-5">{fromLink ? "Sign in to open this order." : "Issue motor certificates and report them to NPF."}</p>
          <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
          <button className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl">Sign in</button>
          <button type="button" onClick={() => navigate("home")} className="w-full text-gray-500 text-sm mt-3">Back to website</button>
        </form>
      </div>
    );
  }

  const fp = { o, set, errors };
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-[#0B1F4B] text-white px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <h1 className="font-bold text-lg">Issue motor certificate</h1>
          <div className="flex items-center gap-2">
            <button onClick={newSale} className="text-xs bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg">New walk-in sale</button>
            <button onClick={signOut} className="p-2 bg-white/15 hover:bg-white/25 rounded-lg" aria-label="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-2">
          <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste the 'Open in staff page' link from an order email" className={input + " border-gray-300 flex-1"} />
          <button onClick={loadPasted} className="flex items-center justify-center gap-1.5 bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"><ClipboardPaste size={15} /> Load order</button>
        </div>

        {msg && (
          <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${msg.kind === "ok" ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {msg.kind === "ok" ? <CheckCircle size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}<span>{msg.text}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="font-bold text-gray-900">{o.reference ? `Order ${o.reference}` : "Walk-in sale"}</p>
            <p className="text-sm text-gray-600">Premium <b>{naira(prod.premium)}</b></p>
          </div>
          {dupRef && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mb-3">This reference was already issued as {dupRef.certificate_no} on {dupRef.at?.slice(0, 10)}.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <F label="Cover" k="product" {...fp}>
              <select className={input + " border-gray-300"} value={o.product} onChange={(e) => setO((p) => ({ ...p, product: e.target.value, vehicle_type: PRODUCTS[e.target.value].bodyTypes[0] }))}>
                {Object.entries(PRODUCTS).map(([k, p]) => <option key={k} value={k}>{p.short} ({naira(p.premium)})</option>)}
              </select>
            </F>
            <F label="Policy holder" k="insured_name" {...fp} wide />
            <F label="Phone" k="phone" {...fp} />
            <F label="Email" k="email" {...fp} />
            <F label="Address" k="address" {...fp} />
            <F label="State" k="zone" {...fp}>
              <select className={input + " border-gray-300"} value={o.zone} onChange={(e) => set("zone", e.target.value)}><option value="">Select</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </F>
            <F label="Plate number" k="reg_no" {...fp} />
            <F label="Make" k="vehicle_make" {...fp} />
            <F label="Model" k="vehicle_model" {...fp} />
            <F label="Body type" k="vehicle_type" {...fp}>
              <select className={input + " border-gray-300"} value={o.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)}>{prod.bodyTypes.map((t) => <option key={t}>{t}</option>)}</select>
            </F>
            <F label="Colour" k="vehicle_color" {...fp} />
            <F label="Year of make" k="year_of_make" {...fp} />
            <F label="Chassis number" k="chassis_no" {...fp} />
            <F label="Engine number" k="engine_no" {...fp} />
            <F label="Engine capacity" k="engine_capacity" {...fp} />
            <F label="Cover starts" k="start_date" {...fp}>
              <input type="date" className={input + " border-gray-300"} value={o.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </F>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 mb-3">Numbers and payment</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-gray-600 text-xs font-semibold mb-1">Next number in series (1 to {SERIES.max})</label>
              <input inputMode="numeric" className={input + (used ? " border-amber-400" : " border-gray-300")} value={seq} onChange={(e) => setSeq(e.target.value.replace(/\D/g, "").slice(0, 3))} />
            </div>
            <div className="sm:col-span-2 text-sm bg-gray-50 rounded-lg p-3">
              {nums ? <>Policy <b>{nums.policy_no}</b><br />Certificate <b>{nums.certificate_no}</b><br />Valid {longDate(o.start_date)} to {longDate(addYearMinusDay(o.start_date))}</> : <span className="text-red-600">Enter a number from 1 to {SERIES.max}</span>}
            </div>
            <div className="sm:col-span-3">
              <label className="block text-gray-600 text-xs font-semibold mb-1">Brown Card number (optional)</label>
              <input className={input + " border-gray-300"} value={brown} onChange={(e) => setBrown(e.target.value)} placeholder="e.g. EBC/NG/NPFI/2026/..." />
            </div>
          </div>
          {used && <p className="text-amber-800 text-sm mt-2">This number was already used on this device for {used.insured_name} ({used.reg_no}). Check the spreadsheet before reusing it.</p>}
          <label className="flex items-start gap-2 mt-4 text-sm text-gray-800">
            <input type="checkbox" className="mt-1" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            <span>I have checked the Jaiz Bank account and {naira(prod.premium)}{o.reference ? ` with narration ${o.reference}` : ""} has arrived.</span>
          </label>
          <div className="flex flex-wrap gap-2 mt-4">
            <button disabled={!!busy} onClick={download} className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"><FileDown size={16} /> {busy === "cert" ? "Building..." : "1. Download certificate"}</button>
            <button disabled={!!busy} onClick={sendNpf} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"><Send size={16} /> {busy === "npf" ? "Sending..." : "2. Send to NPF"}</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="font-bold text-gray-900">Issued on this device ({log.length})</p>
            {log.length > 0 && <button onClick={downloadCsv} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700"><Download size={15} /> Download CSV for the spreadsheet</button>}
          </div>
          {!log.length && <p className="text-gray-500 text-sm">Nothing yet. Each certificate you issue appears here so you can copy it into the office spreadsheet.</p>}
          <div className="space-y-2">
            {log.map((e) => (
              <div key={e.certificate_no} className="border border-gray-100 rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{e.certificate_no} &middot; {e.insured_name} &middot; {e.reg_no}</p>
                  <p className="text-gray-500 text-xs">{e.policy_no} &middot; {naira(e.premium)} &middot; {e.at?.slice(0, 10)} &middot; NPF: <span className={e.npf_status === "SUCCESS" ? "text-green-700 font-semibold" : "text-amber-700 font-semibold"}>{e.npf_status}</span>{e.npf_message ? ` (${e.npf_message})` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyRow(e)} className="flex items-center gap-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"><Copy size={12} /> Copy row</button>
                  <a href={waCustomer(e)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-[#25D366] text-white rounded-lg px-2.5 py-1.5"><MessageCircle size={12} /> WhatsApp customer</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
