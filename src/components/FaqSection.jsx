// Frequently asked questions (home page).
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageCircle } from "lucide-react";
import { waLink } from "../../shared/motor.js";

const FAQS = [
  {
    q: "What does an insurance broker do for me?",
    a: "A broker works for you, not for the insurance company. We study what you need to protect, compare cover from several insurers, negotiate the price and terms, and handle your claim with the insurer if something goes wrong.",
  },
  {
    q: "Does using a broker cost me more?",
    a: "In most cases, no. Brokers are usually paid a commission by the insurer, so you pay the normal premium and get professional advice and claims support on top.",
  },
  {
    q: "Is RiskTech licensed?",
    a: "Yes. RiskTech Insurance Brokers Limited is licensed by the National Insurance Commission (NAICOM) under Licence No. 1271, valid from 20 April 2026 to 19 April 2031, and registered with the Corporate Affairs Commission (RC 7685222).",
  },
  {
    q: "How do I buy third party motor insurance on this website?",
    a: "Tap Buy Motor Insurance, choose Private Motor or Motorcycle, and fill in your details and your vehicle's details. You will then see our bank account and a reference number. Pay by transfer, send us the receipt on WhatsApp, and we send your certificate once the payment is confirmed.",
  },
  {
    q: "How much is third party motor insurance?",
    a: "₦15,000 a year for a private car and ₦3,000 a year for a motorcycle. Cover is provided by NPF Insurance Company Limited.",
  },
  {
    q: "What does third party insurance cover?",
    a: "It covers your legal liability to other people: damage to their property up to ₦3,000,000, and bodily injury or death. It does not pay for damage to your own vehicle. If you want your own car covered, ask us for a comprehensive motor quote.",
  },
  {
    q: "How do I check that my certificate is genuine?",
    a: "Motor policies in Nigeria are recorded on the Nigerian Insurance Industry Database (NIID). Send an SMS of your Policy No*Plate No to 33125, or visit askniid.org. If you have any doubt about a certificate, call or WhatsApp us.",
  },
  {
    q: "How do I make a claim?",
    a: "Use the Make a Claim page, or message us on WhatsApp straight after the incident. We handle the claim with the insurer on your behalf and keep you updated until it is settled.",
  },
  {
    q: "Do you only serve clients in Lagos?",
    a: "No. We serve individuals and businesses across Nigeria and internationally, and we are available 24 hours a day, 7 days a week.",
  },
];

const Item = ({ f, open, onToggle, i }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.04 }}
    className={`rounded-2xl border transition-colors ${open ? "border-blue-200 bg-white shadow-sm" : "border-gray-200 bg-white/70 hover:bg-white"}`}>
    <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-6 py-4 sm:py-5">
      <span className="font-semibold text-gray-900 text-[15px] sm:text-base">{f.q}</span>
      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${open ? "bg-blue-700 text-white rotate-45" : "bg-blue-50 text-blue-700"}`}><Plus size={16} /></span>
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
          <p className="px-5 sm:px-6 pb-5 text-gray-600 text-sm leading-relaxed">{f.a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const FaqSection = () => {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="section-padding bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.6fr] gap-10 lg:gap-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="lg:sticky lg:top-32 self-start">
          <span className="text-blue-600 text-sm font-semibold tracking-widest uppercase">FAQ</span>
          <h2 className="text-gray-900 text-3xl md:text-4xl font-bold mt-3 mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Questions people<br /><span className="text-blue-700">often ask us</span>
          </h2>
          <p className="text-gray-500 leading-relaxed mb-6">Straight answers about how we work, buying motor insurance online, and making a claim.</p>
          <div className="rounded-2xl bg-[#0B1F4B] text-white p-6">
            <p className="font-bold mb-1">Still have a question?</p>
            <p className="text-blue-200 text-sm mb-4">Our customer care team replies on WhatsApp.</p>
            <a href={waLink("Hello RiskTech, I have a question.")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5b] text-white font-bold text-sm px-4 py-2.5 rounded-xl">
              <MessageCircle size={16} /> Ask on WhatsApp
            </a>
          </div>
        </motion.div>
        <div className="space-y-3">
          {FAQS.map((f, i) => <Item key={f.q} f={f} i={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />)}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
