// BuyPage: customer buys third-party motor cover and pays by bank transfer.
// No database: the order is emailed to RiskTech (EmailJS) with a locked link that opens it in the staff page.
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import emailjs from "@emailjs/browser";
import { ArrowLeft, Car, Bike, CheckCircle, AlertCircle, Copy, ChevronRight, ShieldCheck, Landmark, MessageCircle, User, Building2, Lock } from "lucide-react";
import { api, naira, longDate, store, esc } from "../lib/api";
import { PRODUCTS, BANK, STATES, LGAS, CONTACT_PHONE_DISPLAY, NPF_LOOKUP_URL, validateOrder, waLink, todayLagos, insuredName, maskNin } from "../../shared/motor.js";

const EMAILJS_SERVICE_ID  = "service_r9hj031";
const EMAILJS_TEMPLATE_ID = "template_20jtn8c";
const EMAILJS_PUBLIC_KEY  = "2Q8Nq2E5ZLTAwqv7a";

const ICONS = { private_motor: Car, motorcycle: Bike };
const input = "w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

let sendTimes = [];
const limited = () => { const n = Date.now(); sendTimes = sendTimes.filter((t) => n - t < 600000); return sendTimes.length >= 4; };

// NPF's lists (makes, models, body types), loaded once per visit
const LIST_KEY = "rt_npf_lists";
const readLists = () => { try { const l = JSON.parse(sessionStorage.getItem(LIST_KEY) || "null"); return l?.available ? l : null; } catch { return null; } };

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

