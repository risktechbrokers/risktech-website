import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, PhoneCall, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { HERO_SLIDES } from "../data/services";

const HeroSection = ({ navigate }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

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

  const trustPoints = ["NAICOM Licensed Broker", "Licence No. 1271", "Trusted Worldwide"];

  return (
    <section id="home" className="relative h-screen min-h-[600px] overflow-hidden">
      {/* ── Background Images ── */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{ background: slide.gradient || "linear-gradient(135deg, #0f2447, #1B3A6B)" }}
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
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-5xl mx-auto">

        {/* Service label badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`label-${current}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
            className="mb-5"
          >
            <span className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/40 text-blue-200 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"/>
              {slide.label}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Main headline */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={`headline-${current}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-white font-bold leading-tight mb-5"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 6vw, 4.5rem)",
              textShadow: "0 2px 40px rgba(0,0,0,0.5)",
            }}
          >
            {slide.headline.split("\n").map((line, i) => (
              <span key={i} style={{ display: "block", color: i === 1 ? "#93C5FD" : "white" }}>{line}</span>
            ))}
          </motion.h1>
        </AnimatePresence>

        {/* Subtitle */}
        <AnimatePresence mode="wait">
          <motion.p
            key={`sub-${current}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-blue-100 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {slide.sub}
          </motion.p>
        </AnimatePresence>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
        >
          <button
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            className="group bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-4 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1 flex items-center justify-center gap-2 text-base"
          >
            Get a Free Quote <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate("services")}
            className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold px-7 py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-base"
          >
            <PhoneCall size={18} /> View All Services
          </button>
        </motion.div>

        {/* Trust points */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-x-6 gap-y-2"
        >
          {trustPoints.map((pt) => (
            <span key={pt} className="flex items-center gap-1.5 text-green-300 text-sm font-medium">
              <CheckCircle size={14} className="text-green-400" /> {pt}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── Slide Navigation Arrows ── */}
      <button
        onClick={prev}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={next}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
      >
        <ChevronRight size={22} />
      </button>

      {/* ── Dot Navigation ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? 1 : -1)}
            className="transition-all duration-300"
          >
            <div className={`rounded-full transition-all duration-300 ${
              i === current ? "w-8 h-2.5 bg-blue-400" : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
            }`} />
          </button>
        ))}
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
