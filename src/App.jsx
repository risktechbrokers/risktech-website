import { useState, useCallback, lazy, Suspense } from "react";
import IntroOverlay from "./components/IntroOverlay";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import ServicesSection from "./components/ServicesSection";
import AboutSection from "./components/AboutSection";
import TrustSection from "./components/TrustSection";
import AdSection from "./components/AdSection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";

const ServicesPage      = lazy(() => import("./pages/ServicesPage"));
const CompanyProfilePage= lazy(() => import("./pages/CompanyProfilePage"));
const ClaimsPage        = lazy(() => import("./pages/ClaimsPage"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0B1F4B]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full" style={{border:"3px solid rgba(100,160,255,0.15)",borderTopColor:"#60a5fa",animation:"spin 0.7s linear infinite"}}/>
      <p className="text-blue-300/60 text-sm tracking-wide">Loading...</p>
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// Show intro overlay only once per browser session
const hasSeenIntro = () => {
  try { return !!sessionStorage.getItem("rt_intro_seen"); } catch { return false; }
};
const markIntroSeen = () => {
  try { sessionStorage.setItem("rt_intro_seen", "1"); } catch {}
};

function App() {
  const [currentPage, setCurrentPage]         = useState("home");
  const [selectedService, setSelectedService] = useState("");
  const [showOverlay, setShowOverlay]         = useState(!hasSeenIntro());

  const navigate = useCallback((page, serviceType = "") => {
    setCurrentPage(page);
    if (serviceType) setSelectedService(serviceType);
    else if (page !== "home") setSelectedService("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleGetQuote = useCallback((serviceTitle) => {
    setSelectedService(serviceTitle);
    setCurrentPage("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    }, 400);
  }, []);

  const handleOverlayComplete = useCallback(() => {
    markIntroSeen();
    setShowOverlay(false);
  }, []);

  return (
    <div className="min-h-screen">
      {showOverlay && <IntroOverlay onComplete={handleOverlayComplete} />}
      <div>
        <Navbar navigate={navigate} currentPage={currentPage} />

        {currentPage === "services" && (
          <main className="pt-16">
            <Suspense fallback={<PageLoader/>}>
              <ServicesPage navigate={navigate} onGetQuote={handleGetQuote} />
            </Suspense>
            <Footer navigate={navigate} />
          </main>
        )}

        {currentPage === "company-profile" && (
          <main className="pt-16">
            <Suspense fallback={<PageLoader/>}>
              <CompanyProfilePage navigate={navigate} />
            </Suspense>
            <Footer navigate={navigate} />
          </main>
        )}

        {currentPage === "claims" && (
          <main className="pt-16">
            <Suspense fallback={<PageLoader/>}>
              <ClaimsPage navigate={navigate} />
            </Suspense>
            <Footer navigate={navigate} />
          </main>
        )}

        {currentPage === "home" && (
          <main>
            <HeroSection navigate={navigate} />
            <ServicesSection navigate={navigate} />
            <AboutSection />
            <TrustSection />
            <AdSection />
            <ContactSection preselectedService={selectedService} />
            <Footer navigate={navigate} />
          </main>
        )}
      </div>
    </div>
  );
}

export default App;
