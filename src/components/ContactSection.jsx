import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import emailjs from "@emailjs/browser";
import { Phone, Mail, MapPin, Send, CheckCircle, AlertCircle, Globe, ChevronDown } from "lucide-react";

const EMAILJS_SERVICE_ID  = "service_r9hj031";
const EMAILJS_TEMPLATE_ID = "template_20jtn8c";
const EMAILJS_PUBLIC_KEY  = "2Q8Nq2E5ZLTAwqv7a";

const sanitize = (str) =>
  String(str).replace(/<[^>]*>/g,"").replace(/[<>"'`]/g,"").replace(/javascript:/gi,"").replace(/on\w+\s*=/gi,"").trim().slice(0,2000);

const INSURANCE_TYPES = [
  "General Enquiry","Private Motor Insurance","Commercial Vehicle Insurance",
  "Motorcycle Insurance","Health Insurance","Group Life Assurance",
  "Homeowner Insurance","Fire & Special Perils","Burglary Insurance",
  "Employers' Liability","Occupiers' Liability","Builders' Liability",
  "Professional Indemnity","Healthcare Professional Indemnity",
  "Marine Cargo Insurance","Marine Hull & Machinery","Contractors All Risks",
  "Industrial All Risk","Boiler & Pressure Vessel","Personal Accident",
  "Group Personal Accident","Travel Insurance","All Risks Insurance",
  "Consequential Loss","Goods in Transit","Agricultural Insurance",
  "Takaful Insurance","Special & Emerging Risks","Other",
];

// Dynamic fields per insurance type
const DYNAMIC_FIELDS = {
  "Private Motor Insurance": [
    { name:"vehicle_make_model", label:"Vehicle Make & Model", placeholder:"e.g. Toyota Camry 2020", type:"text" },
    { name:"vehicle_year", label:"Year of Manufacture", placeholder:"e.g. 2020", type:"text" },
    { name:"vehicle_value", label:"Estimated Vehicle Value (₦)", placeholder:"e.g. ₦8,000,000", type:"text" },
    { name:"vehicle_usage", label:"Vehicle Usage", type:"select", options:["Private Use","Commercial Use","Both"] },
  ],
  "Commercial Vehicle Insurance": [
    { name:"fleet_size", label:"Number of Vehicles", placeholder:"e.g. 5", type:"text" },
    { name:"vehicle_types", label:"Vehicle Types", placeholder:"e.g. Buses, Trucks, Vans", type:"text" },
    { name:"business_type", label:"Nature of Business", placeholder:"e.g. Logistics, School Transport", type:"text" },
  ],
  "Motorcycle Insurance": [
    { name:"bike_make", label:"Motorcycle Make & Model", placeholder:"e.g. Honda CB500", type:"text" },
    { name:"bike_usage", label:"Usage", type:"select", options:["Private","Commercial (Dispatch)","Both"] },
  ],
  "Health Insurance": [
    { name:"num_people", label:"Number of People to Cover", placeholder:"e.g. 1, 5, 50", type:"text" },
    { name:"age_range", label:"Age Range of Members", placeholder:"e.g. 25–45 years", type:"text" },
    { name:"plan_type", label:"Plan Type", type:"select", options:["Individual","Family","Group/Corporate"] },
  ],
  "Group Life Assurance": [
    { name:"num_employees", label:"Number of Employees", placeholder:"e.g. 50", type:"text" },
    { name:"annual_salary", label:"Approximate Annual Payroll (₦)", placeholder:"e.g. ₦50,000,000", type:"text" },
  ],
  "Homeowner Insurance": [
    { name:"property_type", label:"Property Type", type:"select", options:["Bungalow","Duplex","Flat/Apartment","Commercial Building","Other"] },
    { name:"property_value", label:"Estimated Property Value (₦)", placeholder:"e.g. ₦25,000,000", type:"text" },
    { name:"property_location", label:"Property Location", placeholder:"City, State, Country", type:"text" },
  ],
  "Marine Cargo Insurance": [
    { name:"cargo_type", label:"Type of Cargo", placeholder:"e.g. Electronics, Food, Machinery", type:"text" },
    { name:"cargo_value", label:"Cargo Value (₦)", placeholder:"e.g. ₦5,000,000", type:"text" },
    { name:"shipping_route", label:"Shipping Route", placeholder:"e.g. China to Lagos", type:"text" },
    { name:"shipping_mode", label:"Mode of Transport", type:"select", options:["Sea","Air","Road","Multi-modal"] },
  ],
  "Marine Hull & Machinery": [
    { name:"vessel_type", label:"Vessel Type", placeholder:"e.g. Cargo Ship, Fishing Boat", type:"text" },
    { name:"vessel_value", label:"Vessel Value (₦)", placeholder:"e.g. ₦500,000,000", type:"text" },
    { name:"operating_area", label:"Operating Area", placeholder:"e.g. Atlantic Ocean, Lagos Harbour", type:"text" },
  ],
  "Agricultural Insurance": [
    { name:"farm_type", label:"Type of Farm / Produce", placeholder:"e.g. Poultry, Maize, Cassava, Fishery", type:"text" },
    { name:"farm_size", label:"Farm Size (Hectares)", placeholder:"e.g. 10 hectares", type:"text" },
    { name:"farm_location", label:"Farm Location", placeholder:"State / Country", type:"text" },
  ],
  "Travel Insurance": [
    { name:"destination", label:"Travel Destination", placeholder:"e.g. United Kingdom, USA", type:"text" },
    { name:"travel_dates", label:"Travel Dates", placeholder:"e.g. 01/08/2025 – 30/08/2025", type:"text" },
    { name:"num_travellers", label:"Number of Travellers", placeholder:"e.g. 2", type:"text" },
  ],
  "Employers' Liability": [
    { name:"num_employees", label:"Number of Employees", placeholder:"e.g. 25", type:"text" },
    { name:"industry_type", label:"Industry / Business Type", placeholder:"e.g. Construction, Manufacturing", type:"text" },
  ],
  "Builders' Liability": [
    { name:"project_type", label:"Project Type", placeholder:"e.g. Residential, Commercial", type:"text" },
    { name:"project_value", label:"Project Value (₦)", placeholder:"e.g. ₦100,000,000", type:"text" },
    { name:"project_location", label:"Project Location", placeholder:"City, State", type:"text" },
  ],
};

let submissionTimes = [];
const isRateLimited = () => { const n=Date.now(); submissionTimes=submissionTimes.filter(t=>n-t<600000); return submissionTimes.length>=3; };

const ContactSection = ({ preselectedService = "" }) => {
  const formRef = useRef(null);
  const sectionRef = useRef(null);

  const [formData, setFormData] = useState({
    name:"", email:"", phone:"", country:"", insurance_type: preselectedService || "",
    contact_pref:"", heard_from:"", message:"", honeypot:"",
  });
  const [dynamicData, setDynamicData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Update insurance type if parent passes a preselected service
  useEffect(() => {
    if (preselectedService) {
      setFormData(p => ({ ...p, insurance_type: preselectedService }));
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [preselectedService]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: name==="honeypot"?value:sanitize(value) }));
    if (error) setError("");
  }, [error]);

  const handleDynamicChange = (name, value) => {
    setDynamicData(p => ({ ...p, [name]: sanitize(value) }));
  };

  const dynamicFields = DYNAMIC_FIELDS[formData.insurance_type] || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.honeypot) return;
    if (isRateLimited()) { setError("Too many submissions. Please wait a few minutes."); return; }
    setLoading(true); setError("");
    if (EMAILJS_SERVICE_ID === "") {
      setTimeout(()=>{ setLoading(false); setSubmitted(true); submissionTimes.push(Date.now()); },1200);
      return;
    }
    try {
      // Second sanitisation layer: escape any HTML-special characters right
      // before the values are placed into the email markup.
      const esc = (v) => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
      const dynRows = dynamicFields.length > 0
        ? dynamicFields.map(f => esc(f.label) + ": " + esc(dynamicData[f.name] || "Not provided")).join("\n")
        : "";
      const msgHTML = "<table style=\"width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px\"><thead><tr style=\"background:#0B1F4B\"><td colspan=\"2\" style=\"padding:10px 14px;color:#C9A84C;font-weight:bold\">ENQUIRY DETAILS</td></tr></thead><tbody><tr style=\"background:#f0f4ff\"><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B;width:35%\">Insurance Type</td><td style=\"padding:9px 12px\">" + esc(formData.insurance_type||"Not specified") + "</td></tr><tr><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B\">Country</td><td style=\"padding:9px 12px\">" + esc(formData.country||"Not specified") + "</td></tr><tr style=\"background:#f0f4ff\"><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B\">Preferred Contact</td><td style=\"padding:9px 12px\">" + esc(formData.contact_pref||"Not specified") + "</td></tr><tr><td style=\"padding:9px 12px;font-weight:bold;color:#0B1F4B\">How They Heard</td><td style=\"padding:9px 12px\">" + esc(formData.heard_from||"Not specified") + "</td></tr></tbody>" + (dynamicFields.length>0?"<thead><tr style=\"background:#0B1F4B\"><td colspan=\"2\" style=\"padding:10px 14px;color:#C9A84C;font-weight:bold\">ADDITIONAL DETAILS</td></tr></thead><tbody><tr><td colspan=\"2\" style=\"padding:12px;white-space:pre-line\">" + dynRows + "</td></tr></tbody>":"") + "<thead><tr style=\"background:#0B1F4B\"><td colspan=\"2\" style=\"padding:10px 14px;color:#C9A84C;font-weight:bold\">MESSAGE</td></tr></thead><tbody><tr><td colspan=\"2\" style=\"padding:12px\">" + esc(formData.message||"No message") + "</td></tr></tbody></table>";
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { from_name: formData.name, from_email: formData.email, from_phone: formData.phone, message: msgHTML }, { publicKey: EMAILJS_PUBLIC_KEY });
      submissionTimes.push(Date.now()); setLoading(false); setSubmitted(true);
    } catch { setLoading(false); setError("Something went wrong. Please call 08067514506."); }
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData({name:"",email:"",phone:"",country:"",insurance_type:"",contact_pref:"",heard_from:"",message:"",honeypot:""});
    setDynamicData({}); setError("");
  };

  const inputClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const selectClass = "w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer";

  return (
    <section id="contact" ref={sectionRef} className="section-padding bg-white">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.6}} className="text-center mb-12">
          <span className="text-blue-600 text-sm font-semibold tracking-widest uppercase">Get In Touch</span>
          <h2 className="text-gray-900 text-3xl md:text-4xl font-bold mt-3 mb-4" style={{fontFamily:"'Playfair Display',serif"}}>
            {preselectedService ? `Get a Quote for ${preselectedService}` : "Request a Quote or Contact Us"}
          </h2>
          <div className="w-16 h-1 bg-blue-700 mx-auto rounded-full mb-5"/>
          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
            {preselectedService
              ? `You've selected ${preselectedService}. Fill in your details below and we'll get back to you with the best quote.`
              : "Ready to get covered? Fill out the form and one of our brokers will reach out as soon as possible."
            }
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-10">

          {/* FORM */}
          <motion.div initial={{opacity:0,x:-30}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{duration:0.6}} className="flex-1">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-green-50 rounded-3xl border border-green-100">
                <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:200}}>
                  <CheckCircle size={64} className="text-green-500 mb-4"/>
                </motion.div>
                <h3 className="text-gray-900 text-2xl font-bold mb-2">Message Sent! 🎉</h3>
                <p className="text-gray-500 max-w-sm">Thank you for reaching out. A RiskTech broker will contact you as soon as possible.</p>
                <button onClick={resetForm} className="mt-6 text-blue-600 font-semibold text-sm hover:underline">Send another message</button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="bg-gray-50 rounded-3xl p-6 sm:p-8 border border-gray-100" noValidate>
                <h3 className="text-gray-900 font-bold text-xl mb-6">
                  {preselectedService ? `Quote Request: ${preselectedService}` : "Send Us a Message"}
                </h3>

                {/* Honeypot */}
                <div style={{display:"none"}} aria-hidden="true">
                  <input type="text" name="honeypot" value={formData.honeypot} onChange={handleChange} tabIndex={-1} autoComplete="off"/>
                </div>

                {error && (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0"/>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* ── SECTION 1: Personal Details ── */}
                <div className="mb-5">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Your Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Full Name <span className="text-red-500">*</span></label>
                      <input type="text" name="from_name" value={formData.name} onChange={e=>setFormData(p=>({...p,name:sanitize(e.target.value)}))} required maxLength={100} placeholder="Your full name" className={inputClass}/>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Phone Number</label>
                      <input type="tel" name="from_phone" value={formData.phone} onChange={e=>setFormData(p=>({...p,phone:sanitize(e.target.value)}))} maxLength={20} placeholder="e.g. 0812 345 6789" className={inputClass}/>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Email Address <span className="text-red-500">*</span></label>
                      <input type="email" name="from_email" value={formData.email} onChange={e=>setFormData(p=>({...p,email:sanitize(e.target.value)}))} required maxLength={100} placeholder="you@example.com" className={inputClass}/>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Country</label>
                      <input type="text" name="country" value={formData.country} onChange={e=>setFormData(p=>({...p,country:sanitize(e.target.value)}))} maxLength={60} placeholder="e.g. Nigeria, UK, USA" className={inputClass}/>
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: Insurance Type ── */}
                <div className="mb-5">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Insurance Details</p>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1.5">Type of Insurance <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select name="insurance_type" value={formData.insurance_type} onChange={e=>setFormData(p=>({...p,insurance_type:e.target.value}))} required className={selectClass}>
                        <option value="">Select insurance type...</option>
                        {INSURANCE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                    </div>
                  </div>

                  {/* Dynamic fields based on insurance type */}
                  {dynamicFields.length > 0 && (
                    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.3}}
                      className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
                      <p className="text-blue-700 text-xs font-bold uppercase tracking-widest mb-3">
                        {formData.insurance_type} Additional Details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dynamicFields.map(field => (
                          <div key={field.name}>
                            <label className="block text-gray-700 text-xs font-medium mb-1">{field.label}</label>
                            {field.type === "select" ? (
                              <div className="relative">
                                <select name={field.name} value={dynamicData[field.name]||""} onChange={e=>handleDynamicChange(field.name,e.target.value)}
                                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer">
                                  <option value="">Select...</option>
                                  {field.options.map(o=><option key={o} value={o}>{o}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                              </div>
                            ) : (
                              <input type="text" name={field.name} value={dynamicData[field.name]||""} onChange={e=>handleDynamicChange(field.name,e.target.value)} placeholder={field.placeholder} maxLength={200}
                                className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ── SECTION 3: Message + Preferences ── */}
                <div className="mb-5">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">More Information</p>
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-1.5">Message / Additional Details <span className="text-red-500">*</span></label>
                    <textarea name="message" value={formData.message} onChange={e=>setFormData(p=>({...p,message:sanitize(e.target.value)}))} required rows={4} maxLength={2000}
                      placeholder="Tell us more about what you need, any specific requirements, or ask us anything..." className={`${inputClass} resize-none`}/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">Preferred Contact Method</label>
                      <div className="relative">
                        <select name="contact_pref" value={formData.contact_pref} onChange={e=>setFormData(p=>({...p,contact_pref:e.target.value}))} className={selectClass}>
                          <option value="">Select preference...</option>
                          <option>Phone Call</option>
                          <option>Email</option>
                          <option>WhatsApp</option>
                          <option>Any</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1.5">How Did You Hear About Us?</label>
                      <div className="relative">
                        <select name="heard_from" value={formData.heard_from} onChange={e=>setFormData(p=>({...p,heard_from:e.target.value}))} className={selectClass}>
                          <option value="">Select...</option>
                          <option>Google Search</option>
                          <option>Friend / Referral</option>
                          <option>Social Media</option>
                          <option>WhatsApp</option>
                          <option>Advertisement</option>
                          <option>Other</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-4 rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2 text-base">
                  {loading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending...</> : <>Send Message <Send size={18}/></>}
                </button>
                <p className="text-gray-400 text-xs text-center mt-3">🔒 Sent securely to risktechbrokers@gmail.com</p>
              </form>
            )}
          </motion.div>

          {/* RIGHT SIDEBAR */}
          <motion.div initial={{opacity:0,x:30}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{duration:0.6,delay:0.2}} className="lg:w-80 flex flex-col gap-5">
            <div>
              <h3 className="text-gray-900 text-2xl font-bold mb-2" style={{fontFamily:"'Playfair Display',serif"}}>Get in Touch Directly</h3>
              <p className="text-gray-500 text-sm leading-relaxed">We are available 24/7, reach us anytime.</p>
            </div>
            {[
              {icon:Phone, color:"bg-blue-100 text-blue-700",   label:"Phone",  value:"08067514506",              href:"tel:08067514506"},
              {icon:Mail,  color:"bg-green-100 text-green-700", label:"Email",  value:"risktechbrokers@gmail.com", href:"mailto:risktechbrokers@gmail.com"},
              {icon:MapPin,color:"bg-orange-100 text-orange-700",label:"Office",value:"Shop 41, Alakija Shopping Complex, WAEC Street, Jibowu, Yaba, Lagos.", href:null},
            ].map(c=>{
              const Icon=c.icon;
              return (
                <div key={c.label} className="flex gap-4 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className={`w-11 h-11 rounded-xl ${c.color} flex items-center justify-center flex-shrink-0`}><Icon size={20}/></div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{c.label}</p>
                    {c.href ? <a href={c.href} className="text-gray-900 font-semibold text-sm hover:text-blue-600 transition-colors">{c.value}</a>
                      : <p className="text-gray-900 font-semibold text-sm leading-relaxed">{c.value}</p>}
                  </div>
                </div>
              );
            })}
            <div className="bg-blue-700 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/><p className="font-bold text-base">Always Available</p></div>
              <div className="bg-white/15 rounded-xl px-4 py-3 text-center mb-3">
                <p className="text-3xl font-black text-white tracking-wider">24 / 7</p>
                <p className="text-blue-200 text-xs mt-1 uppercase tracking-widest">Round the Clock</p>
              </div>
              <div className="space-y-1.5 text-blue-100 text-sm">
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"/><span>Monday – Sunday: Always Open</span></div>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"/><span>No public holidays, no downtime</span></div>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"/><span>We respond whenever you need us</span></div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 text-white flex items-center gap-4">
              <Globe size={28} className="text-blue-400 flex-shrink-0"/>
              <div>
                <p className="font-bold text-sm">Serving Clients Worldwide</p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">Wherever you are, we can help.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
