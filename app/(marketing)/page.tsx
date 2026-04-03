import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { LogoBar } from "./components/LogoBar";
import { Features } from "./components/Features";
import { HowItWorks } from "./components/HowItWorks";
import { Metrics } from "./components/Metrics";
import { Pricing } from "./components/Pricing";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";
import { I18nProvider } from "./components/i18n";

export default function LandingPage() {
  return (
    <I18nProvider>
      <main className="flex flex-col min-h-screen">
        <Navbar />
        <Hero />
        <LogoBar />
        <Features />
        <HowItWorks />
        <Metrics />
        <Pricing />
        <CTA />
        <Footer />
      </main>
    </I18nProvider>
  );
}
