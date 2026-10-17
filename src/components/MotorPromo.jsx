// NPF Insurance partner section: the place on the site to buy NPF motor cover online.
import { motion } from "framer-motion";
import { ArrowRight, Car, Bike, ClipboardList, Landmark, FileCheck2 } from "lucide-react";

const NPF = { blue: "#173C8C", yellow: "#F2E400", green: "#0B6B2E" };

const STEPS = [
  { icon: ClipboardList, title: "Fill the form", text: "Your name, plate number, chassis and engine numbers." },
  { icon: Landmark, title: "Pay by transfer", text: "Send the premium to our Jaiz Bank account with your reference." },
  { icon: FileCheck2, title: "Receive your certificate", text: "Once payment is confirmed, your NPF certificate comes to your WhatsApp." },
];

const MotorPromo = ({ navigate }) => (
  <section id="npf" className="px-4 sm:px-6 lg:px-12 py-16 sm:py-20 bg-gray-50">
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
      className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

      {/* NPF colour strip */}
      <div className="flex h-1.5">
        <span className="flex-1" style={{ background: NPF.blue }} />
        <span className="flex-1" style={{ background: NPF.yellow }} />
        <span className="flex-1" style={{ background: NPF.green }} />
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 p-6 sm:p-10 lg:p-12">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <img src="/partners/npf-logo.jpg" alt="NPF Insurance Company Limited" width="56" height="56" className="w-14 h-14 rounded-xl border border-gray-100 object-contain bg-white" loading="lazy" />
            <div className="leading-tight">
              <p className="text-xs text-gray-500">In partnership with</p>
              <p className="font-semibold text-gray-900">NPF Insurance Company Limited</p>
            </div>
          </div>

          <h2 className="text-gray-900 text-3xl md:text-4xl font-bold leading-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Buy NPF third party motor insurance online
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            The compulsory cover every vehicle in Nigeria needs, underwritten by NPF Insurance and arranged by RiskTech as your licensed broker.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-7 max-w-md">
            {[["Private Motor", "₦15,000", Car], ["Motorcycle", "₦3,000", Bike]].map(([t, p, Icon]) => (
              <div key={t} className="rounded-2xl border border-gray-200 p-4">
                <Icon size={20} style={{ color: NPF.green }} />
                <p className="text-gray-600 text-sm mt-2">{t}</p>
                <p className="text-gray-900 text-lg sm:text-xl font-bold whitespace-nowrap">{p}<span className="text-gray-400 text-xs font-normal"> / year</span></p>
              </div>
            ))}
          </div>

          <button onClick={() => navigate("buy")}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:brightness-110"
            style={{ background: NPF.green }}>
            Buy NPF motor cover <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="lg:border-l lg:border-gray-100 lg:pl-10 flex flex-col justify-center">
          <p className="font-semibold text-gray-900 mb-5">How it works</p>
          <ol className="space-y-6">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className="flex gap-4">
                  <span className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} style={{ color: NPF.blue }} />
                  </span>
                  <span>
                    <span className="block font-semibold text-gray-900">{s.title}</span>
                    <span className="block text-gray-600 text-sm leading-relaxed mt-0.5">{s.text}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </motion.div>
  </section>
);

export default MotorPromo;
