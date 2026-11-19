// Monthly report: policies issued, units used and an estimate of the insurer's share, for settlement with the insurer.
import { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { naira, store } from "../../lib/api";
import { PRODUCTS } from "../../../shared/motor.js";
import { input, COLS, toRow, downloadCsv } from "./common";

const COMMISSION_KEY = "rt_commission_pct";
const monthOf = (e) => String(e.at || "").slice(0, 7);
const monthName = (m) => (m ? new Date(m + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) : "");

const MonthlyReport = ({ policies }) => {
  const months = useMemo(() => {
    const set = new Set(policies.filter((e) => e.status === "SUCCESS" || e.status === "CANCELLED").map(monthOf).filter(Boolean));
    set.add(new Date().toISOString().slice(0, 7));
    return [...set].sort().reverse();
  }, [policies]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [pct, setPct] = useState(() => store.get(COMMISSION_KEY) || "");

  const rows = useMemo(() => policies.filter((e) => monthOf(e) === month && (e.status === "SUCCESS" || e.status === "CANCELLED")), [policies, month]);
  const byProduct = Object.keys(PRODUCTS).map((k) => {
    const list = rows.filter((e) => e.product === k);
    const active = list.filter((e) => e.status === "SUCCESS");
    return { k, issued: list.length, cancelled: list.length - active.length, premium: active.reduce((s, e) => s + Number(e.premium || 0), 0) };
  });
  const total = byProduct.reduce((a, r) => ({ issued: a.issued + r.issued, cancelled: a.cancelled + r.cancelled, premium: a.premium + r.premium }), { issued: 0, cancelled: 0, premium: 0 });
  const p = Number(pct);
  const pctOk = pct !== "" && p >= 0 && p <= 100;
  const commission = pctOk ? Math.round(total.premium * p / 100) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="monthly-report">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={17} /> Monthly report</p>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={input + " border-gray-300 w-auto"} data-testid="report-month">
          {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead><tr className="text-left text-gray-500 text-xs border-b"><th className="py-2">Cover</th><th>Issued (units used)</th><th>Cancelled</th><th className="text-right">Premium (active)</th></tr></thead>
          <tbody>
            {byProduct.map((r) => (
              <tr key={r.k} className="border-b border-gray-100"><td className="py-2">{PRODUCTS[r.k].short}</td><td>{r.issued}</td><td>{r.cancelled}</td><td className="text-right">{naira(r.premium)}</td></tr>
            ))}
            <tr className="font-bold"><td className="py-2">Total</td><td data-testid="report-issued">{total.issued}</td><td>{total.cancelled}</td><td className="text-right" data-testid="report-premium">{naira(total.premium)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mt-4 items-end">
        <div>
          <label className="block text-gray-600 text-xs font-semibold mb-1">RiskTech's commission (%)</label>
          <input inputMode="decimal" value={pct} onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, "").slice(0, 5); setPct(v); store.set(COMMISSION_KEY, v); }} placeholder="Ask NPF, e.g. 10" className={input + " border-gray-300"} data-testid="report-pct" />
        </div>
        <div className="sm:col-span-2 text-sm bg-gray-50 rounded-lg p-3">
          {pctOk ? (
            <>RiskTech's commission: <b>{naira(commission)}</b><br />Estimated amount to pay the insurer: <b data-testid="report-due">{naira(total.premium - commission)}</b></>
          ) : <span className="text-gray-500">Enter RiskTech's commission % (from the insurer) to see the estimated amount owed to the insurer.</span>}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">An estimate from the policies in this list. Always check it against the insurer's own statement before paying. Units are not refunded automatically when a policy is cancelled, so cancelled policies still count as units used.</p>
      {rows.length > 0 && (
        <button onClick={() => downloadCsv([COLS, ...rows.map(toRow)], `risktech-motor-${month}.csv`)} className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 mt-3"><Download size={15} /> Download {monthName(month)} as CSV</button>
      )}
    </div>
  );
};

export default MonthlyReport;
