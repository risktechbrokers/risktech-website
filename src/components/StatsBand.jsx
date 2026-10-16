// Trust band under the hero, with numbers that count up when scrolled into view.
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck, Layers, Clock, BadgeCheck } from "lucide-react";

const Count = ({ to, prefix = "", suffix = "", duration = 1.4, plain = false }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / (duration * 1000));
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref}>{prefix}{plain ? v : v.toLocaleString("en-NG")}{suffix}</span>;
};

const ITEMS = [
  { icon: BadgeCheck, value: <Count to={1271} plain />, label: "NAICOM licence number", plain: true },
  { icon: Layers, value: <Count to={30} suffix="+" />, label: "Insurance products" },
  { icon: ShieldCheck, value: <Count to={100} prefix="₦" suffix="m" />, label: "Professional indemnity cover" },
  { icon: Clock, value: "24/7", label: "Always available" },
];

const StatsBand = () => (
  <section className="relative z-10 -mt-px bg-[#0B1F4B]">
    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {ITEMS.map((it, i) => {
          const Icon = it.icon;
          return (
            <motion.div key={it.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex items-center gap-3 sm:gap-4 rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-4 sm:px-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#C9A84C]/15 text-[#E6C878] flex items-center justify-center flex-shrink-0"><Icon size={22} /></div>
              <div className="min-w-0">
                <p className="text-white font-bold text-xl sm:text-2xl leading-none tabular-nums">{it.value}</p>
                <p className="text-blue-200/80 text-xs sm:text-sm mt-1 leading-tight">{it.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default StatsBand;
