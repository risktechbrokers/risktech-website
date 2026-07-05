import { motion } from "framer-motion";
import { ArrowLeft, Shield, Target, Award, Users, CheckCircle, MapPin, Phone, Mail, Star, Download } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

const LEADERSHIP = [
  {
    name: "Olowosuna-Davies Adamoh Yetunde",
    role: "Chairman",
    initials: "OY",
    color: "from-blue-700 to-blue-500",
    bio: "A seasoned business woman and civil servant with a Higher National Diploma in Business Administration from Lagos State Polytechnic. A Chartered Member of the Institute of Public Service of Nigeria with over 25 years of public service experience in Lagos State. She brings extensive experience in large-scale distribution and business management.",
  },
  {
    name: "Taiwo Morufat Abosede",
    role: "Director",
    initials: "TM",
    color: "from-rose-600 to-pink-500",
    bio: "A graduate of Banking & Finance from Ekiti State University, Ado-Ekiti (2016) and a Senior Financial Advisor at Consolidated Hallmark Insurance. She brings 12 years as Sales Manager at Abimbola & Sons Bakery and 5 years in Business Development, with a proven track record of turning businesses around for higher productivity and profitability. She oversees leadership, administration and business development.",
  },
  {
    name: "Olowosuna Fathiu Olatubosun",
    role: "Head of Information Technology",
    initials: "OF",
    color: "from-emerald-600 to-teal-500",
    bio: "A technology professional based in Lagos, Nigeria, working across web development, mobile apps, cybersecurity, and digital product design. As Head of IT, he built and manages RiskTech's entire digital presence, from the company website to its online forms and automated systems, giving clients a smooth experience from anywhere in the world.",
  },
];

const SERVICES_LIST = [
  "Insurance Broking across all classes",
  "Claims Administration and Recovery Services",
  "Risk Management Services",
  "Risk Consultancy Services",
  "Staff and Client Training",
];

const OBJECTIVES = [
  "Provide insurance needs to consumers across all sectors and geographies",
  "Employ young, dynamic, motivated and professionally trained individuals",
  "Build a reasonable clientele base of corporate entities and high-net-worth individuals",
  "Pursue a culture of customer intimacy and meritocracy that creates a spirit of partnership",
  "Earn satisfactory returns on assets and investments within the corridor of safety",
];

