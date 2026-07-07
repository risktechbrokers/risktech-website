// ============================================================
// FOOTER COMPONENT
// The bottom of the website. Contains:
// - Company branding & brief description
// - Quick navigation links
// - Service categories
// - Contact info
// - Copyright bar
// ============================================================

import { Phone, Mail, MapPin, ArrowRight, ShieldCheck } from "lucide-react";

const Footer = ({ navigate = () => {} }) => {
  const currentYear = new Date().getFullYear();

  const scrollTo = (id) => {
    navigate("home");
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 400);
  };

  const quickLinks = [
    { label: "Home",            action: () => scrollTo("home") },
    { label: "Our Services",    action: () => navigate("services") },
    { label: "About Us",        action: () => scrollTo("about") },
    { label: "Company Profile", action: () => navigate("company-profile") },
    { label: "Why RiskTech",    action: () => scrollTo("trust") },
    { label: "Make a Claim",    action: () => navigate("claims") },
    { label: "Contact Us",      action: () => scrollTo("contact") },
  ];

  // Real category groupings from the product catalogue, not a random subset of individual products
  const serviceCategories = [
    "Motor & Transport",
    "Property & Fire",
    "Marine & Logistics",
    "Health & Life",
    "Business & Liability",
    "Engineering & Special Risks",
  ];

  return (
    <footer className="bg-[#0B1F4B] text-white">

      {/* ---- MAIN FOOTER CONTENT ---- */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* ---- COLUMN 1: BRAND ---- */}
          <div className="lg:col-span-1">
            {/* Logo, standing alone, no box */}
            <img
              src="/risktech_logo.png"
              alt="RiskTech Insurance Brokers Limited"
              width={103}
              height={80}
              className="mb-5"
              style={{ height: 80, width: 103, aspectRatio: "868 / 673", objectFit: "contain", display: "block" }}
            />

            <p className="text-blue-200/70 text-sm leading-relaxed mb-5">
              Your trusted insurance brokerage partner serving clients locally and internationally.
              We connect individuals and businesses with the right coverage worldwide.
            </p>

            {/* NAICOM badge in footer */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-blue-200 text-xs px-3 py-2 rounded-lg">
              <ShieldCheck size={13} />
              NAICOM Licensed &middot; No. 1271
            </div>
          </div>

          {/* ---- COLUMN 2: QUICK LINKS ---- */}
          <div>
            <p className="text-white font-bold text-base mb-5">Quick Links</p>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={link.action}
                    className="text-blue-200/70 hover:text-white text-sm transition-colors hover:translate-x-1 inline-block"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- COLUMN 3: SERVICE CATEGORIES ---- */}
          <div>
            <p className="text-white font-bold text-base mb-5">Our Services</p>
            <ul className="space-y-3">
              {serviceCategories.map((category) => (
                <li key={category}>
                  <button
                    onClick={() => navigate("services")}
                    className="text-blue-200/70 hover:text-white text-sm transition-colors hover:translate-x-1 inline-block"
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("services")}
              className="mt-4 inline-flex items-center gap-1.5 text-blue-300 hover:text-white text-sm font-semibold transition-colors"
            >
              View All 30+ Products <ArrowRight size={14} />
            </button>
          </div>

          {/* ---- COLUMN 4: CONTACT DETAILS ---- */}
          <div>
            <p className="text-white font-bold text-base mb-5">Contact</p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Phone size={15} className="text-blue-300 mt-0.5 flex-shrink-0" />
                <a href="tel:08067514506" className="text-blue-200/70 hover:text-white text-sm transition-colors">
                  08067514506
                </a>
              </div>
              <div className="flex gap-3">
                <Mail size={15} className="text-blue-300 mt-0.5 flex-shrink-0" />
                <a href="mailto:risktechbrokers@gmail.com" className="text-blue-200/70 hover:text-white text-sm transition-colors break-all">
                  risktechbrokers@gmail.com
                </a>
              </div>
              <div className="flex gap-3">
                <MapPin size={15} className="text-blue-300 mt-1 flex-shrink-0" />
                <p className="text-blue-200/70 text-sm leading-relaxed">
                  Shop 41, Alakija Shopping Complex,
                  WAEC Street, Jibowu, Yaba, Lagos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- BOTTOM COPYRIGHT BAR ---- */}
      <div className="border-t border-white/10 px-6 md:px-24 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-blue-200/50 text-xs">
          <p>
            © {currentYear} RiskTech Insurance Brokers Limited. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Licensed under the Nigerian Insurance Industry Reform Act 2025
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
