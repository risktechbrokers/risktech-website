// Key facts strip under the hero.
import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

const Count = ({ to, prefix = "", suffix = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 1200);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return <span ref={ref}>{prefix}{v}{suffix}</span>;
};

const ITEMS = [
  { value: "1271", label: "NAICOM licence number" },
  { value: <Count to={30} suffix="+" />, label: "Insurance products" },
  { value: <Count to={100} prefix="₦" suffix="m" />, label: "Professional indemnity" },
  { value: "RC 7685222", label: "Registered with CAC", small: true },
];

const StatsBand = () => (
  <section className="bg-white border-b border-gray-100">
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it, i) => (
          <div key={it.label}
            className={`py-6 sm:py-8 px-3 text-center lg:text-left ${i % 2 === 1 ? "border-l border-gray-100" : ""} ${i >= 2 ? "border-t lg:border-t-0 border-gray-100" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
            <p className={`text-[#0B1F4B] font-bold tabular-nums leading-none ${it.small ? "text-lg sm:text-2xl" : "text-2xl sm:text-3xl"}`} style={{ fontFamily: "'Playfair Display', serif" }}>{it.value}</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-2">{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsBand;