const CompanyProfilePage = ({ navigate }) => (
  <div className="min-h-screen bg-white">

    {/* ── HERO BANNER ── */}
    <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, rgba(59,130,246,0.3) 0%, transparent 60%)", backgroundSize: "cover" }} />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative z-10">
        <button onClick={() => navigate("home")} className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors mb-6 text-sm font-medium">
          <ArrowLeft size={16} /> Back to Home
        </button>

        {/* Download Company Profile */}
        <div className="flex flex-wrap gap-3 mb-10">
          <a href="/RiskTech_Company_Profile.pdf" download="RiskTech_Company_Profile.pdf"
            className="flex items-center gap-2 bg-white text-blue-900 font-bold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all hover:shadow-lg text-sm">
            <Download size={16}/> Download PDF
          </a>
        </div>

        <div className="flex flex-col lg:flex-row items-start gap-12">
          <div className="flex-1">
            <span className="text-blue-300 text-xs font-semibold tracking-widest uppercase">NAICOM Licence No. 1271</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3 mb-6 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              RiskTech Insurance<br /><span className="text-blue-300">Brokers Limited</span>
            </h1>
            <p className="text-blue-100 text-base md:text-lg leading-relaxed max-w-xl mb-8">
              A professionally registered insurance brokerage firm incorporated in July 2024, headquartered in Lagos, Nigeria, serving clients locally and internationally. We connect individuals and businesses with the right insurance solutions across all classes.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-sm font-semibold">🏛️ CAC Registered</div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-sm font-semibold">🏆 NAICOM Licensed</div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-sm font-semibold">📋 NCRIB Member</div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-sm font-semibold">⚡ Est. 2024</div>
            </div>
          </div>

          {/* Key Stats */}
          <div className="w-full lg:w-80 grid grid-cols-2 gap-4">
            {[
              { icon: Award, label: "NAICOM Licence", value: "No. 1271" },
              { icon: Shield, label: "Insurance Classes", value: "30+" },
              { icon: Target, label: "Valid Until", value: "Apr 2031" },
              { icon: Users, label: "Client Focus", value: "100%" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/15">
                <Icon size={20} className="text-blue-300 mb-2" />
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-blue-300 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ── ABOUT THE COMPANY ── */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <span className="text-blue-600 text-xs font-semibold tracking-widest uppercase">About Us</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>
            Who We Are
          </h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              <strong className="text-gray-900">RiskTech Insurance Brokers Limited</strong> is a Limited Liability Company incorporated with an authorised share capital of ₦5,000,000. The company's major business is insurance broking, providing quality, effective and personalised service to insurance buyers across various sectors locally and internationally.
            </p>
            <p>
              Our duty is to provide tailor-made insurance policies for individuals and organisations by negotiating with insurance companies to secure reasonable rates, flexible terms and maximum cover, so our clients pay as little as possible for the best cover available.
            </p>
            <p>
              We are registered with the <strong>Corporate Affairs Commission (CAC)</strong>, licensed by the <strong>National Insurance Commission (NAICOM)</strong> under the Nigerian Insurance Industry Reform Act 2025 (Licence No. 1271, valid April 2026 – April 2031), and maintain professional indemnity cover of ₦10,000,000.
            </p>
          </div>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="space-y-4">
          {/* Range of Services */}
          <div className="bg-blue-50 rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <Shield size={18} className="text-blue-700" /> Range of Services
            </h3>
            <div className="space-y-2">
              {SERVICES_LIST.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle size={15} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Office */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 text-base mb-3">Our Office</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2"><MapPin size={14} className="text-blue-600 mt-0.5 flex-shrink-0" /><span>Block D, Shop 5, Abibat Mogaji Shopping Complex, Odo-Eran, Opposite Water Corporation, Ogba, Ikeja, Lagos State</span></div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-blue-600 flex-shrink-0" /><a href="tel:08067514506" className="hover:text-blue-600">08067514506</a></div>
              <div className="flex items-center gap-2"><Mail size={14} className="text-blue-600 flex-shrink-0" /><a href="mailto:risktechbrokers@gmail.com" className="hover:text-blue-600">risktechbrokers@gmail.com</a></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── MISSION & VISION ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="bg-blue-700 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-blue-600 opacity-30 -translate-y-1/2 translate-x-1/2" />
          <Target size={32} className="text-blue-300 mb-4 relative z-10" />
          <h3 className="font-bold text-2xl mb-4 relative z-10" style={{ fontFamily: "'Playfair Display', serif" }}>Our Mission</h3>
          <p className="text-blue-100 leading-relaxed relative z-10">
            To provide comprehensive insurance solutions tailored to the needs of businesses and individuals worldwide, becoming a trusted partner in risk management through practical products, excellent customer service, and expert advice.
          </p>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-gray-800 opacity-50 -translate-y-1/2 translate-x-1/2" />
          <Star size={32} className="text-amber-400 mb-4 relative z-10" />
          <h3 className="font-bold text-2xl mb-4 relative z-10" style={{ fontFamily: "'Playfair Display', serif" }}>Our Vision</h3>
          <p className="text-gray-300 leading-relaxed relative z-10">
            To emerge as a leading player in the global insurance brokerage market, known for our integrity, reliability, and commitment to client satisfaction, using technology to improve service delivery and ensure efficiency for all our clients and partners.
          </p>
        </motion.div>
      </div>

      {/* ── OBJECTIVES ── */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mb-20">
        <div className="text-center mb-10">
          <span className="text-blue-600 text-xs font-semibold tracking-widest uppercase">What We Stand For</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>Our Objectives</h2>
          <div className="w-12 h-1 bg-blue-700 mx-auto mt-3 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {OBJECTIVES.map((obj, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">{i + 1}</div>
              <p className="text-gray-700 text-sm leading-relaxed">{obj}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── LEADERSHIP TEAM ── */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mb-20">
        <div className="text-center mb-10">
          <span className="text-blue-600 text-xs font-semibold tracking-widest uppercase">Our People</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>Leadership Team</h2>
          <div className="w-12 h-1 bg-blue-700 mx-auto mt-3 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LEADERSHIP.map((member, i) => (
            <motion.div key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-5 mb-5">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <span className="text-white font-bold text-xl">{member.initials}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{member.name}</h3>
                  <p className="text-blue-600 font-semibold text-sm mt-1">{member.role}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── CTA ── */}
      <div className="bg-blue-700 rounded-3xl p-8 md:p-12 text-center text-white">
        <h3 className="text-2xl md:text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Ready to Work with RiskTech?
        </h3>
        <p className="text-blue-200 mb-6 max-w-lg mx-auto">
          Let our licensed brokers find the right insurance solution for you. No pressure, just honest, expert advice.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => { navigate("home"); setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 300); }}
            className="bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl hover:bg-blue-50 transition-all hover:shadow-lg"
          >
            Contact Us Today
          </button>
          <button
            onClick={() => navigate("services")}
            className="bg-white/15 border border-white/30 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/25 transition-all"
          >
            View Our Products
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default CompanyProfilePage;
