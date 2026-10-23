// Staff page: open an order (from the email link, or type in a walk-in sale), send it to NPF,
// then download NPF's Certificate and Brown Card. Corrections and cancellations go through NPF too.
// No database: this page keeps a log on this device; the office spreadsheet is the official record.
import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, FileDown, Send, AlertTriangle, CheckCircle, Copy, Download, MessageCircle, ClipboardPaste, Wifi, ShieldCheck, ShieldAlert, Loader2, Pencil, XCircle, Lock } from "lucide-react";
import { api, naira, longDate, store } from "../lib/api";
import { PRODUCTS, STATES, LGAS, NPF_LOOKUP_URL, decodeOrder, addYearMinusDay, todayLagos, validateOrder, insuredName, maskNin } from "../../shared/motor.js";

const LOG_KEY = "rt_npf_log";
const input = "w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-700";

const blank = () => ({
  product: "private_motor", insured_type: "personal", firstname: "", lastname: "", company_name: "", company_rc_number: "", nin: "",
  phone: "", email: "", address: "", state: "Lagos", lga: "",
  reg_no: "", vehicle_make_id: "", vehicle_make: "", vehicle_model_id: "", vehicle_model: "", body_type_id: "", vehicle_type: "",
  vehicle_color: "", year_of_make: "", chassis_no: "", engine_no: "", engine_capacity: "", start_date: todayLagos(), reference: "",
});

const readLog = () => { try { const l = JSON.parse(store.get(LOG_KEY) || "[]"); return Array.isArray(l) ? l : []; } catch { return []; } };
const writeLog = (l) => store.set(LOG_KEY, JSON.stringify(l.slice(0, 500)));

const COLS = ["Date issued", "Reference", "Policy No", "Certificate No", "NPF policy ID", "Cover", "Premium", "Policy holder", "NIN (last 4)", "Phone", "Plate", "Start", "End", "NPF status", "NPF message"];
const toRow = (e) => [e.at?.slice(0, 10), e.reference, e.policy_number, e.certificate_no, e.policy_id, PRODUCTS[e.product]?.short, e.premium, e.name, e.nin_masked, e.phone, e.reg_no, e.start_date, e.end_date, e.status, e.message];

const STYLE = {
  SUCCESS: "bg-green-50 border-green-300 text-green-900",
  UNKNOWN: "bg-amber-50 border-amber-400 text-amber-900",
  ACCOUNT: "bg-amber-50 border-amber-300 text-amber-900",
  FAILED: "bg-red-50 border-red-300 text-red-900",
};
const TITLE = { SUCCESS: "NPF: POLICY ISSUED", UNKNOWN: "NPF: NO ANSWER (DO NOT SEND AGAIN)", ACCOUNT: "NPF: KEY OR ACCOUNT PROBLEM", FAILED: "NPF: NOT ISSUED" };

const F = ({ label, k, o, set, errors, children, wide, locked, hint }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <label className="block text-gray-600 text-xs font-semibold mb-1">{label}</label>
    {children || <input disabled={locked} className={input + (errors[k] ? " border-red-400" : " border-gray-300")} value={o[k] || ""} onChange={(e) => set(k, e.target.value)} />}
    {hint && !errors[k] && <p className="text-gray-400 text-[11px] mt-0.5">{hint}</p>}
    {errors[k] && <p className="text-red-600 text-xs mt-0.5">{errors[k]}</p>}
  </div>
);

