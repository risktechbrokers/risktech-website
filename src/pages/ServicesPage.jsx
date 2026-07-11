import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, CheckCircle, Users, ChevronRight, Search, ShieldCheck } from "lucide-react";
import { SERVICES, CATEGORIES } from "../data/services";

// ── Service Detail Modal ─────────────────────────────────────
const ServiceModal = ({ service, onClose, onContact }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!service) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`${service.title} details`}
        style={{ background: "rgba(0,0,0,0.80)" }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="bg-white w-full sm:max-w-2xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col rounded-t-3xl"
        >
          {/* Hero image, with a branded fallback matching the service's own colour if the photo fails */}
          <div className={`relative h-48 sm:h-64 flex-shrink-0 overflow-hidden bg-gradient-to-br ${service.color}`}>
            <img src={service.heroImage} alt={service.title} className="w-full h-full object-cover relative z-10"
            onError={e => { e.target.style.display="none"; }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck size={64} className="text-white/20" strokeWidth={1.5} />
            </div>
            <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-20`} />
            <div className={`absolute inset-0 bg-gradient-to-r ${service.color} opacity-40 z-20`} />
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <X size={18} />
            </button>
            {/* Category badge */}
            <div className="absolute top-4 left-4">
              <span className="bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
                {service.category}
              </span>
            </div>
            {/* Title */}
            <div className="absolute bottom-4 left-5 right-16">
              <h2 className="text-white font-bold text-xl sm:text-2xl leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                {service.title}
              </h2>
              <p className="text-white/80 text-sm mt-1 italic">{service.tagline}</p>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 p-5 sm:p-7">
            {/* Description */}
            <p className="text-gray-700 leading-relaxed mb-6 text-base">{service.description}</p>

            {/* What it covers */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${service.color} flex items-center justify-center`}>
                  <CheckCircle size={11} className="text-white" />
                </div>
                What This Policy Covers
              </h3>
              <div className="space-y-2">
                {service.covers.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle size={15} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="mb-6 bg-gray-50 rounded-2xl p-4">
              <h3 className="font-bold text-gray-900 text-base mb-3">Key Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {service.benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: service.accent }} />
                    <span className="text-gray-600 text-sm">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ideal for */}
            <div className="mb-6 p-4 rounded-2xl border" style={{ borderColor: service.accent + "33", background: service.accent + "08" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: service.accent }}>
                Ideal For
              </p>
              <p className="text-gray-700 text-sm font-medium">{service.ideal}</p>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <button
              onClick={onContact}
              className="flex-1 text-white font-bold py-3.5 rounded-xl transition-all hover:opacity-90 hover:shadow-lg text-base"
              style={{ background: `linear-gradient(135deg, ${service.accent}, ${service.accent}dd)` }}
            >
              Get a Quote
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors text-base"
            >
              Back
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Service Card ─────────────────────────────────────────────
const ServiceCard = ({ service, onClick, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.4) }}
    onClick={onClick}
    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-gray-100"
  >
    {/* Image, with a branded category fallback if the photo fails to load */}
    <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${service.color}`}>
      <img
        src={service.image}
        alt={service.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 relative z-10"
        loading="lazy"
        onError={e => { e.target.style.display = "none"; }}
      />
      {/* Branded fallback content, sits behind the image, shows automatically if the image fails */}
      <div className="absolute inset-0 flex items-center justify-center">
        <ShieldCheck size={44} className="text-white/25" strokeWidth={1.5} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-20" />
      <div className="absolute top-3 left-3 z-20">
        <span className={`bg-gradient-to-r ${service.color} text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm`}>
          {service.category}
        </span>
      </div>
    </div>
    {/* Content */}
    <div className="p-5">
      <h3 className="font-bold text-gray-900 text-base mb-2 group-hover:text-blue-700 transition-colors leading-tight">
        {service.title}
      </h3>
      <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{service.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Users size={12} /> {service.ideal.split(",")[0]}
        </span>
        <span className="flex items-center gap-1 font-semibold text-sm transition-all group-hover:gap-2" style={{ color: service.accent }}>
          Details <ChevronRight size={14} />
        </span>
      </div>
    </div>
  </motion.div>
);

// ── Main Services Page ───────────────────────────────────────
const ServicesPage = ({ navigate, onGetQuote }) => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedService, setSelectedService] = useState(null);

  const filtered = SERVICES.filter(s => {
    const matchCat = activeCategory === "All" || s.category === activeCategory;
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleContact = (serviceTitle = "") => {
    setSelectedService(null);
    if (onGetQuote && serviceTitle) {
      onGetQuote(serviceTitle);
    } else {
      navigate("home");
      setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 300);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #93C5FD 0%, transparent 50%), radial-gradient(circle at 80% 50%, #60A5FA 0%, transparent 50%)" }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <button
            onClick={() => navigate("home")}
            className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors mb-8 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>
          <span className="text-blue-300 text-xs font-semibold tracking-widest uppercase">RiskTech Insurance Brokers</span>
          <h1 className="text-3xl md:text-5xl font-bold mt-2 mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Our Products & Services
          </h1>
          <p className="text-blue-200 max-w-2xl text-base md:text-lg leading-relaxed">
            Over 30 insurance products across all classes. Click any product to see full details, what it covers and benefits.
          </p>
          {/* Search */}
          <div className="relative mt-8 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-blue-300 focus:outline-none focus:border-blue-300 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSearch(""); }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-blue-700 text-white shadow-md shadow-blue-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No products found for "{search}"</p>
            <button onClick={() => { setSearch(""); setActiveCategory("All"); }} className="mt-4 text-blue-600 font-semibold hover:underline">
              Clear search
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6 font-medium">
              Showing <span className="text-gray-900 font-bold">{filtered.length}</span> products
              {activeCategory !== "All" && <> in <span className="text-blue-700 font-bold">{activeCategory}</span></>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((service, i) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  index={i}
                  onClick={() => setSelectedService(service)}
                />
              ))}
            </div>
          </>
        )}

        {/* CTA Banner */}
        <div className="mt-16 bg-blue-700 rounded-3xl p-8 md:p-12 text-center text-white">
          <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Can't Find What You're Looking For?
          </h3>
          <p className="text-blue-200 mb-6 max-w-lg mx-auto">
            We have access to specialist products for every risk. Speak with one of our licensed brokers for a custom solution.
          </p>
          <button
            onClick={() => handleContact("")}
            className="bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-all hover:shadow-lg inline-flex items-center gap-2"
          >
            Speak to a Broker <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <ServiceModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onContact={() => handleContact(selectedService.title)}
        />
      )}
    </div>
  );
};

export default ServicesPage;
