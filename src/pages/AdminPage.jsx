// Staff page: open an order (from the email link, or type in a walk-in sale), give it the next number,
// send the policy to NPF, and only after NPF says SUCCESS download the certificate.
// No database: this page keeps a log on this device; the office spreadsheet is the official record.
import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, FileDown, Send, AlertTriangle, CheckCircle, Copy, Download, MessageCircle, ClipboardPaste, Lock, Wifi, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
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

const readLog = () => { try { const l = JSON.parse(store.get(LOG_KEY) || "[]"); return Array.isArray(l) ? l : []; } catch { return []; } };
const writeLog = (l) => store.set(LOG_KEY, JSON.stringify(l.slice(0, 500)));
const nextSeq = () => String(Math.min((Number(store.get(SEQ_KEY)) || 0) + 1, SERIES.max));

const COLS = ["Date issued", "Reference", "Policy No", "Certificate No", "Brown Card", "Cover", "Premium", "Policy holder", "Phone", "Plate", "Start", "End", "NPF status", "NPF message"];
const toRow = (e) => [e.at?.slice(0, 10), e.reference, e.policy_no, e.certificate_no, e.brown_card_no, PRODUCTS[e.product]?.short, e.premium, e.insured_name, e.phone, e.reg_no, e.start_date, e.end_date, e.npf_status, e.npf_message];

// The details NPF's acceptance covers. If any of these change after SUCCESS, the certificate locks again.
const fingerprint = (o, seq) => JSON.stringify([seq, o.product, o.insured_name, o.reg_no, o.chassis_no, o.engine_no, o.start_date].map((x) => String(x ?? "").trim().toUpperCase()));

const STATUS_STYLE = {
  SUCCESS: "bg-green-50 border-green-300 text-green-900",
  FAILED: "bg-red-50 border-red-300 text-red-900",
  MANUAL_REVIEW: "bg-amber-50 border-amber-300 text-amber-900",
  RETRY: "bg-amber-50 border-amber-300 text-amber-900",
  UNKNOWN: "bg-amber-50 border-amber-300 text-amber-900",
};
const STATUS_TITLE = { SUCCESS: "NPF: SUCCESS", FAILED: "NPF: NOT ACCEPTED", MANUAL_REVIEW: "NPF: ACCOUNT OR SETTINGS PROBLEM", RETRY: "NPF: TRY AGAIN", UNKNOWN: "CONNECTION LOST" };

const F = ({ label, k, o, set, errors, children, wide, locked }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <label className="block text-gray-600 text-xs font-semibold mb-1">{label}</label>
    {children || <input disabled={locked} className={input + (errors[k] ? " border-red-400" : " border-gray-300") + (locked ? " bg-gray-50 text-gray-700" : "")} value={o[k] || ""} onChange={(e) => set(k, e.target.value)} />}
    {errors[k] && <p className="text-red-600 text-xs mt-0.5">{errors[k]}</p>}
  </div>
);