// The reference is the one thing customers must not forget, so it gets its own big box at the top.
const ReferenceBox = ({ reference }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(reference); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* ignore */ }
  };
  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 sm:p-6 text-center" data-testid="reference-box">
      <p className="text-amber-900 text-xs sm:text-sm font-bold uppercase tracking-wider">Your payment reference</p>
      <p className="text-gray-950 font-extrabold font-mono tracking-normal sm:tracking-wider my-2 whitespace-nowrap select-all" style={{ fontSize: "clamp(1.25rem, 6vw, 2.4rem)" }}>{reference}</p>
      <button type="button" onClick={copy}
        className={`inline-flex items-center gap-2 font-bold text-sm px-5 py-3 rounded-xl transition-colors ${done ? "bg-green-600 text-white" : "bg-gray-900 hover:bg-black text-white"}`}>
        {done ? <><CheckCircle size={16} /> Copied</> : <><Copy size={16} /> Copy reference</>}
      </button>
      <p className="text-gray-900 text-sm mt-4 leading-relaxed">
        Paste it in the <b>Narration</b>, <b>Description</b> or <b>Remark</b> box of your transfer.
      </p>
      <p className="flex items-start justify-center gap-1.5 text-red-700 text-xs sm:text-sm font-semibold mt-2">
        <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> Without this reference, your payment may be delayed.
      </p>
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
<p style="margin:8px 0;color:#555;font-size:12px">The full details, including the NIN, are locked inside the button and only open on the staff page after sign-in.</p>
<table style="width:100%;border-collapse:collapse">
${row("Cover", p.label)}${row("Premium", naira(p.premium))}${row("Starts", longDate(o.start_date))}
${row(o.insured_type === "company" ? "Company" : "Policy holder", insuredName(o))}${row("NIN", maskNin(o.nin))}${row("Phone", o.phone)}${row("Email", o.email)}${row("Address", `${o.address}, ${o.lga}, ${o.state}`)}
${row("Plate number", o.reg_no)}${row("Make / model", `${o.vehicle_make} ${o.vehicle_model}`)}${row("Body type", o.vehicle_type)}${row("Colour", o.vehicle_color)}${row("Year", o.year_of_make)}
</table></div>`;
}

const emptyForm = (product = "private_motor") => ({
  product, insured_type: "personal", firstname: "", lastname: "", company_name: "", company_rc_number: "", nin: "",
  phone: "", email: "", address: "", state: "", lga: "",
  reg_no: "", vehicle_make_id: "", vehicle_make: "", vehicle_model_id: "", vehicle_model: "", body_type_id: "", vehicle_type: "",
  vehicle_color: "", year_of_make: "", chassis_no: "", engine_no: "", engine_capacity: "", start_date: todayLagos(), website: "",
});

const PaymentStep = ({ order, emailed, staffLink }) => {
  const p = PRODUCTS[order.product];
  const name = insuredName(order);
  const proof = waLink(
    `Hello RiskTech, I have paid ${naira(p.premium)} for ${p.label}.\nReference: ${order.reference}\nName: ${name}\nPlate: ${order.reg_no}\nI am attaching my transfer receipt.`
  );
  const details = waLink(
    `Hello RiskTech, I want to buy ${p.label}.\nReference: ${order.reference}\nName: ${name}\nPlate: ${order.reg_no}\nMy full details (staff link): ${staffLink}`
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

        <ReferenceBox reference={order.reference} />

        <p className="text-gray-900 font-semibold text-sm mt-6 mb-2">Transfer to this account</p>
        <div className="bg-blue-50 rounded-2xl px-5">
          <CopyRow label="Bank" value={BANK.bankName} />
          <CopyRow label="Account name" value={BANK.accountName} />
          <CopyRow label="Account number" value={BANK.accountNumber} strong />
          <CopyRow label="Amount" value={String(p.premium)} />
          <CopyRow label="Narration (paste your reference)" value={order.reference} />
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
        <p className="text-gray-600 text-sm">Once we confirm your payment, NPF Insurance issues your policy and we send your Certificate and Brown Card to your WhatsApp{order.email ? " and email" : ""}.</p>
        <p className="text-gray-600 text-sm mt-2">You can also download them any time on <a href={NPF_LOOKUP_URL} target="_blank" rel="noreferrer" className="text-blue-700 font-semibold underline">NPF's policy lookup page</a> with your policy number, plate number and phone number.</p>
        <p className="text-gray-600 text-sm mt-2">Questions? Call or WhatsApp {CONTACT_PHONE_DISPLAY} and quote <b>{order.reference}</b>.</p>
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
  const [staffLink, setStaffLink] = useState("");
  const [emailed, setEmailed] = useState(true);
  const [lists, setLists] = useState(readLists);
  const [listsTried, setListsTried] = useState(() => !!readLists());

  useEffect(() => {
    if (lists) return;
    let live = true;
    api("/api/admin", { method: "POST", body: { action: "lists" } })
      .then((r) => {
        if (!live) return;
        if (r.available) { setLists(r); try { sessionStorage.setItem(LIST_KEY, JSON.stringify(r)); } catch { /* ignore */ } }
      })
      .catch(() => { /* typed fallback below */ })
      .finally(() => live && setListsTried(true));
    return () => { live = false; };
  }, [lists]);

  const prod = PRODUCTS[form.product];
  // Typing in a box clears that box's error, so old red messages never sit under filled-in fields
  const clearErr = (...ks) => { setErrors((e) => { if (!ks.some((k) => e[k])) return e; const n = { ...e }; ks.forEach((k) => delete n[k]); if (!Object.keys(n).length) setError(""); return n; }); };
  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); clearErr(k); };
  const pick = (product) => setForm((p) => ({ ...p, product, vehicle_make_id: "", vehicle_make: "", vehicle_model_id: "", vehicle_model: "" }));
  const cls = (k) => input + (errors[k] ? " border-red-400" : " border-gray-200");
  const moto = form.product === "motorcycle";

  // Only the makes NPF allows for the chosen cover
  const makes = useMemo(() => {
    if (!lists) return [];
    const allowed = lists.products?.[form.product]?.make_ids || [];
    const all = lists.makes || [];
    return (allowed.length ? all.filter((m) => allowed.includes(m.id)) : all).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [lists, form.product]);
  const models = useMemo(() => (makes.find((m) => String(m.id) === String(form.vehicle_make_id))?.models || []), [makes, form.vehicle_make_id]);
  const bodies = lists?.body_types || [];

  const chooseMake = (idv) => { clearErr("vehicle_make_id"); const m = makes.find((x) => String(x.id) === idv); setForm((p) => ({ ...p, vehicle_make_id: idv, vehicle_make: m?.name || "", vehicle_model_id: "", vehicle_model: "" })); };
  const chooseModel = (idv) => { clearErr("vehicle_model_id"); const m = models.find((x) => String(x.id) === idv); setForm((p) => ({ ...p, vehicle_model_id: idv, vehicle_model: m?.name || "" })); };
  const chooseBody = (idv) => { clearErr("body_type_id"); const b = bodies.find((x) => String(x.id) === idv); setForm((p) => ({ ...p, body_type_id: idv, vehicle_type: b?.name || "" })); };

  const submit = async (e) => {
    e.preventDefault();
    if (form.website) return;
    setError(""); setErrors({});
    const v = validateOrder(form);
    if (!v.ok) { setErrors(v.errors); setError("Please correct the highlighted fields."); return; }
    if (limited()) { setError("Too many orders from this device. Please wait a few minutes or call us."); return; }
    setLoading(true);
    let o; let lock;
    try {
      const r = await api("/api/admin", { method: "POST", body: { action: "order", order: form } });
      o = r.order; lock = r.lock;
    } catch (x) {
      setLoading(false);
      if (x.status === 400 && x.fields) { setErrors(x.fields); setError("Please correct the highlighted fields."); return; }
      setError(x.status ? x.message : "We could not reach our server. Check your internet and try again, or WhatsApp us on " + CONTACT_PHONE_DISPLAY + ".");
      return;
    }
    const link = `${window.location.origin}/admin?e=${lock}`;
    let ok = true;
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        from_name: insuredName(o), from_email: o.email || "no-email@risktechinsurance.com", from_phone: o.phone,
        message: orderEmail(o, link),
      }, { publicKey: EMAILJS_PUBLIC_KEY });
      sendTimes.push(Date.now());
    } catch { ok = false; }
    store.set("rt_last_order", JSON.stringify({ reference: o.reference, product: o.product, reg_no: o.reg_no, start_date: o.start_date }));
    setEmailed(ok); setStaffLink(link); setOrder(o); setLoading(false);
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
            <PaymentStep order={order} emailed={emailed} staffLink={staffLink} />
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
              <div className="grid grid-cols-2 gap-2 mb-4" role="radiogroup" aria-label="Who is the policy for">
                {[["personal", "A person", User], ["company", "A company", Building2]].map(([k, t, I]) => (
                  <button type="button" role="radio" aria-checked={form.insured_type === k} key={k} onClick={() => set("insured_type", k)}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${form.insured_type === k ? "border-blue-600 bg-blue-50 text-blue-800" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}>
                    <I size={16} /> {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {form.insured_type === "personal" ? (
                  <>
                    <Field label="First name" error={errors.firstname}><input className={cls("firstname")} value={form.firstname} onChange={(e) => set("firstname", e.target.value)} maxLength={60} autoComplete="given-name" placeholder="As on your ID" /></Field>
                    <Field label="Last name" error={errors.lastname}><input className={cls("lastname")} value={form.lastname} onChange={(e) => set("lastname", e.target.value)} maxLength={60} autoComplete="family-name" placeholder="As on your ID" /></Field>
                  </>
                ) : (
                  <>
                    <Field label="Registered company name" error={errors.company_name}><input className={cls("company_name")} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} maxLength={150} placeholder="As registered with CAC" /></Field>
                    <Field label="RC number (optional)" error={errors.company_rc_number}><input className={cls("company_rc_number")} value={form.company_rc_number} onChange={(e) => set("company_rc_number", e.target.value.toUpperCase())} maxLength={20} placeholder="e.g. RC1234567" /></Field>
                  </>
                )}
                <Field label={form.insured_type === "company" ? "NIN of the person in charge" : "NIN (National Identification Number)"} error={errors.nin} className="sm:col-span-2"
                  hint="11 digits. NPF Insurance needs it for every policy. It is sent securely and never shown on our website.">
                  <div className="relative">
                    <input className={cls("nin") + " pr-10"} value={form.nin} onChange={(e) => set("nin", e.target.value.replace(/\D/g, "").slice(0, 11))} inputMode="numeric" autoComplete="off" placeholder="e.g. 12345678901" />
                    <Lock size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </Field>
                <Field label="Phone number (WhatsApp)" error={errors.phone} hint="Use your real number: you need it to look up your policy later."><input type="tel" className={cls("phone")} value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} placeholder="08012345678" autoComplete="tel" /></Field>
                <Field label="Email (optional)" error={errors.email}><input type="email" className={cls("email")} value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120} placeholder="you@example.com" autoComplete="email" /></Field>
                <Field label="Contact address" error={errors.address} className="sm:col-span-2"><input className={cls("address")} value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={250} placeholder="House number, street, area" autoComplete="street-address" /></Field>
                <Field label="State" error={errors.state}>
                  <select className={cls("state")} value={form.state} onChange={(e) => { setForm((p) => ({ ...p, state: e.target.value, lga: "" })); clearErr("state"); }}><option value="">Select state</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
                </Field>
                <Field label="LGA" error={errors.lga}>
                  <select className={cls("lga")} value={form.lga} disabled={!form.state} onChange={(e) => set("lga", e.target.value)}><option value="">{form.state ? "Select LGA" : "Select state first"}</option>{(LGAS[form.state] || []).map((l) => <option key={l}>{l}</option>)}</select>
                </Field>
                <Field label="Cover starts on" error={errors.start_date} hint="Today or up to 30 days ahead">
                  <input type="date" className={cls("start_date")} value={form.start_date} min={todayLagos()} onChange={(e) => set("start_date", e.target.value)} />
                </Field>
              </div>
            </div>

            <div>
              <p className="text-base font-semibold text-gray-900 mb-3">3. {moto ? "Motorcycle" : "Vehicle"} details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Plate number" error={errors.reg_no}><input className={cls("reg_no")} value={form.reg_no} onChange={(e) => set("reg_no", e.target.value.toUpperCase())} maxLength={20} placeholder="e.g. ABJ143FH" /></Field>
                <Field label="Year of make" error={errors.year_of_make}><input inputMode="numeric" className={cls("year_of_make")} value={form.year_of_make} onChange={(e) => set("year_of_make", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="e.g. 2014" /></Field>
                {lists ? (
                  <>
                    <Field label="Make" error={errors.vehicle_make_id}>
                      <select className={cls("vehicle_make_id")} value={form.vehicle_make_id} onChange={(e) => chooseMake(e.target.value)} data-testid="make"><option value="">Select make</option>{makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                    </Field>
                    <Field label="Model (optional)" error={errors.vehicle_model_id}>
                      <select className={cls("vehicle_model_id")} value={form.vehicle_model_id} disabled={!models.length} onChange={(e) => chooseModel(e.target.value)}><option value="">{form.vehicle_make_id ? (models.length ? "Select model" : "No models listed") : "Select make first"}</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                    </Field>
                    <Field label="Body type" error={errors.body_type_id}>
                      <select className={cls("body_type_id")} value={form.body_type_id} onChange={(e) => chooseBody(e.target.value)} data-testid="body"><option value="">Select body type</option>{bodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Make" error={errors.vehicle_make_id}><input className={cls("vehicle_make_id")} value={form.vehicle_make} onChange={(e) => { set("vehicle_make", e.target.value); clearErr("vehicle_make_id"); }} maxLength={60} placeholder={moto ? "e.g. Bajaj" : "e.g. Toyota"} disabled={!listsTried} /></Field>
                    <Field label="Model (optional)"><input className={cls("vehicle_model")} value={form.vehicle_model} onChange={(e) => set("vehicle_model", e.target.value)} maxLength={60} placeholder={moto ? "e.g. Boxer" : "e.g. Camry"} disabled={!listsTried} /></Field>
                    <Field label="Body type" error={errors.body_type_id}><input className={cls("body_type_id")} value={form.vehicle_type} onChange={(e) => { set("vehicle_type", e.target.value); clearErr("body_type_id"); }} maxLength={40} placeholder={moto ? "e.g. Motorcycle" : "e.g. Saloon, SUV"} disabled={!listsTried} /></Field>
                  </>
                )}
                <Field label="Colour" error={errors.vehicle_color}><input className={cls("vehicle_color")} value={form.vehicle_color} onChange={(e) => set("vehicle_color", e.target.value)} maxLength={30} placeholder="e.g. Black" /></Field>
                <Field label="Chassis number" error={errors.chassis_no} hint="On your vehicle papers"><input className={cls("chassis_no")} value={form.chassis_no} onChange={(e) => set("chassis_no", e.target.value.toUpperCase())} maxLength={30} /></Field>
                <Field label="Engine number" error={errors.engine_no}><input className={cls("engine_no")} value={form.engine_no} onChange={(e) => set("engine_no", e.target.value.toUpperCase())} maxLength={30} /></Field>
                <Field label="Engine capacity (optional)" error={errors.engine_capacity} hint={moto ? "In cc, e.g. 150" : "In litres, e.g. 1.6"}><input className={cls("engine_capacity")} value={form.engine_capacity} onChange={(e) => set("engine_capacity", e.target.value)} maxLength={10} /></Field>
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
