// ============================================================
// AD SECTION — RiskTech Hero Film
// Embeds the standalone animation (risktech-film.html) in an
// isolated iframe. The film loads lazily (only when near the
// viewport) and shows a polished placeholder until it's ready.
// ============================================================

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Film } from "lucide-react";

const AdSection = () => {
  const [loadFilm, setLoadFilm]   = useState(false);
  const [filmReady, setFilmReady] = useState(false);
  const holderRef = useRef(null);
  const iframeRef = useRef(null);

  // Lazy-load: mount iframe when section comes near the viewport
  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoadFilm(true); observer.disconnect(); } },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="our-story" className="bg-[#060b18]">

      {/* ── Section header ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="text-center pt-16 pb-10 px-6"
      >
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
          <Film size={12} /> Our Story
        </div>
        <h2
          className="text-white text-3xl md:text-4xl font-bold mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          See Why We&apos;re Different
        </h2>
        <div className="w-14 h-1 bg-gradient-to-r from-blue-500 to-blue-300 mx-auto rounded-full mb-5" />
        <p className="text-gray-400 max-w-lg mx-auto text-base leading-relaxed">
          Watch our story and see what RiskTech stands for, in every frame.
        </p>
      </motion.div>

      {/* ── Film player ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          {/* Outer glow ring */}
          <div className="relative rounded-2xl p-[1px]"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(147,197,253,0.1), rgba(59,130,246,0.3))" }}>
            <div
              ref={holderRef}
              className="relative w-full overflow-hidden rounded-2xl bg-[#050b1a]"
              style={{ aspectRatio: "16 / 9" }}
            >
              {/* Film iframe — only mounted once section is near viewport */}
              {loadFilm && (
                <iframe
                  ref={iframeRef}
                  src="/risktech-film.html"
                  title="RiskTech Insurance Brokers: Our Story"
                  className="absolute inset-0 w-full h-full border-0"
                  style={{
                    opacity: filmReady ? 1 : 0,
                    transition: "opacity 0.6s ease",
                  }}
                  allow="autoplay"
                  onLoad={() => setFilmReady(true)}
                />
              )}

              {/* Placeholder — shown until iframe reports it has loaded */}
              {(!loadFilm || !filmReady) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                  {/* Animated ring */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-blue-500/30 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center">
                        <Play size={24} className="text-blue-300 ml-1" />
                      </div>
                    </div>
                    {/* Spinning ring */}
                    <div
                      className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400"
                      style={{ animation: "spin 1.4s linear infinite" }}
                    />
                  </div>
                  <p className="text-blue-200/50 text-sm tracking-wide">
                    {loadFilm ? "Loading film..." : "Scroll down to play"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Caption below player */}
          <p className="text-center text-gray-600 text-xs mt-4 tracking-wide">
            RiskTech Insurance Brokers Limited &nbsp;&middot;&nbsp; NAICOM Licence No. 1271
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
};

export default AdSection;
