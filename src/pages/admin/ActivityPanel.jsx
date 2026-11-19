// Activities: a history of everything done on the staff page, plus orders from the website.
// Shared: every signed-in device sees the same history. Kept for 12 months.
import { useEffect, useMemo, useState } from "react";
import { History, ClipboardList, RefreshCw, LogIn, LogOut, ShieldAlert, ShoppingCart, CheckCircle, XCircle, AlertTriangle, Pencil, Ban, FileDown, Settings, ShieldCheck, CloudUpload, Search, Loader2 } from "lucide-react";
import { input } from "./common";

const ICON = {
  login: [LogIn, "text-green-700 bg-green-50"],
  "login-failed": [ShieldAlert, "text-red-700 bg-red-50"],
  logout: [LogOut, "text-gray-600 bg-gray-100"],
  order: [ShoppingCart, "text-blue-700 bg-blue-50"],
  issued: [CheckCircle, "text-green-700 bg-green-50"],
  "not-issued": [XCircle, "text-red-700 bg-red-50"],
  "no-answer": [AlertTriangle, "text-amber-700 bg-amber-50"],
  corrected: [Pencil, "text-blue-700 bg-blue-50"],
  cancelled: [Ban, "text-red-700 bg-red-50"],
  download: [FileDown, "text-gray-600 bg-gray-100"],
  setting: [Settings, "text-purple-700 bg-purple-50"],
  security: [ShieldCheck, "text-purple-700 bg-purple-50"],
  import: [CloudUpload, "text-blue-700 bg-blue-50"],
  claim: [ClipboardList, "text-orange-700 bg-orange-50"],
};
const FILTERS = [
  ["all", "All", null],
  ["signin", "Sign-ins", ["login", "login-failed", "logout"]],
  ["policies", "Policies", ["issued", "not-issued", "no-answer", "import"]],
  ["changes", "Corrections and cancels", ["corrected", "cancelled"]],
  ["orders", "Website orders", ["order"]],
  ["claims", "Claims", ["claim"]],
  ["downloads", "Downloads", ["download"]],
  ["settings", "Settings and security", ["setting", "security"]],
];
const PAGE = 50;
const when = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" });
};

const ActivityPanel = ({ call, onSignedOut, refreshKey }) => {
  const [data, setData] = useState(null); // { enabled, activity, saves, limit, softLimit }
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    call({ action: "activity" })
      .then((r) => { if (live) { setData(r); setErr(""); } })
      .catch((x) => { if (!live) return; if (x.status === 401) onSignedOut(); else setErr(x.status ? x.message : "No internet connection."); })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [call, onSignedOut, refreshKey, tick]);

  const list = useMemo(() => {
    const kinds = FILTERS.find((f) => f[0] === filter)?.[2];
    const s = q.trim().toLowerCase().replace(/[\s-]/g, "");
    return (data?.activity || []).filter((e) => (!kinds || kinds.includes(e.kind))
      && (!s || [e.text, e.device, e.place, e.ip].some((v) => String(v || "").toLowerCase().replace(/[\s-]/g, "").includes(s))));
  }, [data, filter, q]);

  const refresh = () => { setLoading(true); setTick((t) => t + 1); };
  const nearLimit = data?.enabled && data.saves >= data.softLimit;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="activity">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <p className="font-bold text-gray-900 flex items-center gap-2"><History size={17} /> Activities</p>
        {data?.enabled && <button onClick={refresh} className="flex items-center gap-1 text-sm font-semibold text-gray-600" data-testid="activity-refresh"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>}
      </div>
      <p className="text-xs text-gray-500 mb-3">Everything done on this staff page, and every order from the website. Everyone signed in sees the same history. Kept for 12 months.</p>

      {err && <p className="text-red-700 text-sm mb-2">Could not load the history ({err}).</p>}
      {!data && !err && <p className="text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading...</p>}
      {data && !data.enabled && <p className="text-gray-500 text-sm">Activities start once the shared storage is switched on (SETUP.md, Step 2).</p>}

      {data?.enabled && (
        <>
          {nearLimit && (
            <p className="flex items-start gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs mb-3" data-testid="activity-limit">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{data.saves} of the {data.limit} free saves for this month are used. To protect the policy list, sign-ins, downloads and website orders are not being added to this history until next month. Policies, corrections, cancellations and setting changes are still recorded.</span>
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1" role="tablist">
            {FILTERS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={filter === k} onClick={() => { setFilter(k); setShown(PAGE); }} data-testid={`activity-filter-${k}`}
                className={`whitespace-nowrap text-xs font-semibold rounded-full px-3 py-1.5 border ${filter === k ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}>{label}</button>
            ))}
          </div>
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Search plate, name, policy number, device or place" className={input + " border-gray-300 pl-9"} data-testid="activity-search" />
          </div>
          {!list.length && <p className="text-gray-500 text-sm">{(data.activity || []).length ? "Nothing matches." : "Nothing yet. Sign-ins, orders and policies will show here."}</p>}
          <ul className="divide-y divide-gray-100">
            {list.slice(0, shown).map((e, i) => {
              const [Icon, cls] = ICON[e.kind] || ICON.setting;
              return (
                <li key={`${e.at}-${i}`} className="flex items-start gap-3 py-2.5" data-testid="activity-row">
                  <span className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cls}`}><Icon size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 break-words">{e.text}</p>
                    <p className="text-xs text-gray-500 break-words">{when(e.at)}{e.device ? ` · ${e.device}` : ""}{e.place ? ` · ${e.place}` : ""}{e.ip ? ` · ${e.ip}` : ""}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {list.length > shown && (
            <button onClick={() => setShown((n) => n + PAGE)} className="w-full mt-3 text-sm font-semibold text-blue-700 border border-blue-200 rounded-lg py-2">Show more ({list.length - shown} more)</button>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityPanel;
