import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, CheckCircle, Car, Bike } from "lucide-react";
import { WhatsAppIcon } from "./WhatsAppButton";
import { waLink } from "../../shared/motor.js";
import { HERO_SLIDES } from "../data/services";

// Preload all hero images for instant slide transitions
const preloadImages = () => {
  HERO_SLIDES.forEach((slide, i) => {
    if (i === 0) return; // first already loaded via <link rel="preload">
    const img = new Image();
    img.src = slide.image;
  });
};

const HeroSection = ({ navigate }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Preload remaining slides after initial render
    const timer = setTimeout(preloadImages, 2000);
    return () => clearTimeout(timer);
  }, []);

  const goTo = useCallback((index, dir = 1) => {
    setDirection(dir);
    setCurrent(index);
  }, []);

  const next = useCallback(() => {
    goTo((current + 1) % HERO_SLIDES.length, 1);
  }, [current, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length, -1);
  }, [current, goTo]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next, paused]);

  const slide = HERO_SLIDES[current];

  const trustPoints = ["NAICOM Licence No. 1271", "CAC RC 7685222", "Open 24/7"];

  return (
    <section id="home" className="relative min-h-[100svh] lg:h-screen lg:min-h-[680px] overflow-hidden flex">
      {/* ── Background Images ── */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{ background: slide.gradient || "linear-gradient(135deg, #0f2447, #1B3A6B)", willChange: "opacity, transform" }}
        >
          <img
            src={slide.image}
            alt={slide.label}
            className="w-full h-full object-cover"
            loading="eager"
            onError={e => { e.target.style.display = "none"; }}
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(6,13,26,0.88) 0%, rgba(10,25,60,0.72) 60%, rgba(6,13,26,0.50) 100%)" }}
          />
          {/* Subtle grid texture */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`, backgroundSize: "60px 60px" }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex items-center pt-24 pb-20">
        <div className="w-full grid lg:grid-cols-[1.25fr_1fr] gap-10 lg:gap-14 items-center">

          {/* Left: message */}
          <div className="text-center lg:text-left">
            <AnimatePresence mode="wait">
              <motion.div key={`label-${current}`} initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.45 }} className="mb-5">
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-100 text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase px-4 py-2 rounded-full backdrop-blur-sm">
                  <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-pulse" />
                  {slide.label}
                </span>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.h1 key={`headline-${current}`} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="text-white font-bold leading-[1.08] mb-5"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.1rem, 5.2vw, 4.2rem)", textShadow: "0 2px 40px rgba(0,0,0,0.45)" }}>
                {slide.headline.split("\n").map((line, i) => (
                  <span key={i} className="block" style={{ color: i === 1 ? "#E6C878" : "white" }}>{line}</span>
                ))}
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.p key={`sub-${current}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
                className="text-blue-100/90 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                {slide.sub}.
              </motion.p>
            </AnimatePresence>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
              <button onClick={() => navigate("buy")}
                className="group bg-[#C9A84C] hover:bg-[#d8b95f] text-[#0B1F4B] font-bold whitespace-nowrap px-6 py-4 rounded-2xl transition-all duration-300 hover:shadow-[0_18px_40px_-12px_rgba(201,168,76,0.7)] hover:-translate-y-0.5 flex items-center justify-center gap-2">
                Buy Motor Insurance <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/25 text-white font-bold whitespace-nowrap px-6 py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2">
                Get a Free Quote <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a href={waLink("Hello RiskTech, I would like some help with insurance.")} target="_blank" rel="noreferrer"
                className="sm:hidden lg:flex group bg-transparent hover:bg-[#25D366]/15 border border-[#25D366]/60 text-white font-bold whitespace-nowrap px-6 py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2">
                <WhatsAppIcon size={18} className="text-[#25D366]" /> Chat with us
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2">
              {trustPoints.map((pt) => (
                <span key={pt} className="flex items-center gap-1.5 text-blue-100/90 text-sm font-medium">
                  <CheckCircle size={15} className="text-[#C9A84C]" /> {pt}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right: quick motor card */}
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="hidden md:block w-full max-w-md mx-auto lg:mx-0 lg:justify-self-end">
            <div className="relative rounded-3xl bg-white/[0.08] border border-white/15 backdrop-blur-xl p-6 sm:p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
              <div className="absolute -top-3 right-6 bg-[#C9A84C] text-[#0B1F4B] text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Buy online</div>
              <p className="text-white font-bold text-xl">Third party motor cover</p>
              <p className="text-blue-200 text-sm mt-1 mb-5">Underwritten by NPF Insurance. Pay by bank transfer.</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[["Private Motor", "₦15,000", Car], ["Motorcycle", "₦3,000", Bike]].map(([t, p, Icon]) => (
                  <button key={t} onClick={() => navigate("buy")} className="text-left rounded-2xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 hover:border-[#C9A84C]/60 p-4 transition-all">
                    <Icon size={22} className="text-[#E6C878]" />
                    <p className="text-white font-semibold mt-2 text-sm">{t}</p>
                    <p className="text-white text-lg font-bold">{p}<span className="text-blue-200 text-xs font-normal"> /yr</span></p>
                  </button>
                ))}
              </div>
              <ol className="space-y-2.5 mb-6">
                {["Fill in your vehicle details", "Transfer to our Jaiz Bank account", "Get your certificate on WhatsApp"].map((t, i) => (
                  <li key={t} className="flex items-center gap-3 text-sm text-blue-50">
                    <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold">{i + 1}</span>{t}
                  </li>
                ))}
              </ol>
              <button onClick={() => navigate("buy")} className="w-full bg-white text-[#0B1F4B] hover:bg-blue-50 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                Start now <ArrowRight size={17} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Slide controls ── */}
      <div className="absolute bottom-6 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => goTo(i, i > current ? 1 : -1)} className="py-2">
                <div className={`rounded-full transition-all duration-300 ${i === current ? "w-8 h-2 bg-[#C9A84C]" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`} />
              </button>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-2 lg:mr-20" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <button onClick={prev} aria-label="Previous slide" className="w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white"><ChevronLeft size={20} /></button>
            <button onClick={next} aria-label="Next slide" className="w-10 h-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
        <motion.div
          key={current}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 6, ease: "linear" }}
          className="h-full bg-blue-400"
        />
      </div>
    </section>
  );
};

export default HeroSection;
