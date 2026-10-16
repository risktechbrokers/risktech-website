// Promo band for buying third party motor insurance online.
import { motion } from "framer-motion";
import { ArrowRight, Car, Bike, FileCheck2, Landmark, ClipboardList } from "lucide-react";

const STEPS = [
  { icon: ClipboardList, title: "Fill the form", text: "Your name and your vehicle's papers: plate, chassis and engine numbers." },
  { icon: Landmark, title: "Pay by transfer", text: "Send the premium to our Jaiz Bank account with your reference." },
  { icon: FileCheck2, title: "Get your certificate", text: "Once payment is confirmed we send your NPF certificate to your WhatsApp." },
];

const MotorPromo = ({ navigate }) => (
  <section className="section-padding bg-white">
    <div className="max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0B1F4B] via-[#13306e] to-[#1d4ed8] text-white p-7 sm:p-10 lg:p-14">
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-[#C9A84C]/15 blur-3xl" />
        <div className="absolute -left-24 bottom-0 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
          <div>
            <span className="text-[#E6C878] text-xs font-semibold tracking-[0.2em] uppercase">New: buy online</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Third party motor insurance, without the queue
            </h2>
            <p className="text-blue-100/90 leading-relaxed mb-6">Compulsory cover for your car or motorcycle, underwritten by NPF Insurance Company Limited and handled by licensed brokers.</p>
            <div className="flex flex-wrap gap-3 mb-7">
              <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5"><Car size={18} className="text-[#E6C878]" /><span className="text-sm">Private Motor <b>₦15,000</b></span></div>
              <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5"><Bike size={18} className="text-[#E6C878]" /><span className="text-sm">Motorcycle <b>₦3,000</b></span></div>
            </div>
            <button onClick={() => navigate("buy")} className="group inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#d8b95f] text-[#0B1F4B] font-bold px-7 py-4 rounded-2xl transition-all hover:-translate-y-0.5">
              Buy now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
                  className="rounded-2xl bg-white/[0.07] border border-white/10 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center"><Icon size={20} className="text-[#E6C878]" /></div>
                    <span className="text-white/25 text-3xl font-bold">0{i + 1}</span>
                  </div>
                  <p className="font-bold mb-1">{s.title}</p>
                  <p className="text-blue-100/80 text-sm leading-relaxed">{s.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default MotorPromo;
