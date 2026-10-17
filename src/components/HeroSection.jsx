import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { HERO_SLIDES } from "../data/services";

const preloadImages = () => {
  HERO_SLIDES.forEach((slide, i) => {
    if (i === 0) return;
    const img = new Image();
    img.src = slide.image;
  });
};

const ease = [0.22, 1, 0.36, 1];

const HeroSection = ({ navigate }) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const t = setTimeout(preloadImages, 2000);
    return () => clearTimeout(t);
  }, []);

  const next = useCallback(() => setCurrent((c) => (c + 1) % HERO_SLIDES.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + HERO_SLIDES.length) % HERO_SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 6500);
    return () => clearInterval(t);
  }, [next, paused, current]);

  const slide = HERO_SLIDES[current];
  const [line1, line2] = slide.headline.split("\n");

  return (
    <section id="home" className="relative h-[100svh] min-h-[600px] max-h-[980px] overflow-hidden bg-[#0B1F4B]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>

      {/* Background photo */}
      <AnimatePresence initial={false}>
        <motion.img
          key={slide.image}
          src={slide.image}
          alt={slide.label}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1 }, scale: { duration: 7, ease: "linear" } }}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      </AnimatePresence>

      {/* Readability shading: light at the top so the photo shows, darker where the text sits */}
      <div className="absolute inset-0 lg:hidden" style={{ background: "linear-gradient(180deg, rgba(8,18,40,0.55) 0%, rgba(8,18,40,0.15) 30%, rgba(8,18,40,0.55) 58%, rgba(8,18,40,0.92) 100%)" }} />
      <div className="absolute inset-0 hidden lg:block" style={{ background: "linear-gradient(90deg, rgba(8,18,40,0.88) 0%, rgba(8,18,40,0.6) 45%, rgba(8,18,40,0.1) 100%)" }} />

      {/* Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col justify-end lg:justify-center pb-24 lg:pb-0 pt-28">
        <div className="max-w-xl text-center lg:text-left mx-auto lg:mx-0">
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.55, ease }}>
              <h1 className="text-white font-bold leading-[1.1] mb-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.05rem, 5vw, 3.9rem)" }}>
                <span className="block">{line1}</span>
                <span className="block text-[#9CC3FF]">{line2}</span>
              </h1>
              <p className="text-blue-50/90 text-base sm:text-lg leading-relaxed mb-7 max-w-md mx-auto lg:mx-0">{slide.sub}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row items-center lg:items-center justify-center lg:justify-start gap-3 sm:gap-6">
            <button onClick={() => navigate("buy")}
              className="group w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2">
              Buy Motor Insurance <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="text-white/90 hover:text-white font-medium underline decoration-white/40 underline-offset-4 hover:decoration-white py-2">
              Get a free quote for any insurance
            </button>
          </div>

          <p className="mt-7 flex items-center justify-center lg:justify-start gap-2 text-sm text-blue-100/80">
            <ShieldCheck size={16} className="text-blue-300" />
            NAICOM Licence No. 1271 &middot; Open 24/7
          </p>
        </div>
      </div>

      {/* Slide controls */}
      <div className="absolute bottom-7 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex items-center justify-center lg:justify-between">
          <div className="flex items-center gap-1.5">
            {HERO_SLIDES.map((s, i) => (
              <button key={s.label} aria-label={`Show ${s.label}`} onClick={() => setCurrent(i)} className="p-1.5">
                <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-7 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"}`} />
              </button>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-2 mr-24">
            <button onClick={prev} aria-label="Previous slide" className="w-10 h-10 rounded-full border border-white/30 text-white/90 hover:bg-white/10 flex items-center justify-center"><ChevronLeft size={18} /></button>
            <button onClick={next} aria-label="Next slide" className="w-10 h-10 rounded-full border border-white/30 text-white/90 hover:bg-white/10 flex items-center justify-center"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
