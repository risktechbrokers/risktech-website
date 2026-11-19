// ============================================================
// CLAIMS PAGE — Make a Claim / Claims Assistance
// RiskTech handles claims on behalf of their clients
// ============================================================
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, AlertCircle, Clock, Phone, Mail, Shield, Users, Zap, ChevronRight, FileText } from "lucide-react";
import emailjs from "@emailjs/browser";
import PhotoPicker from "../components/PhotoPicker";
import { api } from "../lib/api";

const EMAILJS_SERVICE_ID  = "service_r9hj031";
const EMAILJS_TEMPLATE_ID = "template_20jtn8c";
const EMAILJS_PUBLIC_KEY  = "2Q8Nq2E5ZLTAwqv7a";

const sanitize = (str) => String(str).replace(/<[^>]*>/g, "").replace(/[<>"'`]/g, "").replace(/javascript:/gi, "").trim().slice(0, 2000);

const INSURANCE_TYPES = [
  "Private Motor Insurance","Commercial Vehicle Insurance","Motorcycle Insurance",
  "Health Insurance","Group Life Assurance","Homeowner Insurance",
  "Fire & Special Perils","Burglary Insurance","Employers' Liability",
  "Occupiers' Liability","Builders' Liability","Professional Indemnity",
  "Healthcare Professional Indemnity","Marine Cargo Insurance","Marine Hull & Machinery",
  "Contractors All Risks","Industrial All Risk","Boiler & Pressure Vessel",
  "Personal Accident","Group Personal Accident","Travel Insurance",
  "Goods in Transit","All Risks Insurance","Consequential Loss",
  "Agricultural Insurance","Takaful","Other",
];

const STEPS = [
  { icon: FileText, title: "Submit Your Claim", desc: "Fill out the claim form below with full details of the incident." },
  { icon: Users,    title: "RiskTech Reviews",  desc: "Our claims specialists assess your claim and liaise with the insurance company on your behalf." },
  { icon: Clock,    title: "Follow Up",          desc: "We track and follow up with the insurer to ensure your claim is processed quickly and fairly." },
  { icon: CheckCircle, title: "You Get Paid",   desc: "Once approved, the insurer pays you. We ensure you receive what you are rightfully owed." },
];

let submitTimes = [];
const isRateLimited = () => { const n=Date.now(); submitTimes=submitTimes.filter(t=>n-t<600000); return submitTimes.length>=3; };

const ClaimsPage = ({ navigate }) => {
  const formRef = useRef(null);
  const [step, setStep] = useState(1); // 1=form, 2=success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    claimant_name: "", email: "", phone: "", policy_number: "",
    insurance_type: "", incident_date: "", incident_location: "",
    incident_description: "", estimated_loss: "", honeypot: "",
  });

  const [uploads, setUploads] = useState(false); // can photos be saved right now?
  const [photos, setPhotos] = useState([]); // [{ id, slot, data }]
  const [fieldErr, setFieldErr] = useState({});
  const [claimId, setClaimId] = useState("");
  const [photosNote, setPhotosNote] = useState(false);
  useEffect(() => {
    let live = true;
    api("/api/admin", { method: "POST", body: { action: "upload-info" } }).then((r) => live && setUploads(!!r.uploads)).catch(() => { /* no photos: the form still works */ });
    return () => { live = false; };
  }, []);
  const set = (k, v) => { setForm(p => ({ ...p, [k]: sanitize(v) })); setFieldErr((e) => (e[k] ? { ...e, [k]: "" } : e)); };
  const addPhotos = (slot) => (list) => { setPhotos((p) => [...p, ...list.map((data) => ({ id: `${Date.now()}-${Math.random()}`, slot, data }))]); setFieldErr((e) => ({ ...e, photos: "" })); };
  const removePhoto = (id) => setPhotos((p) => p.filter((x) => x.id !== id));
  const resetAll = () => { setStep(1); setPhotos([]); setFieldErr({}); setClaimId(""); setPhotosNote(false); setForm({claimant_name:"",email:"",phone:"",policy_number:"",insurance_type:"",incident_date:"",incident_location:"",incident_description:"",estimated_loss:"",honeypot:""}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.honeypot) return;
    // The form has noValidate (for our own messages), so the required fields are checked here
    const errs = {};
    if (!form.claimant_name.trim()) errs.claimant_name = "Enter your full name.";
    if (form.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter your phone number.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email address.";
    if (!form.insurance_type) errs.insurance_type = "Choose the type of insurance.";
    if (!form.incident_date) errs.incident_date = "Enter the date of the incident.";
    if (!form.incident_location.trim()) errs.incident_location = "Enter where it happened.";
    if (form.incident_description.trim().length < 10) errs.incident_description = "Describe what happened.";
    if (uploads && !photos.length) errs.photos = "Add at least one photo of the damage or loss, or of a supporting document.";
    const photoBytes = photos.reduce((n, p) => n + Math.floor(p.data.length * 0.75), 0);
    if (photoBytes > 2_900_000) errs.photos = "The photos are too large together. Please remove one or two and send those on WhatsApp.";
    if (Object.values(errs).some(Boolean)) { setFieldErr(errs); setError("Please fill in the fields marked in red."); return; }
    if (isRateLimited()) { setError("Too many submissions. Please wait a few minutes."); return; }
    setLoading(true); setError(""); setFieldErr({});

    // 1) Save the claim and its photos (so staff see it on the staff page). If this fails, the email still goes.
    let id = ""; let photosSaved = !photos.length || !uploads;
    try {
      const r = await api("/api/admin", { method: "POST", body: {
        action: "claim",
        claim: { name: form.claimant_name, phone: form.phone, email: form.email, policy_number: form.policy_number, insurance_type: form.insurance_type,
          incident_date: form.incident_date, incident_location: form.incident_location, description: form.incident_description, estimated_loss: form.estimated_loss },
        photos: uploads ? photos.map(({ slot, data }) => ({ slot, data })) : [],
      } });
      id = r.id || ""; photosSaved = !!r.photosSaved || !photos.length;
    } catch (x) {
      if (x.status === 400 || x.status === 413) { setLoading(false); setError(x.message); return; }
      // network or server problem: carry on with the email
    }

    // 2) The email to the company inbox, as before
    if (EMAILJS_SERVICE_ID === "") {
      setTimeout(() => { setLoading(false); setClaimId(id); setPhotosNote(!photosSaved); setStep(2); submitTimes.push(Date.now()); }, 1400);
      return;
    }
    try {
      const esc = (v) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
      const msgHTML = "<table style=\"width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px\"><thead><tr style=\"background:#0B1F4B\"><td colspan=\"2\" style=\"padding:10px 14px;color:#C9A84C;font-weight:bold\">CLAIM DETAILS</td></tr></thead><tbody><tr style=\"background:#f0f4ff\"><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B;width:35%\">Claim reference</td><td style=\"padding:9px 12px\">"+esc(id||"Not saved on the staff page")+"</td></tr><tr><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B\">Photos</td><td style=\"padding:9px 12px\">"+esc(photos.length?(photosSaved&&id?photos.length+" (see the Claims page on the staff page)":"Not saved: ask the customer on WhatsApp"):"None")+"</td></tr><tr style=\"background:#f0f4ff\"><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B;width:35%\">Policy Number</td><td style=\"padding:9px 12px\">"+esc(form.policy_number||"Not provided")+"</td></tr><tr><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B\">Insurance Type</td><td style=\"padding:9px 12px\">"+esc(form.insurance_type||"Not specified")+"</td></tr></tbody><thead><tr style=\"background:#0B1F4B\"><td colspan=\"2\" style=\"padding:10px 14px;color:#C9A84C;font-weight:bold\">INCIDENT INFORMATION</td></tr></thead><tbody><tr style=\"background:#f0f4ff\"><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B\">Date of Incident</td><td style=\"padding:9px 12px\">"+esc(form.incident_date||"Not provided")+"</td></tr><tr><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B\">Location</td><td style=\"padding:9px 12px\">"+esc(form.incident_location||"Not provided")+"</td></tr><tr style=\"background:#f0f4ff\"><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B\">Estimated Loss</td><td style=\"padding:9px 12px\">"+esc(form.estimated_loss||"Not provided")+"</td></tr></tbody><thead><tr style=\"background:#0B1F4B\"><td colspan=\"2\" style=\"padding:10px 14px;color:#C9A84C;font-weight:bold\">DESCRIPTION</td></tr></thead><tbody><tr><td colspan=\"2\" style=\"padding:12px\">"+esc(form.incident_description||"No description")+"</td></tr></tbody></table>";
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { from_name: form.claimant_name, from_email: form.email, from_phone: form.phone, message: msgHTML }, { publicKey: EMAILJS_PUBLIC_KEY });
      submitTimes.push(Date.now()); setLoading(false); setClaimId(id); setPhotosNote(!photosSaved); setStep(2);
    } catch {
      setLoading(false);
      // The claim is already saved for staff, so the customer is done even if the email failed
      if (id) { submitTimes.push(Date.now()); setClaimId(id); setPhotosNote(!photosSaved); setStep(2); return; }
      setError("Something went wrong. Please call 0913 420 6766.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white py-14 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:"radial-gradient(circle at 80% 50%, #93C5FD 0%, transparent 60%)"}}/>
        <div className="max-w-5xl mx-auto relative z-10">
          <button onClick={() => navigate("home")} className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors mb-8 text-sm font-medium">
            <ArrowLeft size={16}/> Back to Home
          </button>
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
              <Shield size={28} className="text-white"/>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-3" style={{fontFamily:"'Playfair Display',serif"}}>Make a Claim</h1>
              <p className="text-blue-200 max-w-xl text-base leading-relaxed">
                Had an incident? Don't worry, RiskTech is here to help. We handle the entire claims process on your behalf, dealing directly with the insurer to get you what you deserve.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-center text-gray-900 text-xl font-bold mb-8">How the claims process works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="text-center">
                  <div className="w-12 h-12 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3 relative">
                    <Icon size={20} className="text-white"/>
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                  </div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{s.title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* CLAIM FORM */}
          <div className="flex-1">
            {step === 2 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm">
                <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:200}}>
                  <CheckCircle size={64} className="text-green-500 mx-auto mb-4"/>
                </motion.div>
                <h3 className="text-gray-900 text-2xl font-bold mb-2">Claim submitted</h3>
                {claimId && <p className="text-gray-700 mb-2" data-testid="claim-ref">Your claim reference: <b className="font-mono">{claimId}</b></p>}
                <p className="text-gray-500 max-w-sm mx-auto mb-6">Your claim has been received. A RiskTech claims specialist will contact you within 24 hours to guide you through the next steps.</p>
                {photosNote && <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm mb-6 max-w-sm mx-auto">We could not save your photos on the website. Please send them on WhatsApp to 0913 420 6766{claimId ? ` with your claim reference ${claimId}` : ""}.</p>}
                <div className="bg-blue-50 rounded-2xl p-5 text-left mb-6">
                  <p className="font-bold text-blue-900 text-sm mb-2">What happens next?</p>
                  <div className="space-y-2">
                    {["Our team reviews your claim details","We contact the insurance company on your behalf","We keep you updated every step of the way","You receive your rightful compensation"].map((t,i)=>(
                      <div key={i} className="flex items-start gap-2 text-sm text-blue-800">
                        <CheckCircle size={13} className="text-blue-600 mt-0.5 flex-shrink-0"/>{t}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={resetAll}
                  className="text-blue-600 font-semibold text-sm hover:underline">Submit another claim</button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm" noValidate>
                <h3 className="font-bold text-gray-900 text-xl mb-2">Claim Details</h3>
                <p className="text-gray-500 text-sm mb-6">Please fill in as much detail as possible. The more information you provide, the faster we can process your claim.</p>

                {/* Honeypot */}
                <div style={{display:"none"}} aria-hidden="true">
                  <input type="text" name="honeypot" value={form.honeypot} onChange={e=>setForm(p=>({...p,honeypot:e.target.value}))} tabIndex={-1} autoComplete="off"/>
                </div>

                {error && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0"/>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* Section: Personal */}
                <div className="mb-6">
                  <p className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users size={12}/>Your Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Full Name <span className="text-red-500">*</span></label>
                      <input type="text" name="claimant_name" value={form.claimant_name} onChange={e=>set("claimant_name",e.target.value)} required maxLength={100} placeholder="Your full name" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                      {fieldErr.claimant_name && <p className="text-red-600 text-xs mt-1">{fieldErr.claimant_name}</p>}
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                      <input type="tel" name="claimant_phone" value={form.phone} onChange={e=>set("phone",e.target.value)} required maxLength={20} placeholder="e.g. 0812 345 6789" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                      {fieldErr.phone && <p className="text-red-600 text-xs mt-1">{fieldErr.phone}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Email Address <span className="text-red-500">*</span></label>
                      <input type="email" name="claimant_email" value={form.email} onChange={e=>set("email",e.target.value)} required maxLength={100} placeholder="you@example.com" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                      {fieldErr.email && <p className="text-red-600 text-xs mt-1">{fieldErr.email}</p>}
                    </div>
                  </div>
                </div>

                {/* Section: Policy */}
                <div className="mb-6">
                  <p className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2"><Shield size={12}/>Policy Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Policy Number <span className="text-gray-400 font-normal">(if known)</span></label>
                      <input type="text" name="policy_number" value={form.policy_number} onChange={e=>set("policy_number",e.target.value)} maxLength={50} placeholder="e.g. POL-2024-001234" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Type of Insurance <span className="text-red-500">*</span></label>
                      <select name="insurance_type" value={form.insurance_type} onChange={e=>set("insurance_type",e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700">
                        <option value="">Select insurance type...</option>
                        {INSURANCE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      {fieldErr.insurance_type && <p className="text-red-600 text-xs mt-1">{fieldErr.insurance_type}</p>}
                    </div>
                  </div>
                </div>

                {/* Section: Incident */}
                <div className="mb-6">
                  <p className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap size={12}/>Incident Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Date of Incident <span className="text-red-500">*</span></label>
                      <input type="date" name="incident_date" value={form.incident_date} onChange={e=>set("incident_date",e.target.value)} required max={new Date().toISOString().split("T")[0]} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                      {fieldErr.incident_date && <p className="text-red-600 text-xs mt-1">{fieldErr.incident_date}</p>}
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Location of Incident <span className="text-red-500">*</span></label>
                      <input type="text" name="incident_location" value={form.incident_location} onChange={e=>set("incident_location",e.target.value)} required maxLength={200} placeholder="City, street or address" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                      {fieldErr.incident_location && <p className="text-red-600 text-xs mt-1">{fieldErr.incident_location}</p>}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1.5">Description of Incident <span className="text-red-500">*</span></label>
                    <textarea name="incident_description" value={form.incident_description} onChange={e=>set("incident_description",e.target.value)} required rows={5} maxLength={2000} placeholder="Describe what happened in as much detail as possible: when, how, what was damaged or lost, any witnesses..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"/>
                    {fieldErr.incident_description && <p className="text-red-600 text-xs mt-1">{fieldErr.incident_description}</p>}
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1.5">Estimated Value of Loss/Damage <span className="text-gray-400 font-normal">(₦)</span></label>
                    <input type="text" name="estimated_loss" value={form.estimated_loss} onChange={e=>set("estimated_loss",e.target.value)} maxLength={50} placeholder="e.g. ₦500,000" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                  </div>
                </div>

                {uploads && (
                  <div className="mb-6" data-testid="claim-photos">
                    <p className="text-base font-semibold text-gray-900 mb-1">Photos</p>
                    <p className="text-gray-500 text-xs mb-3">At least one photo, up to 8 in total. Only RiskTech staff can see them. Videos: please send them on WhatsApp.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <PhotoPicker label="Photos of the damage or loss" required max={8 - photos.filter((p) => p.slot === "document").length} photos={photos.filter((p) => p.slot === "damage")} onAdd={addPhotos("damage")} onRemove={removePhoto} error={fieldErr.photos} testId="claim-damage" />
                      <PhotoPicker label="Supporting documents" hint="Police report, receipts, medical report (photos)" max={8 - photos.filter((p) => p.slot === "damage").length} photos={photos.filter((p) => p.slot === "document")} onAdd={addPhotos("document")} onRemove={removePhoto} testId="claim-docs" />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2 text-base">
                  {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting...</> : <>Submit My Claim <ChevronRight size={18}/></>}
                </button>
                <p className="text-gray-400 text-xs text-center mt-3">Your claim is submitted securely and handled with full confidentiality</p>
              </form>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="lg:w-72 space-y-5">
            <div className="bg-blue-700 rounded-2xl p-6 text-white">
              <p className="font-bold text-base mb-2">Need Urgent Help?</p>
              <p className="text-blue-200 text-sm mb-4 leading-relaxed">For urgent claims or emergencies, call us directly. We are available 24/7.</p>
              <a href="tel:+2349134206766" className="flex items-center gap-2 bg-white text-blue-700 font-bold px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm">
                <Phone size={16}/> 0913 420 6766
              </a>
              <a href="mailto:risktechbrokers@gmail.com" className="flex items-center gap-2 bg-white/15 text-white font-semibold px-4 py-3 rounded-xl hover:bg-white/25 transition-colors text-sm mt-2">
                <Mail size={16}/> risktechbrokers@gmail.com
              </a>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <p className="font-bold text-gray-900 text-base mb-4">What to Prepare</p>
              <div className="space-y-3">
                {[
                  "Your insurance policy document or number",
                  "Photos of the damage/loss (videos: send on WhatsApp)",
                  "Police report (for theft or accidents)",
                  "Receipts or proof of value of items",
                  "Any witness statements or contact details",
                  "Medical reports (for health/accident claims)",
                ].map((item,i)=>(
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0"/>
                    <span className="text-gray-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="font-bold text-amber-900 text-sm mb-2">Important</p>
              <p className="text-amber-800 text-xs leading-relaxed">
                Please notify us of any claim as soon as possible after the incident. Late notification may affect your claim outcome. Do not dispose of damaged items before our assessment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimsPage;