const waCustomer = (e) => {
  const phone = "234" + String(e.phone).replace(/\D/g, "").replace(/^0/, "");
  const text = `Hello ${e.name}, your payment is confirmed and NPF Insurance has issued your third party policy for ${e.reg_no}.\nPolicy number: ${e.policy_number}\nCertificate number: ${e.certificate_no}\nValid ${longDate(e.start_date)} to ${longDate(e.end_date)}.\nYour Certificate and Brown Card are attached. You can also download them any time at ${NPF_LOOKUP_URL} with your policy number, plate number and phone number.\nThank you for choosing RiskTech Insurance Brokers.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

// Correct details or cancel a policy NPF issued
const PolicyActions = ({ entry, token, onDone, onSignedOut, lists }) => {
  const [mode, setMode] = useState("");
  const [reason, setReason] = useState("");
  const [ch, setCh] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const company = entry.insured_type === "company";
  const fields = [
    ...(company ? [["company_name", "Company name", entry.name]] : [["firstname", "First name", entry.firstname], ["lastname", "Last name", entry.lastname]]),
    ["plate_number", "Plate number", entry.reg_no], ["mobile_no", "Phone", entry.phone], ["email", "Email", entry.email],
    ["address", "Address", entry.address], ["chassis_number", "Chassis number", entry.chassis_no], ["engine_number", "Engine number", entry.engine_no],
    ["vehicle_color", "Colour", entry.vehicle_color], ["nin", "NIN (only if changing)", ""],
  ];
  const run = async () => {
    setMsg(null);
    if (reason.trim().length < 5) { setMsg({ ok: false, text: "Write the reason first." }); return; }
    const changes = {};
    if (mode === "endorse") {
      for (const [k, , cur] of fields) if (ch[k] !== undefined && String(ch[k]).trim() && String(ch[k]).trim() !== String(cur ?? "")) changes[k] = String(ch[k]).trim();
      if (ch.body_type_id && String(ch.body_type_id) !== String(entry.body_type_id)) changes.body_type_id = Number(ch.body_type_id);
      if (!Object.keys(changes).length) { setMsg({ ok: false, text: "Change at least one field." }); return; }
      if (!window.confirm(`Send these corrections to NPF for ${entry.policy_number}?\n${Object.keys(changes).join(", ")}`)) return;
    } else if (!window.confirm(`Cancel ${entry.policy_number} for ${entry.name} at NPF? This cannot be undone, and NPF does not refund the unit automatically.`)) return;
    setBusy(true);
    try {
      const r = await api("/api/admin", { method: "POST", token, body: { action: mode, policy_id: entry.policy_id, reason, changes } });
      if (r.ok) {
        setMsg({ ok: true, text: mode === "cancel" ? "Policy cancelled at NPF." : `NPF saved the correction (${(r.fields_changed || []).join(", ") || "no change needed"}). Download the certificate again for the customer.` });
        onDone(mode === "cancel" ? { status: "CANCELLED", message: `Cancelled: ${reason}` } : {
          ...(changes.plate_number ? { reg_no: changes.plate_number } : {}), ...(changes.mobile_no ? { phone: changes.mobile_no } : {}),
          ...(changes.firstname || changes.lastname ? { firstname: changes.firstname || entry.firstname, lastname: changes.lastname || entry.lastname, name: `${changes.firstname || entry.firstname} ${changes.lastname || entry.lastname}` } : {}),
          ...(changes.company_name ? { name: changes.company_name } : {}), ...(changes.nin ? { nin_masked: maskNin(changes.nin) } : {}),
          ...(changes.email ? { email: changes.email } : {}), ...(changes.address ? { address: changes.address } : {}),
          ...(changes.chassis_number ? { chassis_no: changes.chassis_number } : {}), ...(changes.engine_number ? { engine_no: changes.engine_number } : {}),
          ...(changes.vehicle_color ? { vehicle_color: changes.vehicle_color } : {}), message: `Corrected: ${reason}`,
        });
        setMode(""); setReason(""); setCh({});
      } else setMsg({ ok: false, text: `NPF said: ${r.message}` });
    } catch (x) { if (x.status === 401) onSignedOut(); else setMsg({ ok: false, text: x.status ? x.message : "No internet connection. It is safe to try again." }); }
    finally { setBusy(false); }
  };
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setMode(mode === "endorse" ? "" : "endorse")} className="flex items-center gap-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"><Pencil size={12} /> Correct details</button>
        <button onClick={() => setMode(mode === "cancel" ? "" : "cancel")} className="flex items-center gap-1 text-xs border border-red-300 text-red-700 rounded-lg px-2.5 py-1.5"><XCircle size={12} /> Cancel policy</button>
      </div>
      {mode && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          {mode === "endorse" && (
            <>
              <p className="text-xs text-gray-600">Fill only what changes. The cover type cannot be changed: cancel and issue a new policy instead.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {fields.map(([k, label, cur]) => (
                  <div key={k}><label className="block text-[11px] font-semibold text-gray-600">{label}</label>
                    <input className={input + " border-gray-300"} placeholder={cur ? String(cur) : ""} value={ch[k] ?? ""} onChange={(e) => setCh((p) => ({ ...p, [k]: e.target.value }))} /></div>
                ))}
                {lists && (
                  <div><label className="block text-[11px] font-semibold text-gray-600">Body type</label>
                    <select className={input + " border-gray-300"} value={ch.body_type_id ?? ""} onChange={(e) => setCh((p) => ({ ...p, body_type_id: e.target.value }))}>
                      <option value="">{entry.vehicle_type || "No change"}</option>{lists.body_types.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select></div>
                )}
              </div>
            </>
          )}
          <div><label className="block text-[11px] font-semibold text-gray-600">{mode === "cancel" ? "Why is it being cancelled?" : "Why is it being changed?"}</label>
            <input className={input + " border-gray-300"} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={mode === "cancel" ? "e.g. Customer sold the vehicle" : "e.g. Plate number was entered incorrectly"} /></div>
          <button disabled={busy} onClick={run} className={`flex items-center gap-1.5 text-sm font-semibold text-white rounded-lg px-3 py-2 disabled:opacity-60 ${mode === "cancel" ? "bg-red-600" : "bg-blue-700"}`}>
            {busy && <Loader2 size={14} className="animate-spin" />}{mode === "cancel" ? "Cancel at NPF" : "Send correction to NPF"}
          </button>
        </div>
      )}
      {msg && <p className={`text-xs mt-2 ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
};

