import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { LogoBar } from "./components/LogoBar";
import { Features } from "./components/Features";
import { HowItWorks } from "./components/HowItWorks";
import { Metrics } from "./components/Metrics";
import { Pricing } from "./components/Pricing";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";

// Datos para buscadores y herramientas que leen la web: de donde es Tourfy y
// a quien atiende. Sin esto infieren el pais por los ejemplos del sitio.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Tourfy",
  url: "https://www.tourfy.app",
  description: "WhatsApp AI for tour agencies in Latin America.",
  address: { "@type": "PostalAddress", addressCountry: "CR" },
  areaServed: [
    { "@type": "Country", name: "Costa Rica" },
    { "@type": "Place", name: "Latin America" },
  ],
};

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
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
  );
}
