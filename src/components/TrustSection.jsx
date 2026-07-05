// ============================================================
// TRUST & LICENSING SECTION
// Highlights RiskTech's NAICOM licence, the most powerful
// credibility signal for an insurance company.
// This section directly addresses the visitor's #1 doubt:
// "Are these people legitimate?"
// ============================================================

import { motion } from "framer-motion";
import { BadgeCheck, ShieldCheck, Clock, FileText, Award } from "lucide-react";

const TrustSection = () => {
  return (
    <section id="trust" className="section-padding bg-gray-50">
      <div className="max-w-7xl mx-auto">

        {/* ---- SECTION HEADER ---- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-blue-600 text-sm font-semibold tracking-widest uppercase">
            Credentials & Licensing
          </span>
          <h2
            className="text-gray-900 text-3xl md:text-4xl font-bold mt-3 mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Fully Licensed & Regulated
          </h2>
          <div className="w-16 h-1 bg-blue-700 mx-auto rounded-full mb-5" />
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            We operate under the full authority and oversight of Nigeria's insurance
            regulatory body, so you can transact with complete confidence.
          </p>
        </motion.div>

        {/* ============ MAIN CONTENT: License Card + Supporting Info ============ */}
        <div className="flex flex-col lg:flex-row gap-10 items-stretch">

          {/* ---- NAICOM LICENCE CARD ---- */}
          {/* This is the hero of this section, styled like a certificate */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 max-w-lg mx-auto lg:mx-0"
          >
            <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100">

              {/* Card header: dark blue bar */}
              <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-8 py-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  {/* NAICOM text logo */}
                  <div>
                    <p className="text-blue-200 text-xs uppercase tracking-widest font-semibold">
                      Federal Republic of Nigeria
                    </p>
                    <p className="text-white font-bold text-sm mt-0.5">
                      National Insurance Commission
                    </p>
                  </div>
                  {/* Badge icon */}
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Award size={24} className="text-white" />
                  </div>
                </div>
                {/* Decorative divider */}
                <div className="border-t border-white/20 mt-4 pt-4">
                  <p className="text-blue-100 text-xs">
                    Official Certificate of Licence
                  </p>
                  <p className="text-white font-bold text-2xl mt-1">
                    Insurance Broker Licence
                  </p>
                </div>
              </div>

              {/* Card body: licence details */}
              <div className="px-8 py-6 space-y-5">

                {/* Licence Number, displayed prominently */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl px-6 py-4 text-center">
                  <p className="text-blue-500 text-xs font-semibold uppercase tracking-widest mb-1">
                    Licence Number
                  </p>
                  <p className="text-blue-900 font-bold text-4xl tracking-widest">
                    1271
                  </p>
                </div>

                {/* Licencee Name */}
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Licencee</p>
                  <p className="text-gray-900 font-bold text-lg">
                    Risktech Insurance Brokers Ltd
                  </p>
                </div>

                {/* Issue date only — duration/expiry kept private */}
                <div className="grid grid-cols-1 gap-4 text-center">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-[10px] uppercase tracking-wide">Issued</p>
                    <p className="text-gray-800 font-semibold text-sm mt-1">20/04/2026</p>
                  </div>
                </div>

                {/* Legislation */}
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Authority</p>
                  <p className="text-gray-700 text-sm">
                    Nigerian Insurance Industry Reform Act 2025
                  </p>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <BadgeCheck size={20} className="text-green-600 flex-shrink-0" />
                  <p className="text-green-700 font-semibold text-sm">
                    Licence Active & Valid
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ---- RIGHT SIDE: Supporting Trust Points ---- */}
          <div className="flex-1 flex flex-col gap-6 justify-center">

            {[
              {
                icon: ShieldCheck,
                color: "bg-blue-100 text-blue-700",
                title: "Regulatory Oversight",
                desc: "NAICOM regulates all insurance activities in Nigeria. Being licensed by them means we meet strict financial, ethical, and professional standards.",
              },
              {
                icon: FileText,
                color: "bg-amber-100 text-amber-700",
                title: "Registered with CAC",
                desc: "Risktech Insurance Brokers Limited is a fully incorporated limited liability company registered with the Corporate Affairs Commission (CAC), Nigeria.",
              },
              {
                icon: Clock,
                color: "bg-green-100 text-green-700",
                title: "5-Year Licence Validity",
                desc: "Our licence is valid from April 2026 through April 2031, giving clients the assurance of long-term, stable brokerage services.",
              },
              {
                icon: Award,
                color: "bg-purple-100 text-purple-700",
                title: "Professional Membership",
                desc: "Our CEO holds current registration and subscription with the Chartered Insurance Institute of Nigeria (CIIN), the body governing insurance professionals.",
              },
            ].map((point, i) => {
              const Icon = point.icon;
              return (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className={`w-11 h-11 rounded-xl ${point.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base mb-1">{point.title}</p>
                    <p className="text-gray-500 text-sm leading-relaxed">{point.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
