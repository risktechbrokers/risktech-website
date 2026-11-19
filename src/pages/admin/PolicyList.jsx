// Every policy issued, from every device (shared list), with search, documents, correct and cancel.
import { useMemo, useState } from "react";
import { FileDown, Copy, Download, MessageCircle, Loader2, Pencil, XCircle, Search, CloudUpload, Info, RefreshCw } from "lucide-react";
import { naira } from "../../lib/api";
import { maskNin } from "../../../shared/motor.js";
import { input, COLS, toRow, downloadCsv, waCustomer } from "./common";

// Correct details or cancel a policy NPF issued
const PolicyActions = ({ entry, call, onDone, onSignedOut, lists }) => {
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
      const r = await call({ action: mode, policy_id: entry.policy_id, reason, changes });
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
                    <input className={input + " border-gray-300"} placeholder={cur ? String(cur) : ""} value={ch[k] ?? ""} onChange={(e) => setCh((p) => ({ ...p, [k]: e.target.value }))} />
                    {k === "plate_number" && (
                      <p className="flex items-start gap-1 text-[11px] text-amber-800 mt-1" data-testid="plate-note">
                        <Info size={12} className="mt-0.5 flex-shrink-0" />
                        <span>NPF currently only allows plate changes from their side. If NPF refuses, send the policy number ({entry.policy_number}) and the correct plate to Aliyu.</span>
                      </p>
                    )}
                  </div>
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

const STATUS_CLASS = { SUCCESS: "text-green-700", CANCELLED: "text-red-700" };
const PAGE = 30;

const PolicyList = ({ policies, sharedOn, sharedErr, loading, localOnly, onImport, importing, onRefresh, busy, download, call, lists, onPatched, onSignedOut, setMsg }) => {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/[\s-]/g, "");
    if (!s) return policies;
    return policies.filter((e) => [e.name, e.reg_no, e.policy_number, e.certificate_no, e.reference, e.phone].some((v) => String(v || "").toLowerCase().replace(/[\s-]/g, "").includes(s)));
  }, [policies, q]);

  const copyRow = async (e) => { try { await navigator.clipboard.writeText(toRow(e).map((x) => x ?? "").join("\t")); setMsg({ kind: "ok", text: "Row copied. Paste it into the spreadsheet." }); } catch { setMsg({ kind: "err", text: "Could not copy. Use Download CSV instead." }); } };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="policy-list">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <p className="font-bold text-gray-900">{sharedOn ? "All policies (every device)" : "Issued on this device"} ({policies.length})</p>
        <div className="flex items-center gap-3">
          {sharedOn && <button onClick={onRefresh} className="flex items-center gap-1 text-sm font-semibold text-gray-600"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>}
          {policies.length > 0 && <button onClick={() => downloadCsv([COLS, ...policies.map(toRow)], `risktech-motor-policies-${new Date().toISOString().slice(0, 10)}.csv`)} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700"><Download size={15} /> Download CSV</button>}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {sharedOn ? "Anyone signed in on any computer or phone sees this same list." : sharedErr ? `The shared list could not be loaded (${sharedErr}). Showing this device only.` : "The shared list is not switched on yet (see SETUP.md), so this shows only policies issued on this device."}
      </p>

      {sharedOn && localOnly.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm text-blue-900">
          <span className="flex-1">{localOnly.length} {localOnly.length === 1 ? "policy was" : "policies were"} issued on this device before the shared list existed.</span>
          <button disabled={importing} onClick={onImport} className="flex items-center justify-center gap-1.5 bg-blue-700 text-white font-semibold rounded-lg px-3 py-2 disabled:opacity-60" data-testid="import-btn">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />} Move them to the shared list
          </button>
        </div>
      )}

      {policies.length > 0 && (
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Search name, plate, policy number, reference or phone" className={input + " border-gray-300 pl-9"} data-testid="policy-search" />
        </div>
      )}
      {!policies.length && <p className="text-gray-500 text-sm">{loading ? "Loading..." : "Nothing yet. Each policy NPF issues appears here."}</p>}
      {policies.length > 0 && !filtered.length && <p className="text-gray-500 text-sm">No policy matches "{q}".</p>}

      <div className="space-y-2">
        {filtered.slice(0, shown).map((e) => (
          <div key={e.policy_id || e.key} className="border border-gray-100 rounded-lg p-3 text-sm" data-testid="policy-row">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 break-words">{e.policy_number || "(no policy number)"} &middot; {e.name} &middot; {e.reg_no}</p>
                <p className="text-gray-500 text-xs break-words">
                  {e.certificate_no ? `${e.certificate_no} · ` : ""}{naira(e.premium)} &middot; {e.at?.slice(0, 10)} &middot; <span className={`font-semibold ${STATUS_CLASS[e.status] || "text-amber-700"}`}>{e.status === "UNKNOWN" ? "NO ANSWER: ask NPF before sending again" : e.status}</span>{e.message ? ` (${e.message})` : ""}
                  {e._localOnly && <span className="ml-1 text-blue-700 font-semibold">· only on this device</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copyRow(e)} className="flex items-center gap-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"><Copy size={12} /> Copy row</button>
                {e.policy_id && e.status !== "UNKNOWN" && (
                  <>
                    <button disabled={!!busy} onClick={() => download(e.policy_id, "certificate")} className="flex items-center gap-1 text-xs border border-blue-300 text-blue-700 rounded-lg px-2.5 py-1.5">{busy === `certificate-${e.policy_id}` ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} Certificate</button>
                    <button disabled={!!busy} onClick={() => download(e.policy_id, "brown-card")} className="flex items-center gap-1 text-xs border border-amber-400 text-amber-800 rounded-lg px-2.5 py-1.5">{busy === `brown-card-${e.policy_id}` ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />} Brown Card</button>
                  </>
                )}
                {e.status === "SUCCESS" && <a href={waCustomer(e)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-[#25D366] text-white rounded-lg px-2.5 py-1.5"><MessageCircle size={12} /> WhatsApp customer</a>}
              </div>
            </div>
            {e.status === "SUCCESS" && e.policy_id && (
              <div className="mt-2"><PolicyActions entry={e} call={call} lists={lists} onDone={(patch) => onPatched(e, patch)} onSignedOut={onSignedOut} /></div>
            )}
          </div>
        ))}
      </div>
      {filtered.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE)} className="w-full mt-3 text-sm font-semibold text-blue-700 border border-blue-200 rounded-lg py-2">Show more ({filtered.length - shown} more)</button>
      )}
    </div>
  );
};

export default PolicyList;
