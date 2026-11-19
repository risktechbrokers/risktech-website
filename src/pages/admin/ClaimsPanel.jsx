// Claims from the website's claim form, with their photos. Staff move each claim along:
// Received, then Sent to insurer, then Settled. Every change is recorded in Activities.
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw, Search, Loader2, Phone, Mail, MessageCircle } from "lucide-react";
import { input } from "./common";
import PhotoViewer from "./PhotoViewer";

const STATUS = { RECEIVED: ["Received", "bg-blue-50 text-blue-800 border-blue-200"], SENT: ["Sent to insurer", "bg-amber-50 text-amber-900 border-amber-200"], SETTLED: ["Settled", "bg-green-50 text-green-800 border-green-200"] };
const PAGE = 20;
const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }); };
const wa = (phone) => "https://wa.me/234" + String(phone || "").replace(/\D/g, "").replace(/^234/, "").replace(/^0/, "");

const ClaimRow = ({ c, call, onSignedOut, onChanged }) => {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const move = async (status) => {
    setBusy(status); setErr("");
    try { const r = await call({ action: "claim-status", id: c.id, status, note }); setNote(""); onChanged(r.claim); }
    catch (x) { if (x.status === 401) onSignedOut(); else setErr(x.status ? x.message : "No internet connection. Try again."); }
    finally { setBusy(""); }
  };
  const [label, cls] = STATUS[c.status] || STATUS.RECEIVED;
  return (
    <div className="border border-gray-100 rounded-lg p-3 text-sm" data-testid="claim-row">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 break-words">{c.id} · {c.name} · {c.insurance_type}</p>
          <p className="text-gray-500 text-xs">Sent {when(c.at)} · Incident {c.incident_date} at {c.incident_location}{c.policy_number ? ` · Policy ${c.policy_number}` : ""}{c.estimated_loss ? ` · Loss ${c.estimated_loss}` : ""}</p>
        </div>
        <span className={`text-xs font-semibold border rounded-full px-2.5 py-1 ${cls}`} data-testid="claim-status">{label}</span>
      </div>
      <p className="text-gray-800 mt-2 whitespace-pre-wrap break-words">{c.description}</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {c.photos > 0 && <PhotoViewer call={call} kind="claim" id={c.id} count={c.photos} onSignedOut={onSignedOut} />}
        <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"><Phone size={12} /> {c.phone}</a>
        <a href={wa(c.phone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs bg-[#25D366] text-white rounded-lg px-2.5 py-1.5"><MessageCircle size={12} /> WhatsApp</a>
        {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5"><Mail size={12} /> Email</a>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Note (optional), e.g. sent to the insurer on 20 Nov" className={input + " border-gray-300 flex-1"} />
        <div className="flex gap-2">
          {Object.entries(STATUS).filter(([k]) => k !== c.status).map(([k, [l]]) => (
            <button key={k} type="button" disabled={!!busy} onClick={() => move(k)} className="flex items-center gap-1 text-xs font-semibold border border-gray-300 rounded-lg px-3 py-2 whitespace-nowrap disabled:opacity-60" data-testid={`claim-to-${k}`}>
              {busy === k && <Loader2 size={12} className="animate-spin" />} Mark "{l}"
            </button>
          ))}
        </div>
      </div>
      {err && <p className="text-red-700 text-xs mt-1">{err}</p>}
      {(c.history || []).length > 0 && (
        <details className="mt-2 text-xs text-gray-600"><summary className="cursor-pointer">History ({c.history.length})</summary>
          <ul className="mt-1 space-y-0.5">{c.history.map((h, i) => <li key={i}>{when(h.at)}: {h.note}</li>)}</ul>
        </details>
      )}
    </div>
  );
};

const ClaimsPanel = ({ call, onSignedOut }) => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    call({ action: "claims" })
      .then((r) => { if (live) { setData(r); setErr(""); } })
      .catch((x) => { if (!live) return; if (x.status === 401) onSignedOut(); else setErr(x.status ? x.message : "No internet connection."); })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [call, onSignedOut, tick]);

  const claims = useMemo(() => data?.claims || [], [data]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/[\s-]/g, "");
    return claims.filter((c) => (filter === "all" || (filter === "open" ? c.status !== "SETTLED" : c.status === filter))
      && (!s || [c.id, c.name, c.phone, c.policy_number, c.insurance_type, c.incident_location].some((v) => String(v || "").toLowerCase().replace(/[\s-]/g, "").includes(s))));
  }, [claims, filter, q]);
  const changed = (c) => setData((d) => ({ ...d, claims: d.claims.map((x) => (x.id === c.id ? c : x)) }));
  const count = (k) => claims.filter((c) => (k === "open" ? c.status !== "SETTLED" : k === "all" ? true : c.status === k)).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="claims">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <p className="font-bold text-gray-900 flex items-center gap-2"><ClipboardList size={17} /> Claims</p>
        {data?.enabled && <button onClick={() => { setLoading(true); setTick((t) => t + 1); }} className="flex items-center gap-1 text-sm font-semibold text-gray-600"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>}
      </div>
      <p className="text-xs text-gray-500 mb-3">Claims sent from the website's claim form, with their photos. The same claim is also emailed to the company inbox.</p>
      {err && <p className="text-red-700 text-sm mb-2">Could not load claims ({err}).</p>}
      {!data && !err && <p className="text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</p>}
      {data && !data.enabled && <p className="text-gray-500 text-sm">Claims are saved here once the shared storage is switched on. Until then they only arrive by email.</p>}
      {data?.enabled && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1" role="tablist">
            {[["open", "Not settled"], ["RECEIVED", "Received"], ["SENT", "Sent to insurer"], ["SETTLED", "Settled"], ["all", "All"]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={filter === k} onClick={() => { setFilter(k); setShown(PAGE); }} data-testid={`claims-filter-${k}`}
                className={`whitespace-nowrap text-xs font-semibold rounded-full px-3 py-1.5 border ${filter === k ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}>{l} ({count(k)})</button>
            ))}
          </div>
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Search claim number, name, phone or policy number" className={input + " border-gray-300 pl-9"} data-testid="claims-search" />
          </div>
          {!list.length && <p className="text-gray-500 text-sm">{claims.length ? "Nothing matches." : "No claims yet."}</p>}
          <div className="space-y-2">{list.slice(0, shown).map((c) => <ClaimRow key={c.id} c={c} call={call} onSignedOut={onSignedOut} onChanged={changed} />)}</div>
          {list.length > shown && <button onClick={() => setShown((n) => n + PAGE)} className="w-full mt-3 text-sm font-semibold text-blue-700 border border-blue-200 rounded-lg py-2">Show more ({list.length - shown} more)</button>}
        </>
      )}
    </div>
  );
};

export default ClaimsPanel;
