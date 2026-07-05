import { useState, useEffect } from "react";

const IntroOverlay = ({ onComplete }) => {
  const [phase, setPhase] = useState("show");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fadeout"), 3200);
    const t2 = setTimeout(() => { setPhase("done"); onComplete?.(); }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "done") return null;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      display:"flex", alignItems:"center", justifyContent:"center",
      overflow:"hidden",
      opacity: phase === "fadeout" ? 0 : 1,
      transition:"opacity 0.8s ease-in-out",
      background:"linear-gradient(160deg, #010817 0%, #06152e 25%, #0a2350 55%, #071a38 80%, #030d1f 100%)",
    }}>
      {/* ── Ambient glow orbs ── */}
      <div style={{
        position:"absolute", top:"-10%", left:"-5%",
        width:600, height:600, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%)",
        filter:"blur(80px)", pointerEvents:"none",
        animation:"rtDrift 9s ease-in-out infinite alternate",
      }}/>
      <div style={{
        position:"absolute", bottom:"-15%", right:"-5%",
        width:520, height:520, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)",
        filter:"blur(90px)", pointerEvents:"none",
        animation:"rtDrift 11s ease-in-out infinite alternate-reverse",
      }}/>
      <div style={{
        position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:760, height:420, borderRadius:"50%",
        background:"radial-gradient(ellipse, rgba(30,90,220,0.15) 0%, transparent 70%)",
        filter:"blur(70px)", pointerEvents:"none",
      }}/>

      {/* ── Fine grid texture ── */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage:"linear-gradient(rgba(120,170,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,255,0.045) 1px, transparent 1px)",
        backgroundSize:"56px 56px",
        maskImage:"radial-gradient(ellipse at center, black 40%, transparent 85%)",
        WebkitMaskImage:"radial-gradient(ellipse at center, black 40%, transparent 85%)",
      }}/>

      {/* ── Sweeping light beam ── */}
      <div style={{
        position:"absolute", top:0, bottom:0, width:"40%",
        background:"linear-gradient(100deg, transparent 20%, rgba(140,190,255,0.05) 50%, transparent 80%)",
        animation:"rtSweep 5s ease-in-out infinite",
        pointerEvents:"none",
      }}/>

      {/* ── Content, directly on the background ── */}
      <div style={{
        position:"relative", zIndex:10,
        textAlign:"center", padding:"40px 28px 0",
        maxWidth:760, width:"94%",
      }}>
        {/* Logo — the hero of the overlay, big and bold */}
        <div style={{
          display:"flex", justifyContent:"center", marginBottom:18,
          animation:"rtRise 0.9s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          <img
            src="/risktech_logo.png"
            alt="RiskTech Insurance Brokers Limited"
            width={232}
            height={180}
            className="h-32 sm:h-44"
            style={{ width:"auto", maxWidth:"88vw", aspectRatio:"868 / 673", objectFit:"contain",
              filter:"drop-shadow(0 10px 45px rgba(20,80,220,0.55)) drop-shadow(0 2px 12px rgba(0,10,40,0.8))" }}
          />
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize:"clamp(26px, 5.2vw, 44px)", fontWeight:700,
          color:"#ffffff", lineHeight:1.28, margin:"0 0 14px",
          fontFamily:"Georgia,'Times New Roman',serif",
          textShadow:"0 3px 36px rgba(0,10,60,0.9)",
          animation:"rtRise 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s both",
        }}>
          Your Trusted Insurance Partner
          <br/>
          <span style={{
            background:"linear-gradient(90deg, #7db4ff, #b6d5ff, #7db4ff)",
            WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent",
            fontWeight:600,
          }}>Wherever You Are</span>
        </h1>

        {/* Tagline */}
        <p style={{
          color:"rgba(195,220,255,0.82)", fontSize:16,
          fontWeight:300, margin:"0 0 30px", letterSpacing:"0.4px",
          animation:"rtRise 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both",
        }}>
          Protecting Your Assets, Securing Your Future.
        </p>

        {/* Divider */}
        <div style={{
          margin:"0 auto 26px", width:110, height:2, borderRadius:2,
          background:"linear-gradient(90deg, transparent, #3B82F6, #A5CDFF, #3B82F6, transparent)",
          animation:"rtRise 0.9s cubic-bezier(0.22,1,0.36,1) 0.4s both",
        }}/>

        {/* Loading dots */}
        <div style={{
          display:"flex", justifyContent:"center", gap:9, marginBottom:40,
          animation:"rtRise 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both",
        }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width:8, height:8, borderRadius:"50%",
              background:"rgba(150,200,255,0.8)",
              display:"inline-block",
              animation:`rtPulse 1.3s ease-in-out ${i*0.22}s infinite`,
            }}/>
          ))}
        </div>

        {/* NAICOM line */}
        <p className="px-4" style={{
          color:"rgba(150,198,255,0.6)", fontSize:11,
          letterSpacing:"2.2px", textTransform:"uppercase", margin:0,
          animation:"rtRise 0.9s cubic-bezier(0.22,1,0.36,1) 0.6s both",
        }}>
          NAICOM Licensed &nbsp;&middot;&nbsp; Licence No. 1271 &nbsp;&middot;&nbsp; Est. 2024
        </p>
      </div>

      <style>{`
        @keyframes rtPulse {
          0%,100% { opacity:0.25; transform:scale(0.75); }
          50% { opacity:1; transform:scale(1.15); }
        }
        @keyframes rtRise {
          from { opacity:0; transform:translateY(26px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes rtDrift {
          from { transform:translate(0,0); }
          to   { transform:translate(50px,35px); }
        }
        @keyframes rtSweep {
          0%   { left:-45%; }
          100% { left:105%; }
        }
      `}</style>
    </div>
  );
};

export default IntroOverlay;
