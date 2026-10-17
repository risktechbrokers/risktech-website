// BuyPage: customer buys third-party motor cover and pays by bank transfer.
// No database: the order is emailed to RiskTech (EmailJS) with a link that opens it in the staff page.
import { useState } from "react";
import { motion } from "framer-motion";
import emailjs from "@emailjs/browser";
import { ArrowLeft, Car, Bike, CheckCircle, AlertCircle, Copy, ChevronRight, ShieldCheck, Landmark, MessageCircle } from "lucide-react";
import { naira, longDate, store, esc } from "../lib/api";
import { PRODUCTS, BANK, STATES, CONTACT_PHONE, validateOrder, newReference, encodeOrder, waLink, todayLagos } from "../../shared/motor.js";

const EMAILJS_SERVICE_ID  = "service_r9hj031";
const EMAILJS_TEMPLATE_ID = "template_20jtn8c";
const EMAILJS_PUBLIC_KEY  = "2Q8Nq2E5ZLTAwqv7a";

const ICONS = { private_motor: Car, motorcycle: Bike };
const input = "w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

let sendTimes = [];
const limited = () => { const n = Date.now(); sendTimes = sendTimes.filter((t) => n - t < 600000); return sendTimes.length >= 4; };

const Field = ({ label, error, children, className = "", hint }) => (
  <div className={className}>
    <label className="block text-gray-700 text-sm font-medium mb-1.5">{label}</label>
    {children}
    {hint && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
    {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
  </div>
);

const CopyRow = ({ label, value, strong }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(String(value)); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-blue-100 last:border-0">
      <div className="min-w-0">
        <p className="text-[11px] text-blue-700 uppercase tracking-wide font-semibold">{label}</p>
        <p className={`text-gray-900 font-bold break-all ${strong ? "text-xl tracking-wide" : "text-base"}`}>{value}</p>
      </div>
      <button type="button" onClick={copy} className="flex items-center gap-1 text-blue-700 text-xs font-semibold bg-white border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50 flex-shrink-0">
        <Copy size={13} /> {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

const row = (k, v) => `<tr><td style="padding:8px 12px;font-weight:bold;color:#0B1F4B;width:38%;border-bottom:1px solid #eef">${esc(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #eef">${esc(v || "-")}</td></tr>`;

function orderEmail(o, staffLink) {
  const p = PRODUCTS[o.product];
  return `<div style="font-family:Arial,sans-serif;font-size:14px">
<p style="background:#0B1F4B;color:#C9A84C;padding:12px 14px;font-weight:bold;margin:0">NEW MOTOR POLICY ORDER &middot; ${esc(o.reference)}</p>
<p style="margin:12px 0">Customer will pay <b>${esc(naira(p.premium))}</b> into ${esc(BANK.bankName)} ${esc(BANK.accountNumber)} with narration <b>${esc(o.reference)}</b>.
Check the bank before issuing.</p>
<p style="margin:12px 0"><a href="${esc(staffLink)}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Open in staff page to issue</a></p>
<table style="width:100%;border-collapse:collapse">
${row("Cover", p.label)}${row("Premium", naira(p.premium))}${row("Starts", longDate(o.start_date))}
${row("Policy holder", o.insured_name)}${row("Phone", o.phone)}${row("Email", o.email)}${row("Address", o.address)}${row("State", o.zone)}
${row("Plate number", o.reg_no)}${row("Make / model", `${o.vehicle_make} ${o.vehicle_model}`)}${row("Body type", o.vehicle_type)}${row("Colour", o.vehicle_color)}${row("Year", o.year_of_make)}
${row("Chassis", o.chassis_no)}${row("Engine no", o.engine_no)}${row("Engine capacity", o.engine_capacity)}
</table></div>`;
}

const emptyForm = (product = "private_motor") => ({
  product, insured_name: "", phone: "", email: "", address: "", zone: "",
  reg_no: "", vehicle_make: "", vehicle_model: "", vehicle_type: PRODUCTS[product].bodyTypes[0], vehicle_color: "", year_of_make: "",
  chassis_no: "", engine_no: "", engine_capacity: "", start_date: todayLagos(), website: "",
});

const PaymentStep = ({ order, emailed }) => {
  const p = PRODUCTS[order.product];
  const proof = waLink(
    `Hello RiskTech, I have paid ${naira(p.premium)} for ${p.label}.\nReference: ${order.reference}\nName: ${order.insured_name}\nPlate: ${order.reg_no}\nI am attaching my transfer receipt.`
  );
  const details = waLink(
    `Hello RiskTech, I want to buy ${p.label}.\nReference: ${order.reference}\nName: ${order.insured_name}\nPhone: ${order.phone}\nAddress: ${order.address}, ${order.zone}\nPlate: ${order.reg_no}\nVehicle: ${order.vehicle_make} ${order.vehicle_model} (${order.vehicle_type}, ${order.vehicle_color}, ${order.year_of_make})\nChassis: ${order.chassis_no}\nEngine: ${order.engine_no}\nStart date: ${order.start_date}`
  );
  return (
    <div className="space-y-6">
      {!emailed && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-sm">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">We could not send your details automatically.</p>
            <p className="mt-1">Tap the button to send them to us on WhatsApp instead. Nothing is lost.</p>
            <a href={details} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 bg-[#25D366] text-white font-bold px-4 py-2.5 rounded-xl"><MessageCircle size={16} /> Send my details on WhatsApp</a>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <Landmark className="text-blue-700" size={22} />
          <h3 className="text-xl font-bold text-gray-900">Step 1: Pay {naira(p.premium)} by transfer</h3>
        </div>
        <p className="text-gray-500 text-sm mb-5">{p.label} for {order.reg_no}, starting {longDate(order.start_date)}.</p>
        <div className="bg-blue-50 rounded-2xl px-5">
          <CopyRow label="Bank" value={BANK.bankName} />
          <CopyRow label="Account name" value={BANK.accountName} />
          <CopyRow label="Account number" value={BANK.accountNumber} strong />
          <CopyRow label="Amount" value={String(p.premium)} />
          <CopyRow label="Narration / reference (important)" value={order.reference} strong />
        </div>
        <div className="flex items-start gap-2 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>Write <b>{order.reference}</b> in the transfer narration so we can match your payment.</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Step 2: Send us your receipt</h3>
        <p className="text-gray-500 text-sm mb-5">After paying, send the transfer receipt on WhatsApp. The message is already written for you.</p>
        <a href={proof} target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold py-4 rounded-xl">
          <MessageCircle size={18} /> I have paid: send receipt on WhatsApp
        </a>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Step 3: Receive your certificate</h3>
        <p className="text-gray-600 text-sm">Once we confirm your payment, we send your NPF Insurance certificate to your WhatsApp{order.email ? " and email" : ""}. Questions? Call {CONTACT_PHONE} and quote {order.reference}.</p>
      </div>
    </div>
  );
};

const BuyPage = ({ navigate }) => {
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [emailed, setEmailed] = useState(true);

  const prod = PRODUCTS[form.product];
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const pick = (product) => setForm((p) => ({ ...p, product, vehicle_type: PRODUCTS[product].bodyTypes[0] }));
  const cls = (k) => input + (errors[k] ? " border-red-400" : " border-gray-200");

  const submit = async (e) => {
    e.preventDefault();
    if (form.website) return;
    setError(""); setErrors({});
    const v = validateOrder(form);
    if (!v.ok) { setErrors(v.errors); setError("Please correct the highlighted fields."); return; }
    if (limited()) { setError("Too many orders from this device. Please wait a few minutes or call us."); return; }
    setLoading(true);
    const o = { ...v.value, reference: newReference(), created_at: new Date().toISOString() };
    const staffLink = `${window.location.origin}/admin?d=${encodeOrder(o)}`;
    let ok = true;
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        from_name: o.insured_name, from_email: o.email || "no-email@risktechinsurance.com", from_phone: o.phone,
        message: orderEmail(o, staffLink),
      }, { publicKey: EMAILJS_PUBLIC_KEY });
      sendTimes.push(Date.now());
    } catch { ok = false; }
    store.set("rt_last_order", JSON.stringify(o));
    setEmailed(ok); setOrder(o); setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white py-12 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          <button onClick={() => navigate("home")} className="flex items-center gap-2 text-blue-300 hover:text-white mb-6 text-sm font-medium"><ArrowLeft size={16} /> Back to Home</button>
          <span className="inline-flex items-center gap-2 text-blue-100 text-sm"><img src="/partners/npf-logo.jpg" alt="" width="28" height="28" className="w-7 h-7 rounded-md bg-white object-contain" />Underwritten by NPF Insurance Company Limited</span>
          <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-3" style={{ fontFamily: "'Playfair Display',serif" }}>{order ? "Almost done" : "Buy Motor Insurance Online"}</h1>
          <p className="text-blue-200 max-w-xl">{order ? `Your reference is ${order.reference}. Follow the three steps below.` : "Compulsory third party cover for your car or motorcycle. Fill in your details, pay by bank transfer, and we send your certificate as soon as we confirm payment."}</p>
          {!order && (
            <div className="flex flex-wrap gap-2 mt-6 text-xs">
              {["1. Fill the form", "2. Pay by transfer", "3. Get your certificate"].map((t) => (
                <span key={t} className="bg-white/10 border border-white/15 rounded-full px-3 py-1.5">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {order ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <PaymentStep order={order} emailed={emailed} />
            <button onClick={() => { setOrder(null); setForm(emptyForm()); }} className="block mx-auto mt-6 text-blue-700 text-sm font-semibold hover:underline">Buy cover for another vehicle</button>
          </motion.div>
        ) : (
          <form onSubmit={submit} noValidate className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-8">
            <div style={{ display: "none" }} aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} /></div>

            <div>
              <p className="text-base font-semibold text-gray-900 mb-3">1. Choose your cover</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PRODUCTS).map(([k, p]) => {
                  const Icon = ICONS[k]; const on = form.product === k;
                  return (
                    <button type="button" key={k} onClick={() => pick(k)} className={`text-left rounded-2xl border-2 p-4 transition ${on ? "border-blue-600 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-blue-300"}`}>
                      <Icon size={24} className={on ? "text-blue-700" : "text-gray-400"} />
                      <p className="font-bold text-gray-900 mt-2">{p.short}</p>
                      <p className="text-blue-700 font-bold text-lg">{naira(p.premium)}<span className="text-gray-400 text-xs font-normal"> / year</span></p>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-start gap-2 mt-3 text-xs text-gray-500"><ShieldCheck size={14} className="mt-0.5 text-green-600 flex-shrink-0" /><span>Third party cover: damage to other people's property up to ₦3,000,000, plus bodily injury and death. Underwritten by NPF Insurance Company Limited.</span></div>
            </div>

            <div>
              <p className="text-base font-semibold text-gray-900 mb-3">2. Policy holder</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" error={errors.insured_name} className="sm:col-span-2"><input className={cls("insured_name")} value={form.insured_name} onChange={(e) => set("insured_name", e.target.value)} maxLength={120} placeholder="As it should appear on the certificate" /></Field>
                <Field label="Phone number (WhatsApp)" error={errors.phone}><input type="tel" className={cls("phone")} value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} placeholder="08012345678" /></Field>
                <Field label="Email (optional)" error={errors.email}><input type="email" className={cls("email")} value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120} placeholder="you@example.com" /></Field>
                <Field label="Contact address" error={errors.address} className="sm:col-span-2"><input className={cls("address")} value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={250} placeholder="House number, street, area" /></Field>
                <Field label="State" error={errors.zone}>
                  <select className={cls("zone")} value={form.zone} onChange={(e) => set("zone", e.target.value)}><option value="">Select state</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
                </Field>
                <Field label="Cover starts on" error={errors.start_date} hint="Today or up to 30 days ahead">
                  <input type="date" className={cls("start_date")} value={form.start_date} min={todayLagos()} onChange={(e) => set("start_date", e.target.value)} />
                </Field>
              </div>
            </div>

            <div>
              <p className="text-base font-semibold text-gray-900 mb-3">3. {form.product === "motorcycle" ? "Motorcycle" : "Vehicle"} details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Plate number" error={errors.reg_no}><input className={cls("reg_no")} value={form.reg_no} onChange={(e) => set("reg_no", e.target.value.toUpperCase())} maxLength={20} placeholder="e.g. ABJ143FH" /></Field>
                <Field label="Year of make" error={errors.year_of_make}><input inputMode="numeric" className={cls("year_of_make")} value={form.year_of_make} onChange={(e) => set("year_of_make", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="e.g. 2014" /></Field>
                <Field label="Make" error={errors.vehicle_make}><input className={cls("vehicle_make")} value={form.vehicle_make} onChange={(e) => set("vehicle_make", e.target.value)} maxLength={60} placeholder={form.product === "motorcycle" ? "e.g. Bajaj" : "e.g. Toyota"} /></Field>
                <Field label="Model" error={errors.vehicle_model}><input className={cls("vehicle_model")} value={form.vehicle_model} onChange={(e) => set("vehicle_model", e.target.value)} maxLength={60} placeholder={form.product === "motorcycle" ? "e.g. Boxer" : "e.g. Camry"} /></Field>
                <Field label="Body type" error={errors.vehicle_type}><select className={cls("vehicle_type")} value={form.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)}>{prod.bodyTypes.map((t) => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Colour" error={errors.vehicle_color}><input className={cls("vehicle_color")} value={form.vehicle_color} onChange={(e) => set("vehicle_color", e.target.value)} maxLength={30} placeholder="e.g. Black" /></Field>
                <Field label="Chassis number" error={errors.chassis_no} hint="On your vehicle papers"><input className={cls("chassis_no")} value={form.chassis_no} onChange={(e) => set("chassis_no", e.target.value.toUpperCase())} maxLength={30} /></Field>
                <Field label="Engine number" error={errors.engine_no}><input className={cls("engine_no")} value={form.engine_no} onChange={(e) => set("engine_no", e.target.value.toUpperCase())} maxLength={30} /></Field>
                <Field label="Engine capacity (optional)" error={errors.engine_capacity} hint="In litres for cars, e.g. 1.6"><input className={cls("engine_capacity")} value={form.engine_capacity} onChange={(e) => set("engine_capacity", e.target.value)} maxLength={10} /></Field>
              </div>
            </div>

            {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm"><AlertCircle size={18} className="mt-0.5 flex-shrink-0" />{error}</div>}

            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4"><span className="text-gray-600">Premium to pay</span><span className="text-2xl font-bold text-gray-900">{naira(prod.premium)}</span></div>
              <button disabled={loading} className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                {loading ? "Please wait..." : <>Continue to payment <ChevronRight size={18} /></>}
              </button>
              <p className="text-gray-400 text-xs text-center mt-3 flex items-center justify-center gap-1"><CheckCircle size={12} /> Next you will see our bank details. Your certificate is issued once we confirm your transfer.</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BuyPage;
