import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, BadgeCheck, Clock, Car, Bike, HeartPulse, Home, Ship, Briefcase, Wheat } from "lucide-react";
import { HERO_SLIDES } from "../data/services";
import { WhatsAppIcon } from "./WhatsAppButton";
import { waLink } from "../../shared/motor.js";

const ICONS = {
  "Motor insurance": Car,
  "Health insurance": HeartPulse,
  "Property insurance": Home,
  "Marine insurance": Ship,
  "Business insurance": Briefcase,
  "Agricultural insurance": Wheat,
};

const SLIDE_MS = 7000;
const HOLD_MS = 12000; // after a customer taps an arrow or swipes, give them longer to read
const FADE_S = 1.4;
const ease = [0.22, 1, 0.36, 1];

// Resolve once the photo is downloaded and decoded (or after a short wait), so a slide never shows a blank background.
const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    img.onload = finish;
    img.onerror = finish;
    img.src = src;
    if (img.decode) img.decode().then(finish).catch(() => {});
    setTimeout(finish, 4000);
  });

const HeroSection = ({ navigate, onQuote }) => {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const touch = useRef(null);
  const busy = useRef(false);
  const currentRef = useRef(0);

  const goTo = useCallback(async (target) => {
    if (busy.current) return;
    busy.current = true;
    const n = (target + HERO_SLIDES.length) % HERO_SLIDES.length;
    await loadImage(HERO_SLIDES[n].image);
    if (n !== currentRef.current) {
      setPrev(currentRef.current);
      currentRef.current = n;
      setCurrent(n);
    }
    busy.current = false;
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const back = useCallback(() => goTo(current - 1), [current, goTo]);
  // Moves chosen by the customer (arrows, dots, swipe) hold the slide a little longer
  const manual = useCallback((fn) => { setHeld(true); fn(); }, []);

  // Auto-advance. Pausing only happens for a real mouse hovering on a computer,
  // never for a finger on a phone (touching used to freeze the slideshow).
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => { setHeld(false); next(); }, held ? HOLD_MS : SLIDE_MS);
    return () => clearTimeout(t);
  }, [next, paused, current, held]);

  // Swipe left or right on phones
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const start = touch.current; touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x; const dy = t.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) manual(dx < 0 ? next : back);
  };

  // Warm up the next photo in the background
  useEffect(() => {
    const t = setTimeout(() => loadImage(HERO_SLIDES[(current + 1) % HERO_SLIDES.length].image), 1500);
    return () => clearTimeout(t);
  }, [current]);

  const slide = HERO_SLIDES[current];
  const [line1, line2] = slide.headline.split("\n");
  const Icon = ICONS[slide.label] || ShieldCheck;

  const primary = () => (slide.buy ? navigate("buy") : onQuote?.(slide.quote));
  const chat = waLink(`Hello RiskTech, I would like ${slide.wa || "insurance"}.`);

  return (
    <section
      id="home"
      className="relative h-[100svh] min-h-[640px] max-h-[1000px] overflow-hidden bg-[#0B1F4B]"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setPaused(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setPaused(false); }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Photos: the new one fades in on top while the previous stays fully visible underneath (no dark flash) */}
      {HERO_SLIDES.map((s, i) => {
        const isCurrent = i === current;
        const isPrev = i === prev;
        return (
          <motion.img
            key={s.image}
            src={s.image}
            alt={isCurrent ? s.label : ""}
            aria-hidden={!isCurrent}
            draggable={false}
            initial={{ opacity: i === 0 ? 1 : 0, scale: 1 }}
            animate={isCurrent ? { opacity: 1, scale: 1.07 } : isPrev ? { opacity: 1 } : { opacity: 0, scale: 1 }}
            transition={isCurrent
              ? { opacity: { duration: FADE_S, ease: "easeInOut" }, scale: { duration: (SLIDE_MS / 1000) + FADE_S + 1, ease: "linear" } }
              : { duration: 0 }}
            className="absolute inset-0 w-full h-full object-cover select-none"
            style={{ zIndex: isCurrent ? 3 : isPrev ? 2 : 1 }}
            loading={i === 0 ? "eager" : "lazy"}
            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          />
        );
      })}

      {/* Shading so the text is readable while the photo stays visible */}
      <div className="absolute inset-0 z-[4] lg:hidden" style={{ background: "linear-gradient(180deg, rgba(8,18,40,0.55) 0%, rgba(8,18,40,0.35) 35%, rgba(8,18,40,0.6) 70%, rgba(8,18,40,0.88) 100%)" }} />
      <div className="absolute inset-0 z-[4] hidden lg:block" style={{ background: "linear-gradient(90deg, rgba(8,18,40,0.86) 0%, rgba(8,18,40,0.55) 50%, rgba(8,18,40,0.2) 100%)" }} />

      {/* Content */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex items-center pt-20 pb-36 lg:pb-16">
        <div className="w-full grid lg:grid-cols-[1.35fr_0.85fr] gap-10 items-center">

          <div className="text-center lg:text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease, delay: 0.35 } }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.35 } }}
              >
                <p className="inline-flex items-center gap-2 text-blue-100/90 text-sm font-medium mb-4">
                  <Icon size={17} className="text-blue-300" />
                  {slide.label.charAt(0).toUpperCase() + slide.label.slice(1)}
                </p>
                <h1 className="text-white font-bold leading-[1.08] mb-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.15rem, 5.2vw, 4rem)", textShadow: "0 2px 24px rgba(0,0,0,0.35)" }}>
                  <span className="block">{line1}</span>
                  <span className="block text-[#A9CBFF]">{line2}</span>
                </h1>
                <p className="text-blue-50/90 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">{slide.sub}</p>
              </motion.div>
            </AnimatePresence>

            {/* Two buttons that match the slide, side by side on phones too */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mt-7 max-w-md sm:max-w-none mx-auto lg:mx-0 justify-center lg:justify-start">
              <button onClick={primary} data-testid="hero-primary"
                className="group whitespace-nowrap bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[13px] min-[375px]:text-[14px] min-[390px]:text-[15px] sm:text-base px-2 sm:px-7 py-3.5 rounded-xl shadow-lg shadow-blue-950/40 transition-colors flex items-center justify-center gap-2">
                {slide.cta} <ArrowRight size={18} className="hidden sm:block group-hover:translate-x-1 transition-transform" />
              </button>
              <a href={chat} target="_blank" rel="noreferrer" data-testid="hero-chat"
                className="whitespace-nowrap bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/60 text-white font-semibold text-[13px] min-[375px]:text-[14px] min-[390px]:text-[15px] sm:text-base px-2 sm:px-7 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                <WhatsAppIcon size={18} className="text-[#25D366] flex-shrink-0" /> Chat on WhatsApp
              </a>
            </div>

            {/* Trust row */}
            <div className="mt-7 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-[13px] sm:text-sm text-blue-50/90">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} className="text-blue-300" /> NAICOM Licensed &middot; 1271</span>
              <span className="inline-flex items-center gap-1.5"><BadgeCheck size={16} className="text-blue-300" /> CAC Registered</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={16} className="text-blue-300" /> Open 24/7</span>
            </div>
          </div>

          {/* Quick-buy card (computers only) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5, ease }}
            className="hidden lg:block justify-self-end w-full max-w-sm">
            <div className="rounded-2xl bg-white/[0.09] border border-white/15 backdrop-blur-md p-6 shadow-2xl shadow-black/30">
              <p className="text-white font-semibold text-lg">Buy third party motor cover</p>
              <p className="text-blue-100/80 text-sm mt-1 mb-5">Online in a few minutes. Pay by bank transfer.</p>
              {[["Private Motor", "₦15,000", Car], ["Motorcycle", "₦3,000", Bike]].map(([t, p, I]) => (
                <button key={t} onClick={() => navigate("buy")}
                  className="w-full flex items-center justify-between rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-4 py-3 mb-2.5 transition-colors text-left">
                  <span className="flex items-center gap-3 text-white"><I size={18} className="text-blue-200" />{t}</span>
                  <span className="text-white font-semibold">{p}<span className="text-blue-200/70 text-xs font-normal"> /yr</span></span>
                </button>
              ))}
              <button onClick={() => navigate("buy")} className="w-full mt-2 bg-white text-[#0B1F4B] hover:bg-blue-50 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                Buy now <ArrowRight size={16} />
              </button>
              <p className="flex items-center justify-center gap-2 text-blue-100/70 text-xs mt-4">
                <img src="/partners/npf-logo.jpg" alt="" width="20" height="20" className="w-5 h-5 rounded bg-white object-contain" />
                Underwritten by NPF Insurance
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Slide controls: arrows either side of the dots on phones, arrows on the right on computers */}
      <div className="absolute bottom-[92px] lg:bottom-6 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-center lg:justify-between">
          <div className="flex items-center gap-3 lg:gap-0">
            <button onClick={() => manual(back)} aria-label="Previous slide" data-testid="hero-prev-m"
              className="lg:hidden w-11 h-11 rounded-full border border-white/60 bg-white/10 backdrop-blur-sm text-white active:bg-white/25 flex items-center justify-center"><ChevronLeft size={20} /></button>
            <div className="flex items-center gap-1">
              {HERO_SLIDES.map((s, i) => (
                <button key={s.label} aria-label={`Show ${s.label}`} onClick={() => manual(() => goTo(i))} className="p-1.5">
                  <span className={`block h-1.5 rounded-full transition-all duration-500 ${i === current ? "w-7 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"}`} />
                </button>
              ))}
            </div>
            <button onClick={() => manual(next)} aria-label="Next slide" data-testid="hero-next-m"
              className="lg:hidden w-11 h-11 rounded-full border border-white/60 bg-white/10 backdrop-blur-sm text-white active:bg-white/25 flex items-center justify-center"><ChevronRight size={20} /></button>
          </div>
          <div className="hidden lg:flex items-center gap-2 mr-24">
            <button onClick={() => manual(back)} aria-label="Previous slide" className="w-10 h-10 rounded-full border border-white/30 text-white/90 hover:bg-white/10 flex items-center justify-center"><ChevronLeft size={18} /></button>
            <button onClick={() => manual(next)} aria-label="Next slide" className="w-10 h-10 rounded-full border border-white/30 text-white/90 hover:bg-white/10 flex items-center justify-center"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
