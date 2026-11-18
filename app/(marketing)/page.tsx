import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  ORGANIZATION_ID,
  SITE_URL,
  organizationJsonLd,
  pageMetadata,
} from "@/lib/seo";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { LogoBar } from "./components/LogoBar";
import { Features } from "./components/Features";
import { HowItWorks } from "./components/HowItWorks";
import { Metrics } from "./components/Metrics";
import { Pricing } from "./components/Pricing";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return pageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    lang: await getLocale(),
  });
}

// Datos para buscadores y herramientas que leen la web: quien es Tourfy, de
// donde es, a quien atiende y que hace el producto.
const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationJsonLd,
    {
      "@type": "SoftwareApplication",
      name: "Tourfy",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Responde el WhatsApp de agencias de tours en Costa Rica en español e inglés.",
      publisher: { "@id": ORGANIZATION_ID },
      // TODO: agregar `offers` (precio de los planes) cuando se defina que
      // precio publicar. Sin `offers` Google no muestra el rich result de
      // software, pero el marcado sigue siendo valido.
    },
  ],
};

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <JsonLd data={homeJsonLd} />
      <Navbar />
      <Hero />
      <LogoBar />
      <Features />
      <HowItWorks />
      <Metrics />
      {/* Planes Starter y Pro (CODE-208). */}
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
