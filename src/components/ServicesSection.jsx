import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Users, Home, Ship, Tractor } from "lucide-react";

const PREVIEW = [
  { icon: Shield, label: "Motor Insurance", color: "bg-blue-100 text-blue-700", desc: "Comprehensive cover for all vehicle types" },
  { icon: Zap, label: "Health & Life", color: "bg-rose-100 text-rose-700", desc: "Healthcare and life protection plans" },
  { icon: Home, label: "Property", color: "bg-violet-100 text-violet-700", desc: "Homeowner, fire and burglary cover" },
  { icon: Users, label: "Business & Liability", color: "bg-amber-100 text-amber-700", desc: "Protect your enterprise and workforce" },
  { icon: Ship, label: "Marine", color: "bg-cyan-100 text-cyan-700", desc: "Cargo and hull insurance at sea" },
  { icon: Tractor, label: "Agricultural", color: "bg-lime-100 text-lime-700", desc: "Protecting farms and agribusinesses worldwide" },
];

const ServicesSection = ({ navigate }) => (
  <section id="services" className="section-padding bg-gray-50">
    <div className="max-w-7xl mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <span className="text-blue-600 text-sm font-semibold tracking-widest uppercase">What We Offer</span>
        <h2 className="text-gray-900 text-3xl md:text-4xl font-bold mt-3 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          Over 30 Insurance Products
        </h2>
        <div className="w-16 h-1 bg-blue-700 mx-auto rounded-full mb-5" />
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed text-base">
          As NAICOM-licensed brokers, we connect you to the best coverage across all insurance classes, negotiating the most suitable policy at the most competitive rate.
        </p>
      </motion.div>

      {/* Preview grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
        {PREVIEW.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              onClick={() => navigate("services")}
              className="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            >
              <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <Icon size={22} />
              </div>
              <p className="font-bold text-gray-900 text-sm leading-tight mb-1">{item.label}</p>
              <p className="text-gray-400 text-xs leading-relaxed hidden sm:block">{item.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Big CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #60A5FA 0%, transparent 60%), radial-gradient(circle at 70% 50%, #93C5FD 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <p className="text-blue-300 text-sm font-semibold tracking-widest uppercase mb-3">30+ Products Available</p>
          <h3 className="text-white text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Explore Our Complete Products & Services Catalogue
          </h3>
          <p className="text-blue-200 max-w-xl mx-auto mb-8 leading-relaxed">
            From motor to marine, health to Takaful, engineering to agric: view all our insurance products with full details, benefits and coverage information.
          </p>
          <button
            onClick={() => navigate("services")}
            className="group bg-white text-blue-900 font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 inline-flex items-center gap-2 text-base"
          >
            View All Products & Services
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>

    </div>
  </section>
);

export default ServicesSection;
