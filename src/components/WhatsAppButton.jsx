// Floating customer-care WhatsApp button, shown on every public page.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { waLink } from "../../shared/motor.js";

export const WhatsAppIcon = ({ size = 24, className = "" }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true" fill="currentColor">
    <path d="M16.004 3C8.82 3 3 8.82 3 16.004c0 2.297.6 4.538 1.742 6.515L3 29l6.65-1.71a12.96 12.96 0 0 0 6.354 1.66h.005C23.183 28.95 29 23.13 29 15.946 29 8.762 23.188 3 16.004 3Zm0 23.77h-.004a10.8 10.8 0 0 1-5.5-1.505l-.395-.234-3.946 1.015 1.053-3.846-.257-.395a10.75 10.75 0 0 1-1.65-5.8c0-5.96 4.85-10.81 10.814-10.81 2.886 0 5.598 1.125 7.638 3.168a10.73 10.73 0 0 1 3.163 7.644c-.003 5.963-4.853 10.763-10.916 10.763Zm5.93-8.08c-.325-.163-1.925-.95-2.223-1.058-.298-.108-.515-.163-.732.163-.217.325-.84 1.058-1.03 1.275-.19.217-.38.244-.705.081-.325-.163-1.373-.506-2.615-1.614-.967-.862-1.62-1.927-1.81-2.252-.19-.325-.02-.5.142-.663.146-.145.325-.38.488-.57.163-.19.217-.325.325-.542.108-.217.054-.407-.027-.57-.081-.163-.732-1.763-1.003-2.415-.264-.634-.533-.548-.732-.558l-.624-.011a1.197 1.197 0 0 0-.868.407c-.298.325-1.139 1.113-1.139 2.713s1.166 3.147 1.329 3.364c.163.217 2.295 3.505 5.56 4.915.777.336 1.383.536 1.856.686.78.248 1.49.213 2.051.13.626-.094 1.925-.787 2.197-1.547.271-.76.271-1.411.19-1.547-.081-.136-.298-.217-.623-.38Z" />
  </svg>
);

const GREETING = "Hello RiskTech, I would like some help with insurance.";

const WhatsAppButton = () => {
  const [tip, setTip] = useState(false);
  useEffect(() => {
    let shown = false;
    try { shown = !!sessionStorage.getItem("rt_wa_tip"); } catch { /* ignore */ }
    if (shown) return;
    const t = setTimeout(() => { setTip(true); try { sessionStorage.setItem("rt_wa_tip", "1"); } catch { /* ignore */ } }, 6000);
    const h = setTimeout(() => setTip(false), 16000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-end gap-3">
      <AnimatePresence>
        {tip && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
            className="hidden sm:flex items-start gap-2 bg-white text-gray-800 text-sm rounded-2xl rounded-br-sm shadow-xl border border-gray-100 px-4 py-3 max-w-[230px]">
            <span><b className="block text-gray-900">Need help?</b>Chat with our customer care on WhatsApp.</span>
            <button onClick={() => setTip(false)} aria-label="Close" className="text-gray-400 hover:text-gray-700 mt-0.5"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
      <a href={waLink(GREETING)} target="_blank" rel="noreferrer" aria-label="Chat with RiskTech on WhatsApp"
        className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_10px_30px_-6px_rgba(37,211,102,0.6)] hover:scale-105 active:scale-95 transition-transform">
                <WhatsAppIcon size={30} className="relative" />
      </a>
    </div>
  );
};

export default WhatsAppButton;
