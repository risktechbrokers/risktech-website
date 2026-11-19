// RiskTech Staff area. Pages: Policies (issue a policy + all policies), Claims, Report, Activities, Settings.
// Open an order (from the email link, or type in a walk-in sale), send it to the insurer (now NPF),
// then download the insurer's Certificate and Brown Card. Corrections and cancellations go through the insurer too.
// Every policy is saved to a shared list, so anyone signed in on any device sees all of them.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogOut, FileDown, Send, AlertTriangle, CheckCircle, MessageCircle, ClipboardPaste, Wifi, ShieldCheck, ShieldAlert, Loader2, Lock, PauseCircle, FileText, ClipboardList, BarChart3, History, Settings as SettingsIcon, Building2 } from "lucide-react";
import { api, naira, longDate } from "../lib/api";
import { PRODUCTS, STATES, LGAS, decodeOrder, addYearMinusDay, todayLagos, validateOrder, insuredName, maskNin, plateWarnings, INSURER } from "../../shared/motor.js";
import { input, readLog, writeLog, waCustomer, samePolicy } from "./admin/common";
import PolicyList from "./admin/PolicyList";
import MonthlyReport from "./admin/MonthlyReport";
import SettingsPanel from "./admin/SettingsPanel";
import ActivityPanel from "./admin/ActivityPanel";
import ClaimsPanel from "./admin/ClaimsPanel";
import PhotoViewer from "./admin/PhotoViewer";

// The staff area's pages, each with its own address (/admin, /admin/claims, ...)
const TABS = [
  ["policies", "Policies", FileText],
  ["claims", "Claims", ClipboardList],
  ["report", "Report", BarChart3],
  ["activity", "Activities", History],
  ["settings", "Settings", SettingsIcon],
];
const tabFromPath = () => { const t = window.location.pathname.replace(/\/+$/, "").split("/")[2] || "policies"; return TABS.some(([k]) => k === t) ? t : "policies"; };

const IDLE_MS = 30 * 60_000;     // sign out after 30 minutes with no activity
const PING_EVERY_MS = 5 * 60_000; // while active, tell the server at most every 5 minutes

const blank = () => ({
  product: "private_motor", insured_type: "personal", firstname: "", lastname: "", company_name: "", company_rc_number: "", nin: "",
  phone: "", email: "", address: "", state: "Lagos", lga: "",
  reg_no: "", vehicle_make_id: "", vehicle_make: "", vehicle_model_id: "", vehicle_model: "", body_type_id: "", vehicle_type: "",
  vehicle_color: "", year_of_make: "", chassis_no: "", engine_no: "", engine_capacity: "", start_date: todayLagos(), reference: "", photos: 0,
});
const noChecks = () => ({ paid: false, plate: false, identity: false });

const STYLE = {
  SUCCESS: "bg-green-50 border-green-300 text-green-900",
  UNKNOWN: "bg-amber-50 border-amber-400 text-amber-900",
  ACCOUNT: "bg-amber-50 border-amber-300 text-amber-900",
  FAILED: "bg-red-50 border-red-300 text-red-900",
};
const INS = INSURER.name;
const TITLE = { SUCCESS: "INSURER: POLICY ISSUED", UNKNOWN: "INSURER: NO ANSWER (DO NOT SEND AGAIN)", ACCOUNT: "INSURER: KEY OR ACCOUNT PROBLEM", FAILED: "INSURER: NOT ISSUED" };

const F = ({ label, k, o, set, errors, children, wide, locked, hint }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <label className="block text-gray-600 text-xs font-semibold mb-1">{label}</label>
    {children || <input disabled={locked} className={input + (errors[k] ? " border-red-400" : " border-gray-300")} value={o[k] || ""} onChange={(e) => set(k, e.target.value)} />}
    {hint && !errors[k] && <p className="text-gray-400 text-[11px] mt-0.5">{hint}</p>}
    {errors[k] && <p className="text-red-600 text-xs mt-0.5">{errors[k]}</p>}
  </div>
);