const AdminPage = ({ navigate }) => {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem("rt_admin") || ""; } catch { return ""; } });
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const fromLink = !!(params.get("e") || params.get("d"));
  const [pending, setPending] = useState(() => (params.get("e") ? { lock: params.get("e") } : params.get("d") ? { d: params.get("d"), sig: params.get("s") || "" } : null));
  const [linkState, setLinkState] = useState(null); // "genuine" | "changed" | "old" | null

  const [o, setO] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const [msg, setMsg] = useState(null);
  const [result, setResult] = useState(null);
  const [unknownOverride, setUnknownOverride] = useState(false);
  const [log, setLog] = useState(readLog);
  const [paste, setPaste] = useState("");
  const [paid, setPaid] = useState(false);
  const [conn, setConn] = useState(null);
  const [lists, setLists] = useState(null);
  const [listErr, setListErr] = useState("");

  function signOut(note) {
    try { sessionStorage.removeItem("rt_admin"); } catch { /* ignore */ }
    setToken("");
    if (note) setErr(note);
  }

  useEffect(() => { if (fromLink) window.history.replaceState({}, "", "/admin"); }, [fromLink]);

  // Open the order from the email link once signed in
  useEffect(() => {
    if (!token || !pending) return;
    let live = true;
    const done = (order, state) => { if (!live) return; setO({ ...blank(), ...order }); setLinkState(state); setPending(null); setResult(null); setPaid(false); setErrors({}); };
    if (pending.lock) {
      api("/api/admin", { method: "POST", token, body: { action: "open", lock: pending.lock } })
        .then((r) => done(r.order, "genuine"))
        .catch((x) => { if (x.status === 401) signOut(); else if (live) { setPending(null); setLinkState("changed"); setMsg({ kind: "err", text: x.message }); } });
    } else {
      const dec = decodeOrder(pending.d) || {};
      // older (v20) links: names in one field, no NIN or LGA
      const [firstname, ...rest] = String(dec.insured_name || "").split(" ");
      const order = { ...dec, firstname, lastname: rest.join(" "), state: dec.zone === "FCT Abuja" ? "FCT" : dec.zone || "Lagos" };
      api("/api/admin", { method: "POST", token, body: { action: "verify", order: dec, sig: pending.sig } })
        .then((r) => done(order, r.valid ? "old" : "changed"))
        .catch((x) => { if (x.status === 401) signOut(); else done(order, "changed"); });
    }
    return () => { live = false; };
  }, [token, pending]);

  // NPF's lists for the pickers
  useEffect(() => {
    if (!token || lists) return;
    let live = true;
    api("/api/admin", { method: "POST", token, body: { action: "staff-lists" } })
      .then((r) => live && setLists(r))
      .catch((x) => { if (x.status === 401) signOut(); else if (live) setListErr(x.status ? x.message : "No internet connection."); });
    return () => { live = false; };
  }, [token, lists]);

  const prod = PRODUCTS[o.product] || PRODUCTS.private_motor;
  const makes = useMemo(() => {
    if (!lists) return [];
    const allowed = lists.products?.[o.product]?.make_ids || [];
    return (allowed.length ? lists.makes.filter((m) => allowed.includes(m.id)) : lists.makes).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [lists, o.product]);
  const models = makes.find((m) => String(m.id) === String(o.vehicle_make_id))?.models || [];
  const name = insuredName(o);
  const issued = result?.status === "SUCCESS";
  const blockedUnknown = result?.status === "UNKNOWN" && !unknownOverride;

  const set = (k, v) => { setO((p) => ({ ...p, [k]: v })); setErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; }); };
  const chooseMake = (v) => { setErrors((e) => ({ ...e, vehicle_make_id: undefined })); const m = makes.find((x) => String(x.id) === v); setO((p) => ({ ...p, vehicle_make_id: v, vehicle_make: m?.name || p.vehicle_make, vehicle_model_id: "", vehicle_model: "" })); };
  const chooseModel = (v) => { const m = models.find((x) => String(x.id) === v); setO((p) => ({ ...p, vehicle_model_id: v, vehicle_model: m?.name || "" })); };
  const chooseBody = (v) => { setErrors((e) => ({ ...e, body_type_id: undefined })); const b = lists?.body_types.find((x) => String(x.id) === v); setO((p) => ({ ...p, body_type_id: v, vehicle_type: b?.name || p.vehicle_type })); };

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

  const addLog = (entry) => { const next = [entry, ...readLog()]; writeLog(next); setLog(next); };
  const patchLog = (key, patch) => { const next = readLog().map((e) => (e.key === key ? { ...e, ...patch } : e)); writeLog(next); setLog(next); };

  const sendNpf = async () => {
    if (busyRef.current || issued || blockedUnknown) return;
    setMsg(null);
    const v = validateOrder(o, { allowPastStart: true, strict: true });
    setErrors(v.errors);
    if (!v.ok) { setMsg({ kind: "err", text: "Fix the fields marked in red first." }); return; }
    if (!paid) { setMsg({ kind: "err", text: "Tick the box to confirm the money is in the Jaiz Bank account." }); return; }
    const sameRef = o.reference && log.find((e) => e.reference === o.reference && e.status === "SUCCESS");
    if (sameRef) { setMsg({ kind: "err", text: `Order ${o.reference} was already issued as ${sameRef.policy_number}. It cannot be sent twice.` }); return; }
    const samePlate = log.find((e) => e.status === "SUCCESS" && e.reg_no === v.value.reg_no && e.end_date >= todayLagos());
    if (samePlate && !window.confirm(`${samePlate.reg_no} already has a valid policy (${samePlate.policy_number}, until ${longDate(samePlate.end_date)}). Issue another one for the same plate?`)) return;
    if (!window.confirm(`Send ${prod.short} for ${name} (${v.value.reg_no}) to NPF now? This creates a real policy and uses 1 unit.`)) return;

    busyRef.current = true; setBusy("npf"); setResult(null); setUnknownOverride(false);
    const base = {
      key: `${Date.now()}`, at: new Date().toISOString(), reference: o.reference || "", product: v.value.product, premium: prod.premium,
      name, insured_type: v.value.insured_type, firstname: v.value.firstname, lastname: v.value.lastname, nin_masked: maskNin(v.value.nin),
      phone: v.value.phone, email: v.value.email, address: v.value.address, reg_no: v.value.reg_no, chassis_no: v.value.chassis_no, engine_no: v.value.engine_no,
      vehicle_color: v.value.vehicle_color, vehicle_type: v.value.vehicle_type, body_type_id: v.value.body_type_id,
      start_date: v.value.start_date, end_date: addYearMinusDay(v.value.start_date),
    };
    try {
      const r = await api("/api/admin", { method: "POST", token, body: { action: "npf", order: o } });
      setResult({ ...r, entry: { ...base, policy_id: r.policy_id, policy_number: r.policy_number, certificate_no: r.certificate_no } });
      if (r.status === "SUCCESS" || r.status === "UNKNOWN") {
        addLog({ ...base, policy_id: r.policy_id || null, policy_number: r.policy_number || "", certificate_no: r.certificate_no || "", status: r.status, message: r.message });
      }
    } catch (x) {
      if (x.status === 401) { signOut("You were signed out for safety. Sign in again. Nothing was sent to NPF."); return; }
      if (x.status === 400 && x.fields) { setErrors(x.fields); setMsg({ kind: "err", text: x.message }); return; }
      if (!x.status || x.status >= 500) {
        // We cannot know whether NPF created it
        setResult({ status: "UNKNOWN", explain: "The connection dropped while sending, so we do not know if NPF created the policy. Do NOT send again: that could create a second policy. WhatsApp Aliyu the plate number and the time, and ask whether it was created.", message: x.message || "" });
        addLog({ ...base, policy_id: null, status: "UNKNOWN", message: "Connection lost while sending" });
      } else setMsg({ kind: "err", text: x.message });
    } finally { busyRef.current = false; setBusy(""); }
  };

  const download = async (policyId, kind) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(`${kind}-${policyId}`); setMsg(null);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "document", policy_id: policyId, kind }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 401) { signOut("You were signed out for safety. Sign in again to download."); return; }
        throw new Error(j.error || "Could not get the document. Try again.");
      }
      const blob = await res.blob();
      const fname = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || `${kind}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMsg({ kind: "ok", text: `${kind === "brown-card" ? "Brown Card" : "Certificate"} downloaded (${fname}).` });
    } catch (x) { setMsg({ kind: "err", text: x.message === "Failed to fetch" ? "No internet connection. Try again." : x.message }); }
    finally { busyRef.current = false; setBusy(""); }
  };

  const checkConn = async () => {
    setConn({ loading: true });
    try { setConn(await api("/api/admin", { method: "POST", token, body: { action: "check" } })); }
    catch (x) { if (x.status === 401) signOut("You were signed out for safety. Please sign in again."); else setConn({ error: x.status ? x.message : "No internet connection." }); }
  };

  const loadPasted = () => {
    const e = paste.match(/[?&]e=([A-Za-z0-9_-]+)/)?.[1];
    const d = paste.match(/[?&]d=([A-Za-z0-9_-]+)/)?.[1];
    if (!e && !d) { setMsg({ kind: "err", text: "That link could not be read. Copy the whole link from the email and try again." }); return; }
    setPending(e ? { lock: e } : { d, sig: paste.match(/[?&]s=([A-Za-z0-9_-]+)/)?.[1] || "" }); setPaste(""); setMsg(null);
  };

  const newSale = () => { setO(blank()); setLinkState(null); setPaid(false); setErrors({}); setMsg(null); setResult(null); setUnknownOverride(false); };

  const copyRow = async (e) => { try { await navigator.clipboard.writeText(toRow(e).map((x) => x ?? "").join("\t")); setMsg({ kind: "ok", text: "Row copied. Paste it into the spreadsheet." }); } catch { setMsg({ kind: "err", text: "Could not copy. Use Download CSV instead." }); } };
  const downloadCsv = () => {
    const q = (v) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const csv = [COLS, ...log.map(toRow)].map((r) => r.map(q).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `risktech-motor-log-${todayLagos()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B1F4B] flex items-center justify-center px-4">
        <form onSubmit={login} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <img src="/risktech_logo.png" alt="RiskTech" className="h-12 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Staff sign in</h1>
          <p className="text-gray-500 text-sm mb-5">{fromLink ? "Sign in to open this order." : "Issue NPF motor policies."}</p>
          <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
          <button disabled={signingIn} className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl">{signingIn ? "Checking..." : "Sign in"}</button>
          <button type="button" onClick={() => navigate("home")} className="w-full text-gray-500 text-sm mt-3">Back to website</button>
        </form>
      </div>
    );
  }

  const locked = issued || busy === "npf";
  const fp = { o, set, errors, locked };
  const sel = (k) => input + (errors[k] ? " border-red-400" : " border-gray-300");
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-[#0B1F4B] text-white px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <h1 className="font-bold text-base sm:text-lg whitespace-nowrap">Issue NPF policy</h1>
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

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button onClick={checkConn} disabled={conn?.loading} className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60 whitespace-nowrap">
              {conn?.loading ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />} Check NPF connection
            </button>
            <p className="text-sm text-gray-500">Free test: checks the key, loads NPF's lists and sends an empty request NPF must refuse. No policy, no unit used.</p>
          </div>
          {conn && !conn.loading && (
            <div className="mt-3 text-sm" data-testid="conn">
              {conn.error && <p className="text-red-700">{conn.error}</p>}
              {!conn.error && !conn.ok && <p className="text-red-700 font-semibold">Not connected: {conn.message}</p>}
              {conn.ok && (
                <ul className="space-y-1">
                  <li className="text-green-800"><b>✓ Key accepted.</b> NPF's lists loaded ({conn.counts?.makes} makes, {conn.counts?.body_types} body types) in {conn.ms} ms.</li>
                  {Object.entries(conn.products || {}).map(([k, p]) => (
                    <li key={k} className={p ? "text-green-800" : "text-red-700"}>
                      {p ? <>✓ {PRODUCTS[k].short} → NPF product "<b>{p.name}</b>" ({p.vehicle_type}){p.price_per_unit ? `, ${naira(p.price_per_unit)} per unit` : ""}</> : <>✗ {PRODUCTS[k].short}: NPF has not enabled a matching product on RiskTech's account.</>}
                    </li>
                  ))}
                  <li className={conn.sendTest?.ok ? "text-green-800" : "text-amber-800"}>
                    {conn.sendTest?.ok ? <>✓ <b>Sending works:</b> NPF refused the empty test request as expected ("{conn.sendTest.message}"). No unit used.</> : <>! Empty test request: NPF answered {conn.sendTest?.httpStatus ?? "nothing"} {conn.sendTest?.message ? `("${conn.sendTest.message}")` : ""}. Send a screenshot to IT.</>}
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        {msg && (
          <div role="status" className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${msg.kind === "ok" ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {msg.kind === "ok" ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}<span>{msg.text}</span>
          </div>
        )}
        {pending && <p className="flex items-center gap-2 text-sm text-gray-600"><Loader2 size={15} className="animate-spin" /> Opening the order...</p>}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="font-bold text-gray-900">{o.reference ? `Order ${o.reference}` : "Walk-in sale"}</p>
            <p className="text-sm text-gray-600">Premium <b>{naira(prod.premium)}</b></p>
          </div>
          {linkState === "genuine" && <p className="flex items-center gap-1.5 text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm mb-3"><ShieldCheck size={15} /> Genuine order from the website. The link has not been changed.</p>}
          {linkState === "old" && <p className="flex items-start gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mb-3"><ShieldAlert size={15} className="mt-0.5 flex-shrink-0" /> Order from the old form: get the customer's NIN, LGA and NPF make and body type on WhatsApp, then fill them in.</p>}
          {linkState === "changed" && <p className="flex items-start gap-1.5 text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm mb-3"><ShieldAlert size={15} className="mt-0.5 flex-shrink-0" /> Warning: this link was changed or did not come from the website. Check every detail against the customer's papers before sending.</p>}
          {issued && <p className="flex items-center gap-1.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"><Lock size={14} /> NPF issued this policy, so the details are locked. Use "Correct details" in the list below to change anything, or press "New sale".</p>}
          {listErr && !lists && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mb-3">Could not load NPF's lists ({listErr}). Press "Check NPF connection".</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <F label="Cover" k="product" {...fp}>
              <select disabled={locked} className={sel("product")} value={o.product} onChange={(e) => setO((p) => ({ ...p, product: e.target.value, vehicle_make_id: "", vehicle_model_id: "", vehicle_model: "" }))}>
                {Object.entries(PRODUCTS).map(([k, p]) => <option key={k} value={k}>{p.short} ({naira(p.premium)}){lists?.mapping?.[k] ? ` · NPF: ${lists.mapping[k].product_name}` : ""}</option>)}
              </select>
            </F>
            <F label="Policy for" k="insured_type" {...fp}>
              <select disabled={locked} className={sel("insured_type")} value={o.insured_type} onChange={(e) => set("insured_type", e.target.value)}><option value="personal">A person</option><option value="company">A company</option></select>
            </F>
            {o.insured_type === "company" ? (
              <>
                <F label="Company name" k="company_name" {...fp} />
                <F label="RC number (optional)" k="company_rc_number" {...fp} />
              </>
            ) : (
              <>
                <F label="First name" k="firstname" {...fp} />
                <F label="Last name" k="lastname" {...fp} />
              </>
            )}
            <F label={o.insured_type === "company" ? "NIN of person in charge" : "NIN"} k="nin" {...fp} hint="11 digits">
              <input disabled={locked} inputMode="numeric" autoComplete="off" className={sel("nin")} value={o.nin || ""} onChange={(e) => set("nin", e.target.value.replace(/\D/g, "").slice(0, 11))} />
            </F>
            <F label="Phone" k="phone" {...fp} />
            <F label="Email" k="email" {...fp} />
            <F label="Address" k="address" {...fp} />
            <F label="State" k="state" {...fp}>
              <select disabled={locked} className={sel("state")} value={o.state} onChange={(e) => setO((p) => ({ ...p, state: e.target.value, lga: "" }))}><option value="">Select</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </F>
            <F label="LGA" k="lga" {...fp}>
              <select disabled={locked || !o.state} className={sel("lga")} value={o.lga} onChange={(e) => set("lga", e.target.value)}><option value="">Select</option>{(LGAS[o.state] || []).map((l) => <option key={l}>{l}</option>)}</select>
            </F>
            <F label="Plate number" k="reg_no" {...fp} />
            <F label="Make (NPF list)" k="vehicle_make_id" {...fp} hint={!o.vehicle_make_id && o.vehicle_make ? `Customer typed: ${o.vehicle_make}` : ""}>
              <select disabled={locked || !lists} className={sel("vehicle_make_id")} value={o.vehicle_make_id} onChange={(e) => chooseMake(e.target.value)} data-testid="staff-make"><option value="">{lists ? "Select" : "Loading..."}</option>{makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            </F>
            <F label="Model (optional)" k="vehicle_model_id" {...fp} hint={!o.vehicle_model_id && o.vehicle_model ? `Customer typed: ${o.vehicle_model}` : ""}>
              <select disabled={locked || !models.length} className={sel("vehicle_model_id")} value={o.vehicle_model_id} onChange={(e) => chooseModel(e.target.value)}><option value="">{models.length ? "Select" : "None listed"}</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            </F>
            <F label="Body type (NPF list)" k="body_type_id" {...fp} hint={!o.body_type_id && o.vehicle_type ? `Customer typed: ${o.vehicle_type}` : ""}>
              <select disabled={locked || !lists} className={sel("body_type_id")} value={o.body_type_id} onChange={(e) => chooseBody(e.target.value)} data-testid="staff-body"><option value="">{lists ? "Select" : "Loading..."}</option>{(lists?.body_types || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            </F>
            <F label="Colour" k="vehicle_color" {...fp} />
            <F label="Year of make" k="year_of_make" {...fp} />
            <F label="Chassis number" k="chassis_no" {...fp} />
            <F label="Engine number" k="engine_no" {...fp} />
            <F label="Engine capacity" k="engine_capacity" {...fp} />
            <F label="Cover starts" k="start_date" {...fp} hint={`Ends ${longDate(addYearMinusDay(o.start_date || todayLagos()))}`}>
              <input disabled={locked} type="date" className={sel("start_date")} value={o.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </F>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 mb-3">Payment and NPF</p>
          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input type="checkbox" className="mt-1" checked={paid} disabled={locked} onChange={(e) => setPaid(e.target.checked)} />
            <span>I have checked the Jaiz Bank account and {naira(prod.premium)}{o.reference ? ` with narration ${o.reference}` : ""} has arrived.</span>
          </label>

          <button disabled={!!busy || issued || blockedUnknown} onClick={sendNpf}
            className={`mt-4 w-full flex items-center justify-center gap-2 text-sm font-bold px-4 py-3.5 rounded-xl text-white disabled:cursor-not-allowed ${issued ? "bg-green-700" : "bg-green-600 hover:bg-green-700 disabled:opacity-60"}`}>
            {busy === "npf" ? <><Loader2 size={16} className="animate-spin" /> Sending to NPF... do not close this page</> : issued ? <><CheckCircle size={16} /> Issued by NPF</> : <><Send size={16} /> Send to NPF (issues the policy)</>}
          </button>

          {result && (
            <div className={`mt-4 border rounded-xl p-4 text-sm ${STYLE[result.status] || STYLE.FAILED}`} data-testid="npf-result">
              <p className="font-bold flex items-center gap-1.5">{issued ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}{TITLE[result.status] || `NPF: ${result.status}`}</p>
              <p className="mt-1">{result.explain}</p>
              {issued && (
                <div className="mt-3 bg-white/70 rounded-lg p-3 space-y-0.5">
                  <p>Policy number: <b>{result.policy_number}</b></p>
                  <p>Certificate number: <b>{result.certificate_no}</b></p>
                  <p>Valid {longDate(o.start_date)} to {longDate(result.end_date)}</p>
                </div>
              )}
              {issued && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button disabled={!!busy} onClick={() => download(result.policy_id, "certificate")} className="flex items-center gap-1.5 bg-blue-700 text-white font-semibold rounded-lg px-3 py-2 disabled:opacity-60">{busy === `certificate-${result.policy_id}` ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Certificate</button>
                  <button disabled={!!busy} onClick={() => download(result.policy_id, "brown-card")} className="flex items-center gap-1.5 bg-amber-700 text-white font-semibold rounded-lg px-3 py-2 disabled:opacity-60">{busy === `brown-card-${result.policy_id}` ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} Brown Card</button>
                  <a href={waCustomer(result.entry)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-[#25D366] text-white font-semibold rounded-lg px-3 py-2"><MessageCircle size={14} /> WhatsApp customer</a>
                </div>
              )}
              {result.message && !issued && <p className="mt-2"><span className="font-semibold">NPF said:</span> {result.message}</p>}
              {result.raw && !issued && (
                <details className="mt-2"><summary className="cursor-pointer font-semibold">Show NPF's full reply (for Aliyu or IT)</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all bg-white/70 rounded-lg p-2 text-xs">{result.raw}{result.httpStatus ? `\n\nHTTP ${result.httpStatus}` : ""}</pre>
                </details>
              )}
              {result.status === "UNKNOWN" && (
                <label className="flex items-start gap-2 mt-3 text-xs">
                  <input type="checkbox" className="mt-0.5" checked={unknownOverride} onChange={(e) => setUnknownOverride(e.target.checked)} />
                  <span>NPF has confirmed the policy was <b>NOT</b> created. Allow sending again.</span>
                </label>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="font-bold text-gray-900">Issued on this device ({log.length})</p>
            {log.length > 0 && <button onClick={downloadCsv} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700"><Download size={15} /> Download CSV for the spreadsheet</button>}
          </div>
          {!log.length && <p className="text-gray-500 text-sm">Nothing yet. Each policy NPF issues appears here, so you can download documents again, correct or cancel, and copy it into the office spreadsheet.</p>}
          <div className="space-y-2">
            {log.map((e) => (
              <div key={e.key} className="border border-gray-100 rounded-lg p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 break-words">{e.policy_number || "(no policy number)"} &middot; {e.name} &middot; {e.reg_no}</p>
                    <p className="text-gray-500 text-xs break-words">{e.certificate_no ? `${e.certificate_no} · ` : ""}{naira(e.premium)} &middot; {e.at?.slice(0, 10)} &middot; <span className={e.status === "SUCCESS" ? "text-green-700 font-semibold" : e.status === "CANCELLED" ? "text-red-700 font-semibold" : "text-amber-700 font-semibold"}>{e.status === "UNKNOWN" ? "NO ANSWER: ask NPF before sending again" : e.status}</span>{e.message ? ` (${e.message})` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copyRow(e)} className="flex items-center gap-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"><Copy size={12} /> Copy row</button>
                    {e.policy_id && e.status !== "UNKNOWN" && (
                      <>
                        <button disabled={!!busy} onClick={() => download(e.policy_id, "certificate")} className="flex items-center gap-1 text-xs border border-blue-300 text-blue-700 rounded-lg px-2.5 py-1.5"><FileDown size={12} /> Certificate</button>
                        <button disabled={!!busy} onClick={() => download(e.policy_id, "brown-card")} className="flex items-center gap-1 text-xs border border-amber-400 text-amber-800 rounded-lg px-2.5 py-1.5"><FileDown size={12} /> Brown Card</button>
                      </>
                    )}
                    {e.status === "SUCCESS" && <a href={waCustomer(e)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-[#25D366] text-white rounded-lg px-2.5 py-1.5"><MessageCircle size={12} /> WhatsApp customer</a>}
                  </div>
                </div>
                {e.status === "SUCCESS" && e.policy_id && (
                  <div className="mt-2"><PolicyActions entry={e} token={token} lists={lists} onDone={(patch) => patchLog(e.key, patch)} onSignedOut={() => signOut("You were signed out for safety. Please sign in again.")} /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
