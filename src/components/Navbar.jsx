import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const RisktechLogoMark = ({ navigate }) => (
  <button onClick={() => navigate("home")} className="bg-transparent border-0 p-0 cursor-pointer flex items-center flex-shrink-0">
    <img
      src="/risktech_logo.png"
      alt="RiskTech Insurance Brokers Limited"
      width={116}
      height={90}
      className="h-14 sm:h-20 w-auto max-w-[240px] sm:max-w-[320px]"
      style={{ aspectRatio:"868 / 673", objectFit:"contain", display:"block",
        filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}
    />
  </button>
);

const Navbar = ({ navigate, currentPage }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [currentPage]);

  const isHome     = currentPage === "home";
  const isServices = currentPage === "services";
  const isProfile  = currentPage === "company-profile";

  const scrollTo = (id) => {
    if (!isHome) { navigate("home"); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 400); }
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const navBg = scrolled || !isHome ? "bg-[#0B1F4B] shadow-lg" : "bg-transparent";

  const NAV_LINKS = [
    { label: "Home",            action: () => scrollTo("home") },
    { label: "Services",        action: () => navigate("services"), active: isServices },
    { label: "About",           action: () => scrollTo("about") },
    { label: "Why Us",          action: () => scrollTo("trust") },
    { label: "Company Profile", action: () => navigate("company-profile"), active: isProfile },
    { label: "Contact",         action: () => scrollTo("contact") },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">

          {/* Logo */}
          <RisktechLogoMark navigate={navigate} />

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <button
                key={link.label}
                onClick={link.action}
                className={`text-sm font-semibold transition-colors ${
                  link.highlight
                    ? "bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg"
                    : link.active
                    ? "text-blue-600 font-bold"
                    : link.label === "Company Profile"
                    ? "bg-white/15 text-white px-3 py-1.5 rounded-lg hover:bg-white/25 border border-white/20"
                    : "text-white hover:text-blue-200"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Make a Claim — top right, orange */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("claims")}
              className="hidden sm:flex bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all hover:shadow-lg items-center gap-2"
            >
              Make a Claim
            </button>
            <button
              onClick={() => setMenuOpen(p => !p)}
              className="lg:hidden p-2 rounded-lg transition-colors text-white hover:bg-white/10"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden bg-[#0B1F4B] border-t border-white/10 shadow-xl overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map(link => (
                <button
                  key={link.label}
                  onClick={link.action}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${link.active ? "bg-white/15 text-blue-200" : "text-white hover:bg-white/10"}`}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => { navigate("claims"); setMenuOpen(false); }}
                className="w-full mt-2 bg-orange-500 text-white font-bold py-3.5 rounded-xl text-sm hover:bg-orange-600 transition-colors"
              >
                Make a Claim
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