const AdminPage = ({ navigate }) => {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem("rt_admin") || ""; } catch { return ""; } });
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [o, setO] = useState(() => {
    const dec = params.get("d") ? decodeOrder(params.get("d")) : null;
    return dec && typeof dec === "object" ? { ...blank(), ...dec } : blank();
  });
  const [linkOrder, setLinkOrder] = useState(() => (params.get("d") ? { order: decodeOrder(params.get("d")), sig: params.get("s") || "" } : null));
  const [verified, setVerified] = useState(null); // null = not checked / walk-in, true, false
  const fromLink = !!params.get("d");

  const [seq, setSeq] = useState(nextSeq);
  const [brown, setBrown] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const [msg, setMsg] = useState(null);
  const [result, setResult] = useState(null); // last NPF answer for this sale
  const [sent, setSent] = useState(null);     // { fp, receipt } after SUCCESS
  const [log, setLog] = useState(readLog);
  const [paste, setPaste] = useState("");
  const [paid, setPaid] = useState(false);
  const [conn, setConn] = useState(null);

  useEffect(() => {
    // clean the long link out of the address bar once the order is loaded
    if (fromLink) window.history.replaceState({}, "", "/admin");
  }, [fromLink]);

  // Once signed in, ask the server whether the order link came from the website untouched
  useEffect(() => {
    if (!token || !linkOrder?.order || !linkOrder.sig) return;
    let live = true;
    api("/api/admin", { method: "POST", token, body: { action: "verify", order: linkOrder.order, sig: linkOrder.sig } })
      .then((r) => live && setVerified(!!r.valid))
      .catch((x) => { if (x.status === 401) signOut(); else if (live) setVerified(false); });
    return () => { live = false; };
  }, [token, linkOrder]);
  const genuine = linkOrder ? (linkOrder.sig ? verified : false) : null; // unsigned links are never "genuine"

  const prod = PRODUCTS[o.product] || PRODUCTS.private_motor;
  const nums = useMemo(() => { try { return policyNumbers(o.product, seq, o.start_date); } catch { return null; } }, [o.product, seq, o.start_date]);
  const fp = fingerprint(o, seq);
  const accepted = sent && sent.fp === fp;          // NPF accepted exactly these details
  const changedAfter = sent && sent.fp !== fp;      // details edited after NPF accepted them

  const usedSuccess = log.find((e) => nums && e.certificate_no === nums.certificate_no && e.npf_status === "SUCCESS");
  const usedOther = usedSuccess && !accepted;
  const dupRef = o.reference && log.find((e) => e.reference === o.reference && e.npf_status === "SUCCESS" && !(accepted && e.certificate_no === nums?.certificate_no));

  const set = (k, v) => setO((p) => ({ ...p, [k]: v }));

  function signOut(note) {
    try { sessionStorage.removeItem("rt_admin"); } catch { /* ignore */ }
    setToken("");
    if (note) setErr(note);
  }

  const login = async (e) => {
    e.preventDefault(); setErr("");
    if (!pw) { setErr("Enter the staff password."); return; }
    setSigningIn(true);
    try {
      const r = await api("/api/admin", { method: "POST", body: { action: "login", password: pw } });
      try { sessionStorage.setItem("rt_admin", r.token); } catch { /* ignore */ }
      setToken(r.token); setPw("");
    } catch (x) { setErr(x.status ? x.message : "No internet connection. Check your network and try again."); }
    finally { setSigningIn(false); }
  };

  const check = () => {
    const v = validateOrder(o, { allowPastStart: true });
    setErrors(v.errors);
    if (!v.ok) { setMsg({ kind: "err", text: "Fix the fields marked in red first." }); return false; }
    if (!nums) { setMsg({ kind: "err", text: `The number must be from 1 to ${SERIES.max}.` }); return false; }
    if (!paid) { setMsg({ kind: "err", text: "Tick the box to confirm the money is in the Jaiz Bank account." }); return false; }
    return true;
  };

  const upsertLog = (patch) => {
    const entry = {
      ...o, ...nums, seq: Number(seq), brown_card_no: brown || "", premium: prod.premium,
      end_date: addYearMinusDay(o.start_date), at: new Date().toISOString(), npf_status: "NOT SENT", npf_message: "",
    };
    const existing = readLog();
    const i = existing.findIndex((e) => e.certificate_no === nums.certificate_no);
    // never overwrite an earlier SUCCESS with a later failure for the same number
    if (i >= 0 && existing[i].npf_status === "SUCCESS" && patch.npf_status !== "SUCCESS") return;
    const merged = i >= 0 ? { ...existing[i], ...entry, ...patch, at: existing[i].at } : { ...entry, ...patch };
    const next = i >= 0 ? existing.map((e, j) => (j === i ? merged : e)) : [merged, ...existing];
    writeLog(next); setLog(next);
    if (patch.npf_status === "SUCCESS" && Number(seq) > (Number(store.get(SEQ_KEY)) || 0)) store.set(SEQ_KEY, String(Number(seq)));
  };

  const sendNpf = async () => {
    if (busyRef.current) return;
    setMsg(null);
    if (!check()) return;
    if (usedOther) { setMsg({ kind: "err", text: `${nums.certificate_no} was already accepted by NPF for ${usedSuccess.insured_name} (${usedSuccess.reg_no}). Use the next number.` }); return; }
    const samePlate = log.find((e) => e.npf_status === "SUCCESS" && e.reg_no === String(o.reg_no).toUpperCase().replace(/[\s-]/g, "") && e.certificate_no !== nums.certificate_no && e.end_date >= todayLagos());
    if (samePlate && !window.confirm(`${samePlate.reg_no} already has a valid policy (${samePlate.certificate_no}, until ${longDate(samePlate.end_date)}). Send another policy for the same plate?`)) return;
    if (!window.confirm(`Send ${nums.policy_no} for ${o.insured_name} (${o.reg_no}) to NPF now?`)) return;

    busyRef.current = true; setBusy("npf"); setResult(null);
    try {
      const r = await api("/api/admin", { method: "POST", token, body: { action: "npf", order: o, seq: Number(seq), brown_card_no: brown } });
      setResult(r);
      if (r.status === "SUCCESS" && r.receipt) {
        setSent({ fp, receipt: r.receipt });
        upsertLog({ npf_status: "SUCCESS", npf_message: r.message, receipt: r.receipt });
      } else {
        upsertLog({ npf_status: r.status, npf_message: r.message });
      }
    } catch (x) {
      if (x.status === 401) { signOut("You were signed out for safety. Sign in again, then press Send to NPF again."); return; }
      if (x.status === 400 && x.fields) { setErrors(x.fields); setMsg({ kind: "err", text: x.message }); return; }
      if (!x.status) {
        setResult({ status: "UNKNOWN", explain: "The internet connection dropped before NPF replied, so we do not know if NPF received it. Wait 2 minutes, then press Send to NPF again. If NPF then says the policy already exists, the first send worked: tell IT before issuing.", message: "" });
        upsertLog({ npf_status: "UNKNOWN", npf_message: "Connection lost before NPF replied" });
      } else setMsg({ kind: "err", text: x.message });
    } finally { busyRef.current = false; setBusy(""); }
  };

  const downloadFor = async (entry, receipt, seqNo, brownNo) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy("cert"); setMsg(null);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "certificate", order: entry, seq: Number(seqNo), brown_card_no: brownNo, receipt }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 401) { signOut("You were signed out for safety. Sign in again to download."); return; }
        throw new Error(j.error || "Could not build the certificate. Try again.");
      }
      const blob = await res.blob();
      const name = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || "certificate.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMsg({ kind: "ok", text: `Certificate ${name.replace(".pdf", "").replace("-", "/")} downloaded. Now press "WhatsApp customer" and attach it.` });
    } catch (x) { setMsg({ kind: "err", text: x.message === "Failed to fetch" ? "No internet connection. Try again." : x.message }); }
    finally { busyRef.current = false; setBusy(""); }
  };
  const download = () => accepted && downloadFor(o, sent.receipt, seq, brown);

  const checkConn = async () => {
    setConn({ loading: true });
    try { setConn(await api("/api/admin", { method: "POST", token, body: { action: "check" } })); }
    catch (x) { if (x.status === 401) signOut("You were signed out for safety. Please sign in again."); else setConn({ error: x.status ? x.message : "No internet connection." }); }
  };

  const reset = (order, linkInfo = null) => {
    setO(order); setLinkOrder(linkInfo); setVerified(null); setPaid(false); setBrown(""); setErrors({});
    setResult(null); setSent(null); setSeq(nextSeq());
  };

  const loadPasted = () => {
    const d = paste.match(/[?&]d=([A-Za-z0-9_-]+)/)?.[1] || paste.trim();
    const s = paste.match(/[?&]s=([A-Za-z0-9_-]+)/)?.[1] || "";
    const dec = decodeOrder(d);
    if (!dec || typeof dec !== "object" || !dec.reg_no) { setMsg({ kind: "err", text: "That link could not be read. Copy the whole link from the email and try again." }); return; }
    reset({ ...blank(), ...dec }, { order: dec, sig: s }); setPaste("");
    setMsg({ kind: "ok", text: `Loaded order ${dec.reference || ""}.` });
  };

  const newSale = () => { reset(blank()); setMsg(null); };

  const copyRow = async (e) => { try { await navigator.clipboard.writeText(toRow(e).map((x) => x ?? "").join("\t")); setMsg({ kind: "ok", text: "Row copied. Paste it into the spreadsheet." }); } catch { setMsg({ kind: "err", text: "Could not copy. Use Download CSV instead." }); } };
  const downloadCsv = () => {
    // a leading = + - @ would run as a formula in Excel, so it is neutralised
    const q = (v) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const csv = [COLS, ...log.map(toRow)].map((r) => r.map(q).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `risktech-motor-log-${todayLagos()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  const waCustomer = (e) => {
    const phone = "234" + String(e.phone).replace(/\D/g, "").replace(/^0/, "");
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
          <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
          <button disabled={signingIn} className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl">{signingIn ? "Checking..." : "Sign in"}</button>
          <button type="button" onClick={() => navigate("home")} className="w-full text-gray-500 text-sm mt-3">Back to website</button>
        </form>
      </div>
    );
  }

  const locked = !!accepted; // after NPF accepts, the details are frozen so the certificate matches NPF's record
  const fprops = { o, set, errors, locked };
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-[#0B1F4B] text-white px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <h1 className="font-bold text-base sm:text-lg whitespace-nowrap">Issue certificate</h1>
          <div className="flex items-center gap-2">
            <button onClick={newSale} className="text-xs bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg whitespace-nowrap">New sale</button>
            <button onClick={() => signOut()} className="p-2 bg-white/15 hover:bg-white/25 rounded-lg" aria-label="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-2">
          <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste the 'Open in staff page' link from an order email" className={input + " border-gray-300 flex-1"} />
          <button onClick={loadPasted} className="flex items-center justify-center gap-1.5 bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"><ClipboardPaste size={15} /> Load order</button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <button onClick={checkConn} disabled={conn?.loading} className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60 whitespace-nowrap">
            {conn?.loading ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />} Check NPF connection
          </button>
          <div className="text-sm" data-testid="conn">
            {!conn && <span className="text-gray-500">Checks the NPF settings and that NPF's server answers. Sends no policy.</span>}
            {conn?.error && <span className="text-red-700">{conn.error}</span>}
            {conn && !conn.loading && !conn.error && (
              conn.settingsOk && conn.reachable
                ? <span className="text-green-800 font-semibold">Ready: NPF settings present (NAICOM ID {conn.naicomId}) and {conn.host} answered in {conn.ms} ms.</span>
                : <span className="text-red-700 font-semibold">
                    {!conn.settingsOk && `Missing in Vercel: ${conn.missing.join(", ")}. `}
                    {!conn.reachable && `NPF's server did not answer (${conn.error || "no reply"}). Try again later.`}
                  </span>
            )}
          </div>
        </div>

        {msg && (
          <div role="status" className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${msg.kind === "ok" ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {msg.kind === "ok" ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}<span>{msg.text}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="font-bold text-gray-900">{o.reference ? `Order ${o.reference}` : "Walk-in sale"}</p>
            <p className="text-sm text-gray-600">Premium <b>{naira(prod.premium)}</b></p>
          </div>
          {genuine === true && <p className="flex items-center gap-1.5 text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm mb-3"><ShieldCheck size={15} /> Genuine order from the website. The link has not been changed.</p>}
          {genuine === false && <p className="flex items-start gap-1.5 text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm mb-3"><ShieldAlert size={15} className="mt-0.5 flex-shrink-0" /> Warning: this link was changed or did not come from the website. Check every detail against the customer's vehicle papers and the bank before sending.</p>}
          {dupRef && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mb-3">This reference was already issued as {dupRef.certificate_no} on {dupRef.at?.slice(0, 10)}.</p>}
          {locked && <p className="flex items-center gap-1.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"><Lock size={14} /> NPF accepted these details, so they are locked to match the certificate. Press "New sale" for the next customer.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <F label="Cover" k="product" {...fprops}>
              <select disabled={locked} className={input + " border-gray-300"} value={o.product} onChange={(e) => setO((p) => ({ ...p, product: e.target.value, vehicle_type: PRODUCTS[e.target.value].bodyTypes[0] }))}>
                {Object.entries(PRODUCTS).map(([k, p]) => <option key={k} value={k}>{p.short} ({naira(p.premium)})</option>)}
              </select>
            </F>
            <F label="Policy holder" k="insured_name" {...fprops} wide />
            <F label="Phone" k="phone" {...fprops} />
            <F label="Email" k="email" {...fprops} />
            <F label="Address" k="address" {...fprops} />
            <F label="State" k="zone" {...fprops}>
              <select disabled={locked} className={input + " border-gray-300"} value={o.zone} onChange={(e) => set("zone", e.target.value)}><option value="">Select</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </F>
            <F label="Plate number" k="reg_no" {...fprops} />
            <F label="Make" k="vehicle_make" {...fprops} />
            <F label="Model" k="vehicle_model" {...fprops} />
            <F label="Body type" k="vehicle_type" {...fprops}>
              <select disabled={locked} className={input + " border-gray-300"} value={o.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)}>{prod.bodyTypes.map((t) => <option key={t}>{t}</option>)}</select>
            </F>
            <F label="Colour" k="vehicle_color" {...fprops} />
            <F label="Year of make" k="year_of_make" {...fprops} />
            <F label="Chassis number" k="chassis_no" {...fprops} />
            <F label="Engine number" k="engine_no" {...fprops} />
            <F label="Engine capacity" k="engine_capacity" {...fprops} />
            <F label="Cover starts" k="start_date" {...fprops}>
              <input disabled={locked} type="date" className={input + " border-gray-300"} value={o.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </F>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 mb-3">Numbers and payment</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-gray-600 text-xs font-semibold mb-1">Next number in series (1 to {SERIES.max})</label>
              <input disabled={locked} inputMode="numeric" className={input + (usedOther ? " border-red-400" : " border-gray-300")} value={seq} onChange={(e) => setSeq(e.target.value.replace(/\D/g, "").slice(0, 3))} />
            </div>
            <div className="sm:col-span-2 text-sm bg-gray-50 rounded-lg p-3">
              {nums ? <>Policy <b>{nums.policy_no}</b><br />Certificate <b>{nums.certificate_no}</b><br />Valid {longDate(o.start_date)} to {longDate(addYearMinusDay(o.start_date))}</> : <span className="text-red-600">Enter a number from 1 to {SERIES.max}</span>}
            </div>
            <div className="sm:col-span-3">
              <label className="block text-gray-600 text-xs font-semibold mb-1">Brown Card number (optional)</label>
              <input className={input + " border-gray-300"} value={brown} onChange={(e) => setBrown(e.target.value)} maxLength={40} placeholder="e.g. EBC/NG/NPFI/2026/..." />
            </div>
          </div>
          {usedOther && <p className="text-red-700 text-sm mt-2">This number was already accepted by NPF for {usedSuccess.insured_name} ({usedSuccess.reg_no}). Use the next number.</p>}
          <label className="flex items-start gap-2 mt-4 text-sm text-gray-800">
            <input type="checkbox" className="mt-1" checked={paid} disabled={locked} onChange={(e) => setPaid(e.target.checked)} />
            <span>I have checked the Jaiz Bank account and {naira(prod.premium)}{o.reference ? ` with narration ${o.reference}` : ""} has arrived.</span>
          </label>

          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            <button disabled={!!busy || !!accepted} onClick={sendNpf}
              className={`flex items-center justify-center gap-2 text-sm font-bold px-4 py-3.5 rounded-xl text-white disabled:cursor-not-allowed ${accepted ? "bg-green-700" : "bg-green-600 hover:bg-green-700 disabled:opacity-60"}`}>
              {busy === "npf" ? <><Loader2 size={16} className="animate-spin" /> Sending to NPF...</> : accepted ? <><CheckCircle size={16} /> 1. Sent to NPF</> : <><Send size={16} /> 1. Send to NPF</>}
            </button>
            <button disabled={!!busy || !accepted} onClick={download}
              className="flex items-center justify-center gap-2 text-sm font-bold px-4 py-3.5 rounded-xl text-white bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed">
              {busy === "cert" ? <><Loader2 size={16} className="animate-spin" /> Building...</> : accepted ? <><FileDown size={16} /> 2. Download certificate</> : <><Lock size={15} /> 2. Download certificate</>}
            </button>
          </div>
          {!accepted && <p className="text-gray-500 text-xs mt-2">The certificate unlocks only after NPF says SUCCESS.</p>}
          {changedAfter && <p className="text-amber-800 text-sm mt-2">You changed the details after NPF accepted them, so the certificate is locked again. Press "New sale" to start over.</p>}

          {result && (
            <div className={`mt-4 border rounded-xl p-4 text-sm ${STATUS_STYLE[result.status] || STATUS_STYLE.FAILED}`} data-testid="npf-result">
              <p className="font-bold flex items-center gap-1.5">{result.status === "SUCCESS" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}{STATUS_TITLE[result.status] || `NPF: ${result.status}`}</p>
              <p className="mt-1">{result.explain}</p>
              {result.message && <p className="mt-2"><span className="font-semibold">NPF said:</span> {result.message}</p>}
              {result.raw && (
                <details className="mt-2"><summary className="cursor-pointer font-semibold">Show NPF's full reply (for Aliyu or IT)</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all bg-white/70 rounded-lg p-2 text-xs">{result.raw}{result.httpStatus ? `\n\nHTTP ${result.httpStatus}` : ""}</pre>
                </details>
              )}
              {result.status === "SUCCESS" && (
                <a href={waCustomer({ ...o, ...nums, end_date: addYearMinusDay(o.start_date) })} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 bg-[#25D366] text-white font-semibold rounded-lg px-3 py-2"><MessageCircle size={14} /> WhatsApp customer</a>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="font-bold text-gray-900">Issued on this device ({log.length})</p>
            {log.length > 0 && <button onClick={downloadCsv} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700"><Download size={15} /> Download CSV for the spreadsheet</button>}
          </div>
          {!log.length && <p className="text-gray-500 text-sm">Nothing yet. Each policy you send appears here so you can copy it into the office spreadsheet.</p>}
          <div className="space-y-2">
            {log.map((e) => (
              <div key={e.certificate_no} className="border border-gray-100 rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 break-words">{e.certificate_no} &middot; {e.insured_name} &middot; {e.reg_no}</p>
                  <p className="text-gray-500 text-xs break-words">{e.policy_no} &middot; {naira(e.premium)} &middot; {e.at?.slice(0, 10)} &middot; NPF: <span className={e.npf_status === "SUCCESS" ? "text-green-700 font-semibold" : "text-amber-700 font-semibold"}>{e.npf_status}</span>{e.npf_message ? ` (${e.npf_message})` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copyRow(e)} className="flex items-center gap-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"><Copy size={12} /> Copy row</button>
                  {e.npf_status === "SUCCESS" && e.receipt && (
                    <>
                      <button disabled={!!busy} onClick={() => downloadFor(e, e.receipt, e.seq || Number(String(e.certificate_no).slice(-3)), e.brown_card_no)} className="flex items-center gap-1 text-xs border border-blue-300 text-blue-700 rounded-lg px-2.5 py-1.5"><FileDown size={12} /> Certificate</button>
                      <a href={waCustomer(e)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-[#25D366] text-white rounded-lg px-2.5 py-1.5"><MessageCircle size={12} /> WhatsApp customer</a>
                    </>
                  )}
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
