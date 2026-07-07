import { motion } from "framer-motion";
import { Shield, Target, Award, Users, CheckCircle } from "lucide-react";

const stats = [
  { value: "2024", label: "Year Incorporated",   icon: Target },
  { value: "1271", label: "NAICOM Licence No.",   icon: Award },
  { value: "11+",  label: "Insurance Classes",    icon: Shield },
  { value: "100%", label: "Client Focused",       icon: Users },
];

const values = [
  { title: "Transparency",   desc: "We explain every policy clearly, with no hidden terms or surprises." },
  { title: "Expertise",      desc: "Deep knowledge of the global insurance market and all product classes." },
  { title: "Advocacy",       desc: "We represent you, not the insurance company, always." },
  { title: "Professionalism",desc: "Highest ethical standards in line with NAICOM regulations and CIIN guidelines." },
  { title: "Innovation",     desc: "We leverage technology to make insurance accessible and streamlined." },
  { title: "Reliability",    desc: "We are here when you need us most, especially at claims time." },
];

const team = [
  {
    name: "Olowosuna-Davies Adamoh Yetunde",
    role: "Chairman",
    bio: "A business woman and civil servant with a Higher National Diploma in Business Administration from Lagos State Polytechnic. A Chartered Member of the Institute of Public Service of Nigeria with over 25 years of public service experience in Lagos State.",
  },
  {
    name: "Taiwo Morufat Abosede",
    role: "Director",
    bio: "A graduate of Banking & Finance from Ekiti State University (2016) and a Senior Financial Advisor at Consolidated Hallmark Insurance. She brings 12 years as Sales Manager at Abimbola & Sons Bakery and 5 years in Business Development, with a strong track record of turning businesses around for higher productivity.",
  },
  {
    name: "Olowosuna Fathiu Olatubosun",
    role: "Head of Information Technology",
    bio: "A technology professional based in Lagos, Nigeria, working across web development, mobile apps, cybersecurity, and digital product design. As Head of IT, he built and manages RiskTech's entire digital presence, from the company website to its online forms and automated systems.",
  },
];

const AboutSection = () => {
  return (
    <section id="about" className="section-padding bg-white">
      <div className="max-w-7xl mx-auto">

        {/* ── TWO COLUMN: TEXT + STATS ── */}
        <div className="flex flex-col lg:flex-row gap-16 items-center mb-20">

          {/* LEFT: Text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex-1"
          >
            <span className="text-blue-600 text-sm font-semibold tracking-widest uppercase">About Us</span>
            <h2
              className="text-gray-900 text-3xl md:text-4xl font-bold mt-3 mb-4 leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Your Trusted Insurance
              <br /><span className="text-blue-700">Partner Wherever You Are</span>
            </h2>
            <div className="w-16 h-1 bg-blue-700 rounded-full mb-6" />

            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                <strong className="text-gray-900">RiskTech Insurance Brokers Limited</strong> is
                a professionally registered insurance brokerage firm incorporated in July 2024,
                based in Lagos, Nigeria, serving clients locally and internationally. We connect individuals, families, and businesses
                connecting them with the right insurance solutions from leading insurance companies
                across Nigeria.
              </p>
              <p>
                Our mission is to provide comprehensive, tailor-made insurance solutions to
                businesses and individuals across Africa and beyond, negotiating with insurers to secure
                the most reasonable rates, flexible terms and maximum cover for our clients.
                We act as your advocate, not the insurance company's.
              </p>
              <p>
                Our vision is to emerge as a leading player in the global insurance market,
                known for our integrity, reliability, and commitment to client satisfaction,
                while using technology to improve service delivery and streamline operations.
              </p>
              <p>
                We are fully licensed by the <strong className="text-gray-900">National Insurance
                Commission (NAICOM)</strong> under the Nigerian Insurance Industry Reform Act 2025,
                and our licence is active and in good standing.
              </p>
            </div>

            {/* Values grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {values.map((val) => (
                <div key={val.title} className="flex gap-3">
                  <CheckCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{val.title}</p>
                    <p className="text-gray-500 text-sm">{val.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-8 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              Speak with a Broker
            </button>
          </motion.div>

          {/* RIGHT: Stats */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-1 w-full"
          >
            <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, #93C5FD, transparent 70%)", transform: "translate(30%, -30%)" }} />

              <p className="text-blue-100 text-sm font-medium uppercase tracking-widest mb-2">
                Company at a Glance
              </p>
              <p className="text-white text-xs text-blue-200 mb-6 leading-relaxed">
                Registered with CAC • Licensed by NAICOM • Member of NCRIB
              </p>

              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-white border border-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Icon size={20} className="text-blue-200 mb-3" />
                      <p className="text-3xl font-bold">{stat.value}</p>
                      <p className="text-blue-100 text-xs mt-1">{stat.label}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Services range */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <p className="text-white font-semibold text-sm mb-3">Range of Services</p>
                <div className="space-y-1.5 text-blue-100 text-xs leading-relaxed">
                  {["Insurance Broking", "Claims Administration & Recovery", "Risk Management Services", "Risk Consultancy Services"].map(s => (
                    <div key={s} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-blue-300 rounded-full flex-shrink-0"/>
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-white/20 text-blue-100 text-xs leading-relaxed">
                <p className="font-semibold text-white text-sm mb-1">Our Office</p>
                Shop 41, Alakija Shopping Complex,<br />
                WAEC Street, Jibowu,<br />
                Yaba, Lagos.
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── MISSION & VISION STRIP ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20"
        >
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center mb-4">
              <Target size={20} className="text-white" />
            </div>
            <h3 className="text-gray-900 font-bold text-xl mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Our Mission</h3>
            <p className="text-gray-600 leading-relaxed">
              To provide comprehensive insurance solutions tailored to the needs of businesses
              and individuals worldwide, becoming a trusted partner in risk management
              through practical products, excellent customer service, and expert advice.
            </p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Shield size={20} className="text-white" />
            </div>
            <h3 className="text-white font-bold text-xl mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Our Vision</h3>
            <p className="text-gray-300 leading-relaxed">
              To emerge as a leading player in the global insurance brokerage market, known for our
              integrity, reliability, and commitment to client satisfaction, using
              technology to improve service delivery and ensure efficiency for all our clients and partners.
            </p>
          </div>
        </motion.div>

        {/* ── LEADERSHIP TEAM ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="text-blue-600 text-sm font-semibold tracking-widest uppercase">Our People</span>
          <h3 className="text-gray-900 text-2xl md:text-3xl font-bold mt-2 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Leadership Team
          </h3>
          <div className="w-12 h-1 bg-blue-700 mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Avatar placeholder */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl">
                    {member.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base leading-tight">{member.name}</p>
                  <p className="text-blue-600 text-sm font-semibold mt-0.5">{member.role}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{member.bio}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default AboutSection;