const Check = ({ k, checks, setChecks, locked, children }) => (
  <label className="flex items-start gap-2 text-sm text-gray-800">
    <input type="checkbox" className="mt-1" checked={checks[k]} disabled={locked} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))} data-testid={`check-${k}`} />
    <span>{children}</span>
  </label>
);

const readSession = () => { try { return sessionStorage.getItem("rt_admin") || ""; } catch { return ""; } };

const AdminPage = ({ navigate }) => {
  const [token, setToken] = useState(readSession);
  const tokenRef = useRef(token);
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
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
  const [checks, setChecks] = useState(noChecks);
  const [conn, setConn] = useState(null);
  const [lists, setLists] = useState(null);
  const [listErr, setListErr] = useState("");
  const [shared, setShared] = useState(() => ({ on: false, list: [], err: "", loading: !!readSession() }));
  const [importing, setImporting] = useState(false);
  const [paused, setPausedState] = useState({});
  const [tab, setTab] = useState(tabFromPath);
  const [visited, setVisited] = useState(() => new Set([tabFromPath()]));

  // ---------- session ----------
  const saveToken = useCallback((t) => {
    tokenRef.current = t;
    try { if (t) sessionStorage.setItem("rt_admin", t); else sessionStorage.removeItem("rt_admin"); } catch { /* ignore */ }
    if (t) setShared((s) => ({ ...s, loading: true }));
    setToken(t);
  }, []);
  const call = useCallback((body) => api("/api/admin", { method: "POST", token: tokenRef.current, body, onToken: (t) => { tokenRef.current = t; try { sessionStorage.setItem("rt_admin", t); } catch { /* ignore */ } } }), []);
  // reason "manual" or "idle" records the sign-out in Activities; no reason = the server already ended the session
  const signOut = useCallback((note, reason) => {
    if (reason && tokenRef.current) call({ action: "logout", reason }).catch(() => { /* still sign out */ });
    saveToken(""); if (note) setErr(note);
  }, [saveToken, call]);
  const onSignedOut = useCallback(() => signOut("You were signed out for safety. Please sign in again."), [signOut]);

  // Is 2-step login on? (decides whether the sign-in form asks for a code)
  useEffect(() => {
    if (token) return;
    let live = true;
    api("/api/admin", { method: "POST", body: { action: "login-info" } }).then((r) => live && setNeedsCode(!!r.totp)).catch(() => { /* form still works */ });
    return () => { live = false; };
  }, [token]);

  // Auto sign-out after 30 minutes with no activity; while active, keep the server session alive.
  useEffect(() => {
    if (!token) return;
    let last = Date.now(); let lastPing = Date.now();
    const active = () => {
      last = Date.now();
      if (Date.now() - lastPing > PING_EVERY_MS) { lastPing = Date.now(); call({ action: "ping" }).catch((x) => { if (x.status === 401) signOut("You were signed out for safety. Please sign in again."); }); }
    };
    const check = () => { if (Date.now() - last > IDLE_MS) signOut("Signed out after 30 minutes with no activity. Please sign in again.", "idle"); };
    const events = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach((e) => window.addEventListener(e, active, { passive: true }));
    document.addEventListener("visibilitychange", check);
    const t = setInterval(check, 20_000);
    return () => { events.forEach((e) => window.removeEventListener(e, active)); document.removeEventListener("visibilitychange", check); clearInterval(t); };
  }, [token, call, signOut]);

  useEffect(() => { if (fromLink) window.history.replaceState({}, "", "/admin"); }, [fromLink]);

  // ---------- pages ----------
  const go = useCallback((t) => {
    const path = t === "policies" ? "/admin" : `/admin/${t}`;
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setTab(t); setVisited((v) => (v.has(t) ? v : new Set([...v, t])));
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    const onPop = () => { const t = tabFromPath(); setTab(t); setVisited((v) => (v.has(t) ? v : new Set([...v, t]))); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ---------- shared policy list ----------
  const loadShared = useCallback(() => call({ action: "policies" }).then(
    (r) => setShared({ on: !!r.enabled, list: r.policies || [], err: "", loading: false }),
    (x) => {
      if (x.status === 401) { onSignedOut(); return; }
      setShared({ on: false, list: [], err: x.status ? x.message : "no internet", loading: false });
    },
  ), [call, onSignedOut]);
  useEffect(() => {
    if (!token) return;
    let live = true;
    call({ action: "policies" })
      .then((r) => live && setShared({ on: !!r.enabled, list: r.policies || [], err: "", loading: false }))
      .catch((x) => { if (!live) return; if (x.status === 401) onSignedOut(); else setShared({ on: false, list: [], err: x.status ? x.message : "no internet", loading: false }); });
    return () => { live = false; };
  }, [token, call, onSignedOut]);

  const activityKey = useMemo(() => shared.list.map((p) => `${p.policy_id || p.key}:${p.status}:${(p.history || []).length}`).join("|"), [shared.list]);
  const localOnly = useMemo(
    () => (shared.on ? log.filter((e) => ["SUCCESS", "CANCELLED", "UNKNOWN"].includes(e.status) && !shared.list.some((s) => samePolicy(s, e))) : []),
    [log, shared],
  );
  const allPolicies = useMemo(() => {
    const list = shared.on ? [...shared.list, ...localOnly.map((e) => ({ ...e, _localOnly: true }))] : log;
    return [...list].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  }, [shared, localOnly, log]);

  const importLocal = async () => {
    setImporting(true);
    try {
      const r = await call({ action: "import-policies", policies: localOnly });
      setMsg({ kind: "ok", text: `${r.added} ${r.added === 1 ? "policy" : "policies"} moved to the shared list. Everyone can now see them.` });
      await loadShared();
    } catch (x) { if (x.status === 401) onSignedOut(); else setMsg({ kind: "err", text: x.status ? x.message : "No internet connection. Try again." }); }
    finally { setImporting(false); }
  };

  // ---------- open the order from the email link once signed in ----------
  useEffect(() => {
    if (!token || !pending) return;
    let live = true;
    const done = (order, state) => { if (!live) return; setO({ ...blank(), ...order }); setLinkState(state); setPending(null); setResult(null); setChecks(noChecks()); setErrors({}); };
    if (pending.lock) {
      call({ action: "open", lock: pending.lock })
        .then((r) => done(r.order, "genuine"))
        .catch((x) => { if (x.status === 401) onSignedOut(); else if (live) { setPending(null); setLinkState("changed"); setMsg({ kind: "err", text: x.message }); } });
    } else {
      const dec = decodeOrder(pending.d) || {};
      // older (v20) links: names in one field, no NIN or LGA
      const [firstname, ...rest] = String(dec.insured_name || "").split(" ");
      const order = { ...dec, firstname, lastname: rest.join(" "), state: dec.zone === "FCT Abuja" ? "FCT" : dec.zone || "Lagos" };
      call({ action: "verify", order: dec, sig: pending.sig })
        .then((r) => done(order, r.valid ? "old" : "changed"))
        .catch((x) => { if (x.status === 401) onSignedOut(); else done(order, "changed"); });
    }
    return () => { live = false; };
  }, [token, pending, call, onSignedOut]);

  // The insurer's lists for the pickers
  useEffect(() => {
    if (!token || lists) return;
    let live = true;
    call({ action: "staff-lists" })
      .then((r) => live && setLists(r))
      .catch((x) => { if (x.status === 401) onSignedOut(); else if (live) setListErr(x.status ? x.message : "No internet connection."); });
    return () => { live = false; };
  }, [token, lists, call, onSignedOut]);

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
  const plateWarn = plateWarnings(o.reg_no);
  const allChecked = checks.paid && checks.plate && checks.identity;

  const set = (k, v) => {
    setO((p) => ({ ...p, [k]: v }));
    setErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
    if (k === "reg_no") setChecks((c) => ({ ...c, plate: false })); // plate changed: check it again
  };
  const chooseMake = (v) => { setErrors((e) => ({ ...e, vehicle_make_id: undefined })); const m = makes.find((x) => String(x.id) === v); setO((p) => ({ ...p, vehicle_make_id: v, vehicle_make: m?.name || p.vehicle_make, vehicle_model_id: "", vehicle_model: "" })); };
  const chooseModel = (v) => { const m = models.find((x) => String(x.id) === v); setO((p) => ({ ...p, vehicle_model_id: v, vehicle_model: m?.name || "" })); };
  const chooseBody = (v) => { setErrors((e) => ({ ...e, body_type_id: undefined })); const b = lists?.body_types.find((x) => String(x.id) === v); setO((p) => ({ ...p, body_type_id: v, vehicle_type: b?.name || p.vehicle_type })); };

  const login = async (e) => {
    e.preventDefault(); setErr("");
    if (!pw) { setErr("Enter the staff password."); return; }
    if (needsCode && !/^\d{6}$/.test(code)) { setErr("Enter the 6-digit code from the authenticator app."); return; }
    setSigningIn(true);
    try {
      const r = await api("/api/admin", { method: "POST", body: { action: "login", password: pw, code } });
      saveToken(r.token); setPw(""); setCode("");
    } catch (x) { setErr(x.status ? x.message : "No internet connection. Check your network and try again."); }
    finally { setSigningIn(false); }
  };

  const addLog = (entry) => { const next = [entry, ...readLog()]; writeLog(next); setLog(next); };
  const onPatched = (entry, patch) => {
    const next = readLog().map((e) => (samePolicy(e, entry) ? { ...e, ...patch } : e));
    writeLog(next); setLog(next);
    if (shared.on) loadShared();
  };

  const sendNpf = async () => {
    if (busyRef.current || issued || blockedUnknown) return;
    setMsg(null);
    const v = validateOrder(o, { allowPastStart: true, strict: true });
    setErrors(v.errors);
    if (!v.ok) { setMsg({ kind: "err", text: "Fix the fields marked in red first." }); return; }
    if (!allChecked) { setMsg({ kind: "err", text: "Tick all three checks before sending: money confirmed, plate checked, name and NIN checked." }); return; }
    const sameRef = o.reference && allPolicies.find((e) => e.reference === o.reference && e.status === "SUCCESS");
    if (sameRef) { setMsg({ kind: "err", text: `Order ${o.reference} was already issued as ${sameRef.policy_number}. It cannot be sent twice.` }); return; }
    const samePlate = allPolicies.find((e) => e.status === "SUCCESS" && e.reg_no === v.value.reg_no && e.end_date >= todayLagos());
    if (samePlate && !window.confirm(`${samePlate.reg_no} already has a valid policy (${samePlate.policy_number}, until ${longDate(samePlate.end_date)}). Issue another one for the same plate?`)) return;
    if (!window.confirm(`Send ${prod.short} for ${name} (${v.value.reg_no}) to the insurer (${INS}) now? This creates a real policy and uses 1 unit.`)) return;

    busyRef.current = true; setBusy("npf"); setResult(null);
    const base = {
      key: `${Date.now()}`, at: new Date().toISOString(), reference: o.reference || "", product: v.value.product, premium: prod.premium,
      name, insured_type: v.value.insured_type, firstname: v.value.firstname, lastname: v.value.lastname, nin_masked: maskNin(v.value.nin),
      phone: v.value.phone, email: v.value.email, address: v.value.address, reg_no: v.value.reg_no, chassis_no: v.value.chassis_no, engine_no: v.value.engine_no,
      vehicle_color: v.value.vehicle_color, vehicle_type: v.value.vehicle_type, body_type_id: v.value.body_type_id,
      start_date: v.value.start_date, end_date: addYearMinusDay(v.value.start_date), insurer: INS, photos: Number(o.photos) || 0,
    };
    try {
      const r = await call({ action: "npf", order: o, key: base.key, confirmed_not_created: unknownOverride });
      setUnknownOverride(false);
      setResult({ ...r, entry: { ...base, policy_id: r.policy_id, policy_number: r.policy_number, certificate_no: r.certificate_no } });
      if (r.status === "SUCCESS" || r.status === "UNKNOWN") {
        addLog({ ...base, policy_id: r.policy_id || null, policy_number: r.policy_number || "", certificate_no: r.certificate_no || "", status: r.status, message: r.message });
        if (shared.on && !r.shared) setMsg({ kind: "err", text: "The insurer answered, but the policy could not be saved to the shared list. It is saved on this device: press \"Move them to the shared list\" below when the connection is back." });
        if (shared.on) loadShared();
      }
    } catch (x) {
      if (x.status === 401) { signOut("You were signed out for safety. Sign in again. Nothing was sent to the insurer."); return; }
      if (x.status === 400 && x.fields) { setErrors(x.fields); setMsg({ kind: "err", text: x.message }); return; }
      if (!x.status || x.status >= 500) {
        // We cannot know whether the insurer created it
        setResult({ status: "UNKNOWN", explain: "The connection dropped while sending, so we do not know if the insurer created the policy. Do NOT send again: that could create a second policy. WhatsApp Aliyu the plate number and the time, and ask whether it was created.", message: x.message || "" });
        addLog({ ...base, policy_id: null, status: "UNKNOWN", message: "Connection lost while sending" });
      } else setMsg({ kind: "err", text: x.message });
    } finally { busyRef.current = false; setBusy(""); }
  };

  const download = async (policyId, kind) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(`${kind}-${policyId}`); setMsg(null);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` }, body: JSON.stringify({ action: "document", policy_id: policyId, kind }) });
      const fresh = res.headers.get("X-Session-Token");
      if (fresh) { tokenRef.current = fresh; try { sessionStorage.setItem("rt_admin", fresh); } catch { /* ignore */ } }
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
    try { setConn(await call({ action: "check" })); }
    catch (x) { if (x.status === 401) onSignedOut(); else setConn({ error: x.status ? x.message : "No internet connection." }); }
  };

  const loadPasted = () => {
    const e = paste.match(/[?&]e=([A-Za-z0-9_-]+)/)?.[1];
    const d = paste.match(/[?&]d=([A-Za-z0-9_-]+)/)?.[1];
    if (!e && !d) { setMsg({ kind: "err", text: "That link could not be read. Copy the whole link from the email and try again." }); return; }
    setPending(e ? { lock: e } : { d, sig: paste.match(/[?&]s=([A-Za-z0-9_-]+)/)?.[1] || "" }); setPaste(""); setMsg(null);
  };

  const newSale = () => { setO(blank()); setLinkState(null); setChecks(noChecks()); setErrors({}); setMsg(null); setResult(null); setUnknownOverride(false); };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B1F4B] flex items-center justify-center px-4">
        <form onSubmit={login} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <img src="/risktech_logo.png" alt="RiskTech" className="h-12 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Staff sign in</h1>
          <p className="text-gray-500 text-sm mb-5">{fromLink ? "Sign in to open this order." : "RiskTech staff area: policies, claims and reports."}</p>
          <input type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {needsCode && (
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code from the authenticator app" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="login-code" />
          )}
          {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
          <button disabled={signingIn} className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl">{signingIn ? "Checking..." : "Sign in"}</button>
          <button type="button" onClick={() => navigate("home")} className="w-full text-gray-500 text-sm mt-3">Back to website</button>
        </form>
      </div>
    );
  }

  const locked = issued || busy === "npf";
  const fp = { o, set, errors, locked };
  const cp = { checks, setChecks, locked };
  const sel = (k) => input + (errors[k] ? " border-red-400" : " border-gray-300");
  const show = (t) => (tab === t ? "space-y-5" : "hidden");
  const title = TABS.find(([k]) => k === tab)?.[1] || "Policies";
  return (
    <div className="min-h-screen bg-gray-100 pb-24 md:pb-8">
      <div className="bg-[#0B1F4B] text-white px-4 pt-4 md:pb-0 pb-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">RiskTech Staff</p>
            <h1 className="font-bold text-base sm:text-lg whitespace-nowrap" data-testid="page-title">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {tab === "policies" && <button onClick={newSale} className="text-xs bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg whitespace-nowrap">New sale</button>}
            <button onClick={() => signOut("", "manual")} className="p-2 bg-white/15 hover:bg-white/25 rounded-lg" aria-label="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
        {/* Menu: tabs under the header on a computer, a bar at the bottom on a phone */}
        <nav className="max-w-5xl mx-auto hidden md:flex gap-1 mt-3" aria-label="Staff pages">
          {TABS.map(([k, l, I]) => (
            <button key={k} onClick={() => go(k)} aria-current={tab === k ? "page" : undefined} data-testid={`tab-${k}`}
              className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-t-lg ${tab === k ? "bg-gray-100 text-gray-900" : "text-blue-100 hover:bg-white/10"}`}><I size={15} /> {l}</button>
          ))}
        </nav>
      </div>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 grid grid-cols-5" aria-label="Staff pages" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map(([k, l, I]) => (
          <button key={k} onClick={() => go(k)} aria-current={tab === k ? "page" : undefined} data-testid={`mtab-${k}`}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${tab === k ? "text-blue-700" : "text-gray-500"}`}><I size={19} /> {l}</button>
        ))}
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {msg && (
          <div role="status" className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${msg.kind === "ok" ? "bg-green-50 border border-green-200 text-green-900" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {msg.kind === "ok" ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}<span>{msg.text}</span>
          </div>
        )}

        <section className={show("policies")} data-testid="page-policies">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-2">
            <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste the 'Open in staff page' link from an order email" className={input + " border-gray-300 flex-1"} />
            <button onClick={loadPasted} className="flex items-center justify-center gap-1.5 bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"><ClipboardPaste size={15} /> Load order</button>
          </div>
          {pending && <p className="flex items-center gap-2 text-sm text-gray-600"><Loader2 size={15} className="animate-spin" /> Opening the order...</p>}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="font-bold text-gray-900">{o.reference ? `Order ${o.reference}` : "Walk-in sale"}</p>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-1 text-xs font-semibold text-gray-700" data-testid="insurer-chip"><Building2 size={12} /> Insurer: {INS}</span>
              <span>Premium <b>{naira(prod.premium)}</b></span>
            </div>
          </div>
          {linkState === "genuine" && <p className="flex items-center gap-1.5 text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm mb-3"><ShieldCheck size={15} /> Genuine order from the website. The link has not been changed.</p>}
          {linkState === "old" && <p className="flex items-start gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mb-3"><ShieldAlert size={15} className="mt-0.5 flex-shrink-0" /> Order from the old form: get the customer's NIN, LGA and the insurer's make and body type on WhatsApp, then fill them in.</p>}
          {linkState === "changed" && <p className="flex items-start gap-1.5 text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm mb-3"><ShieldAlert size={15} className="mt-0.5 flex-shrink-0" /> Warning: this link was changed or did not come from the website. Check every detail against the customer's papers before sending.</p>}
          {paused[o.product] && <p className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mb-3"><PauseCircle size={15} /> {prod.short} is paused on the website. You can still issue here if the insurer has units.</p>}
          {issued && <p className="flex items-center gap-1.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"><Lock size={14} /> The insurer issued this policy, so the details are locked. Use "Correct details" in the list below to change anything, or press "New sale".</p>}
          {listErr && !lists && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm mb-3">Could not load the insurer's lists ({listErr}). Press "Check insurer connection" in Settings.</p>}

          {!issued && !o.vehicle_make_id && o.vehicle_make && (
            <p className="flex items-start gap-1.5 text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-sm mb-3" data-testid="unlisted-make">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <span>The customer's make is <b>not on the insurer's list</b>: "{o.vehicle_make}{o.vehicle_model ? ` ${o.vehicle_model}` : ""}". Pick the closest make below, or ask the insurer to add it before sending. Tell the customer what will show on the certificate.</span>
            </p>
          )}
          {o.reference && Number(o.photos) > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3" data-testid="order-photos">
              <p className="text-sm text-gray-800 mb-1">The customer sent <b>{o.photos}</b> photo{o.photos > 1 ? "s" : ""}. Use them to check the plate and chassis number.</p>
              <PhotoViewer call={call} kind="order" id={o.reference} count={o.photos} onSignedOut={onSignedOut} label="Customer's photos" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <F label="Cover" k="product" {...fp}>
              <select disabled={locked} className={sel("product")} value={o.product} onChange={(e) => setO((p) => ({ ...p, product: e.target.value, vehicle_make_id: "", vehicle_model_id: "", vehicle_model: "" }))}>
                {Object.entries(PRODUCTS).map(([k, p]) => <option key={k} value={k}>{p.short} ({naira(p.premium)}){lists?.mapping?.[k] ? ` · ${INS}: ${lists.mapping[k].product_name}` : ""}</option>)}
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
            <F label="Plate number" k="reg_no" {...fp}>
              <input disabled={locked} className={sel("reg_no") + " uppercase"} value={o.reg_no || ""} onChange={(e) => set("reg_no", e.target.value.toUpperCase())} data-testid="staff-plate" />
              {plateWarn.map((w) => <p key={w} className="text-amber-700 text-[11px] mt-0.5" data-testid="staff-plate-warn">⚠ {w}</p>)}
            </F>
            <F label="Make (insurer's list)" k="vehicle_make_id" {...fp} hint={!o.vehicle_make_id && o.vehicle_make ? `Customer typed: ${o.vehicle_make}` : ""}>
              <select disabled={locked || !lists} className={sel("vehicle_make_id")} value={o.vehicle_make_id} onChange={(e) => chooseMake(e.target.value)} data-testid="staff-make"><option value="">{lists ? "Select" : "Loading..."}</option>{makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            </F>
            <F label="Model (optional)" k="vehicle_model_id" {...fp} hint={!o.vehicle_model_id && o.vehicle_model ? `Customer typed: ${o.vehicle_model}` : ""}>
              <select disabled={locked || !models.length} className={sel("vehicle_model_id")} value={o.vehicle_model_id} onChange={(e) => chooseModel(e.target.value)}><option value="">{models.length ? "Select" : "None listed"}</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            </F>
            <F label="Body type (insurer's list)" k="body_type_id" {...fp} hint={!o.body_type_id && o.vehicle_type ? `Customer typed: ${o.vehicle_type}` : ""}>
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
          <p className="font-bold text-gray-900 mb-1">Checks before sending</p>
          <p className="text-xs text-gray-500 mb-3">All three must be ticked. Changing the plate number clears the plate tick.</p>
          <div className="space-y-2.5" data-testid="checklist">
            <Check k="paid" {...cp}>Money confirmed: <b>{naira(prod.premium)}</b>{o.reference ? <> with narration <b>{o.reference}</b></> : ""} has arrived in the Jaiz Bank account.</Check>
            <Check k="plate" {...cp}>
              Plate checked against the customer's vehicle papers or photo:
              <span className="block mt-1 font-mono text-xl font-extrabold tracking-[0.2em] text-gray-950" data-testid="check-plate-big">{o.reg_no || "—"}</span>
              {plateWarn.length > 0 && <span className="block text-amber-700 text-xs mt-0.5">⚠ {plateWarn[0]}</span>}
            </Check>
            <Check k="identity" {...cp}>Name (<b>{name || "—"}</b>) and NIN (<b>{maskNin(o.nin) || "—"}</b>) match the customer's ID.</Check>
          </div>

          <button disabled={!!busy || issued || blockedUnknown || !allChecked} onClick={sendNpf}
            className={`mt-4 w-full flex items-center justify-center gap-2 text-sm font-bold px-4 py-3.5 rounded-xl text-white disabled:cursor-not-allowed ${issued ? "bg-green-700" : "bg-green-600 hover:bg-green-700 disabled:opacity-50"}`} data-testid="send-npf">
            {busy === "npf" ? <><Loader2 size={16} className="animate-spin" /> Sending to the insurer... do not close this page</> : issued ? <><CheckCircle size={16} /> Issued by the insurer</> : <><Send size={16} /> Send to insurer ({INS}): issues the policy</>}
          </button>
          {!allChecked && !issued && <p className="text-gray-500 text-xs mt-2 text-center">Tick all three checks to unlock this button.</p>}

          {result && (
            <div className={`mt-4 border rounded-xl p-4 text-sm ${STYLE[result.status] || STYLE.FAILED}`} data-testid="npf-result">
              <p className="font-bold flex items-center gap-1.5">{issued ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}{TITLE[result.status] || `INSURER: ${result.status}`}</p>
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
              {result.message && !issued && <p className="mt-2"><span className="font-semibold">The insurer said:</span> {result.message}</p>}
              {result.httpStatus === 402 && shared.on && !paused[o.product] && (
                <p className="mt-2 text-xs">Tip: pause {prod.short} in Settings until the insurer loads units, so customers don't pay for cover we can't issue.</p>
              )}
              {result.raw && !issued && (
                <details className="mt-2"><summary className="cursor-pointer font-semibold">Show the insurer's full reply (for the insurer or IT)</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all bg-white/70 rounded-lg p-2 text-xs">{result.raw}{result.httpStatus ? `\n\nHTTP ${result.httpStatus}` : ""}</pre>
                </details>
              )}
              {result.status === "UNKNOWN" && (
                <label className="flex items-start gap-2 mt-3 text-xs">
                  <input type="checkbox" className="mt-0.5" checked={unknownOverride} onChange={(e) => setUnknownOverride(e.target.checked)} />
                  <span>The insurer has confirmed the policy was <b>NOT</b> created. Allow sending again.</span>
                </label>
              )}
            </div>
          )}
        </div>

        <PolicyList
          policies={allPolicies} sharedOn={shared.on} sharedErr={shared.err} loading={shared.loading} localOnly={localOnly}
          onImport={importLocal} importing={importing} onRefresh={() => { setShared((s) => ({ ...s, loading: true })); loadShared(); }} busy={busy} download={download} call={call}
          lists={lists} onPatched={onPatched} onSignedOut={onSignedOut} setMsg={setMsg}
        />
        </section>

        {visited.has("claims") && <section className={show("claims")} data-testid="page-claims"><ClaimsPanel call={call} onSignedOut={onSignedOut} /></section>}
        {visited.has("report") && <section className={show("report")} data-testid="page-report"><MonthlyReport policies={allPolicies} /></section>}
        {visited.has("activity") && <section className={show("activity")} data-testid="page-activity"><ActivityPanel call={call} onSignedOut={onSignedOut} refreshKey={activityKey} /></section>}
        {/* Settings is always loaded (hidden until opened): it tells the Policies page which covers are paused */}
        <section className={show("settings")} data-testid="page-settings">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button onClick={checkConn} disabled={conn?.loading} className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-60 whitespace-nowrap">
              {conn?.loading ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />} Check insurer connection
            </button>
            <p className="text-sm text-gray-500">{`Free test of the link to the insurer (${INS}): checks the key, loads its lists and sends an empty request it must refuse. No policy, no unit used.`}</p>
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

          <SettingsPanel call={call} onSignedOut={onSignedOut} onPausedChange={setPausedState} />
        </section>
      </div>
    </div>
  );
};

export default AdminPage;
