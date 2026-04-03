"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type Locale = "en" | "es";

interface I18nContextValue {
  locale: Locale;
  t: (key: string) => string;
  toggle: () => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: (k) => k,
  toggle: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  const toggle = useCallback(() => {
    setLocale((prev) => (prev === "en" ? "es" : "en"));
  }, []);

  const t = useCallback(
    (key: string) => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[locale] ?? key;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, t, toggle }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

/* ── Translations ── */
const translations: Record<string, Record<Locale, string>> = {
  // Navbar
  "nav.features": { en: "Features", es: "Funciones" },
  "nav.howItWorks": { en: "How it works", es: "Cómo funciona" },
  "nav.results": { en: "Results", es: "Resultados" },
  "nav.login": { en: "Log in", es: "Iniciar sesión" },
  "nav.cta": { en: "Start free", es: "Empezar gratis" },

  // Hero
  "hero.headline1": { en: "Your tours sell", es: "Tus tours se venden" },
  "hero.headline2": { en: "themselves at", es: "solos a las" },
  "hero.headline3": { en: "2\u00a0AM", es: "2\u00a0AM" },
  "hero.sub": {
    en: "WhatsApp bots that answer, qualify, and book — trained on your tours, your prices, your voice. No leads lost to sleep.",
    es: "Bots de WhatsApp que responden, califican y reservan — entrenados con tus tours, tus precios, tu voz. Ningún lead perdido mientras duermes.",
  },
  "hero.ctaPrimary": { en: "Start free trial", es: "Prueba gratis" },
  "hero.ctaSecondary": { en: "See how it works", es: "Ver cómo funciona" },
  "hero.trust": {
    en: "Free 14-day trial · No credit card · Setup in 10 min",
    es: "14 días gratis · Sin tarjeta · Configura en 10 min",
  },

  // LogoBar
  "logos.title": {
    en: "Trusted by agencies across Latin America",
    es: "Agencias en toda Latinoamérica confían en nosotros",
  },

  // Features
  "features.label": { en: "Features", es: "Funciones" },
  "features.title": {
    en: "Everything your agency needs to never miss a lead",
    es: "Todo lo que tu agencia necesita para no perder un solo lead",
  },
  "features.sub": {
    en: "A WhatsApp bot that knows your tours inside out, a live dashboard for your team, and the metrics that prove ROI.",
    es: "Un bot de WhatsApp que conoce tus tours a fondo, un dashboard en vivo para tu equipo, y las métricas que prueban el ROI.",
  },
  "features.0.title": {
    en: "AI that speaks your brand",
    es: "IA que habla como tu marca",
  },
  "features.0.desc": {
    en: "Train the bot on your specific tours, prices, FAQs, and tone of voice. It answers like your best agent — in Spanish, Portuguese, or English — 24 hours a day.",
    es: "Entrena al bot con tus tours, precios, FAQs y tono de voz. Responde como tu mejor agente — en español, portugués o inglés — las 24 horas.",
  },
  "features.1.title": {
    en: "Live agent takeover",
    es: "Toma de control en vivo",
  },
  "features.1.desc": {
    en: "One click to jump into any conversation. The bot pauses, you talk, then hand it back when you're done.",
    es: "Un clic para entrar a cualquier conversación. El bot se pausa, tú hablas, y lo devuelves cuando termines.",
  },
  "features.2.title": {
    en: "After-hours capture",
    es: "Captura fuera de horario",
  },
  "features.2.desc": {
    en: "60% of WhatsApp inquiries come outside business hours. The bot handles them all — no lead left behind.",
    es: "El 60% de las consultas por WhatsApp llegan fuera de horario. El bot las maneja todas — ningún lead se pierde.",
  },
  "features.3.title": {
    en: "Lead qualification",
    es: "Calificación de leads",
  },
  "features.3.desc": {
    en: "Automatically extract tour interest, group size, dates, and budget from conversations. See your pipeline at a glance.",
    es: "Extrae automáticamente interés, tamaño de grupo, fechas y presupuesto de las conversaciones. Ve tu pipeline de un vistazo.",
  },
  "features.4.title": { en: "ROI dashboard", es: "Dashboard de ROI" },
  "features.4.desc": {
    en: "Track leads captured, bookings attributed, and revenue generated — proof your investment is paying off.",
    es: "Rastrea leads capturados, reservas atribuidas e ingresos generados — prueba de que tu inversión rinde.",
  },

  // HowItWorks
  "how.label": { en: "How it works", es: "Cómo funciona" },
  "how.title1": { en: "Live in 10 minutes.", es: "En vivo en 10 minutos." },
  "how.title2": { en: "No code required.", es: "Sin código." },
  "how.0.title": { en: "Connect WhatsApp", es: "Conecta WhatsApp" },
  "how.0.desc": {
    en: "Link your Twilio-powered WhatsApp number. We handle the setup — just paste your credentials.",
    es: "Vincula tu número de WhatsApp con Twilio. Nosotros hacemos el setup — solo pega tus credenciales.",
  },
  "how.1.title": { en: "Train your bot", es: "Entrena tu bot" },
  "how.1.desc": {
    en: "Paste your tour descriptions, prices, and FAQs. The bot learns your catalog and answers accurately.",
    es: "Pega las descripciones de tus tours, precios y FAQs. El bot aprende tu catálogo y responde con precisión.",
  },
  "how.2.title": {
    en: "Watch leads roll in",
    es: "Mira cómo llegan los leads",
  },
  "how.2.desc": {
    en: "Open the dashboard. See every conversation, qualified lead, and booking — in real time.",
    es: "Abre el dashboard. Ve cada conversación, lead calificado y reserva — en tiempo real.",
  },

  // Metrics
  "metrics.label": { en: "Results", es: "Resultados" },
  "metrics.title": {
    en: "Numbers from real agencies",
    es: "Números de agencias reales",
  },
  "metrics.sub": {
    en: "Average results across our first cohort of LATAM tour operators.",
    es: "Resultados promedio de nuestra primera cohorte de operadores turísticos en LATAM.",
  },
  "metrics.0.label": {
    en: "Captured outside business hours vs. before",
    es: "Capturados fuera de horario vs. antes",
  },
  "metrics.0.unit": { en: "more leads", es: "más leads" },
  "metrics.1.label": {
    en: "Of bot-started conversations that convert to qualified leads",
    es: "De conversaciones iniciadas por el bot que convierten a leads calificados",
  },
  "metrics.1.unit": { en: "response rate", es: "tasa de respuesta" },
  "metrics.2.label": {
    en: "Average first-response time, day or night",
    es: "Tiempo promedio de primera respuesta, día o noche",
  },
  "metrics.2.unit": { en: "reply time", es: "tiempo de respuesta" },
  "metrics.3.label": {
    en: "Average incremental revenue per agency in first 90 days",
    es: "Ingreso incremental promedio por agencia en los primeros 90 días",
  },
  "metrics.3.unit": { en: "monthly revenue", es: "ingreso mensual" },
  "metrics.quote": {
    en: "\u201cWe used to lose 40% of inquiries that came in after 6 PM. Now the bot handles them and we wake up to qualified leads.\u201d",
    es: "\u201cPerdíamos el 40% de las consultas que llegaban después de las 6 PM. Ahora el bot las maneja y despertamos con leads calificados.\u201d",
  },

  // CTA
  "cta.title1": { en: "Stop losing leads", es: "Deja de perder leads" },
  "cta.title2": { en: "to your voicemail", es: "por tu buzón de voz" },
  "cta.sub": {
    en: "Your next customer is messaging you right now. Make sure someone — or some bot — answers.",
    es: "Tu próximo cliente te está escribiendo ahora. Asegúrate de que alguien — o algún bot — responda.",
  },
  "cta.button": { en: "Start free trial", es: "Prueba gratis" },
  "cta.note": {
    en: "14 days free · No credit card",
    es: "14 días gratis · Sin tarjeta",
  },

  // Pricing
  "pricing.label": { en: "Pricing", es: "Precios" },
  "pricing.title": {
    en: "Pick how hands-on you want us",
    es: "Elige qué tan involucrados nos quieres",
  },
  "pricing.sub": {
    en: "Start self-service or let us handle everything. All plans include the same powerful bot.",
    es: "Empieza por tu cuenta o deja que nos encarguemos de todo. Todos los planes incluyen el mismo bot.",
  },
  "pricing.month": { en: "mo", es: "mes" },
  "pricing.popular": { en: "Most popular", es: "Más popular" },

  // Tier 0 — DIY
  "pricing.0.badge": { en: "Self-service", es: "Autoservicio" },
  "pricing.0.name": { en: "Do It Yourself", es: "Do It Yourself" },
  "pricing.0.desc": {
    en: "You set it up, we give you the tools. Perfect for tech-savvy agencies.",
    es: "Tú lo configuras, te damos las herramientas. Ideal para agencias tech-savvy.",
  },
  "pricing.0.cta": { en: "Get started", es: "Empezar" },
  "pricing.0.f0": { en: "WhatsApp bot with your catalog", es: "Bot de WhatsApp con tu catálogo" },
  "pricing.0.f1": { en: "Live dashboard & conversations", es: "Dashboard en vivo y conversaciones" },
  "pricing.0.f2": { en: "Agent takeover chat", es: "Chat con toma de control" },
  "pricing.0.f3": { en: "Lead qualification", es: "Calificación de leads" },
  "pricing.0.f4": { en: "Email support", es: "Soporte por email" },

  // Tier 1 — DIFY
  "pricing.1.badge": { en: "Recommended", es: "Recomendado" },
  "pricing.1.name": { en: "Do It For You", es: "Do It For You" },
  "pricing.1.desc": {
    en: "We build and launch your bot. You just approve and go live.",
    es: "Nosotros armamos y lanzamos tu bot. Tú solo apruebas y sales en vivo.",
  },
  "pricing.1.setup": { en: "One-time setup", es: "Setup único" },
  "pricing.1.cta": { en: "Start free trial", es: "Prueba gratis" },
  "pricing.1.f0": { en: "Everything in Do It Yourself", es: "Todo lo de Do It Yourself" },
  "pricing.1.f1": { en: "Full bot setup & training by us", es: "Setup y entrenamiento del bot por nosotros" },
  "pricing.1.f2": { en: "Twilio & WhatsApp configuration", es: "Configuración de Twilio y WhatsApp" },
  "pricing.1.f3": { en: "Custom FAQ & tour catalog import", es: "Importación de FAQs y catálogo" },
  "pricing.1.f4": { en: "ROI dashboard", es: "Dashboard de ROI" },
  "pricing.1.f5": { en: "Priority support", es: "Soporte prioritario" },

  // Tier 2 — Done for you
  "pricing.2.badge": { en: "White glove", es: "Premium" },
  "pricing.2.name": { en: "Done For You", es: "Done For You" },
  "pricing.2.desc": {
    en: "Fully managed. We run your bot, optimize it, and report results weekly.",
    es: "100% administrado. Operamos tu bot, lo optimizamos y reportamos resultados cada semana.",
  },
  "pricing.2.price": { en: "Custom", es: "A medida" },
  "pricing.2.priceNote": {
    en: "Tailored to your agency's volume and needs",
    es: "Adaptado al volumen y necesidades de tu agencia",
  },
  "pricing.2.cta": { en: "Talk to us", es: "Hablemos" },
  "pricing.2.f0": { en: "Everything in Do It For You", es: "Todo lo de Do It For You" },
  "pricing.2.f1": { en: "Dedicated account manager", es: "Account manager dedicado" },
  "pricing.2.f2": { en: "Weekly optimization & reporting", es: "Optimización y reportes semanales" },
  "pricing.2.f3": { en: "Custom integrations", es: "Integraciones a la medida" },
  "pricing.2.f4": { en: "Multi-language bot training", es: "Entrenamiento multi-idioma" },
  "pricing.2.f5": { en: "SLA & phone support", es: "SLA y soporte telefónico" },

  // Footer
  "footer.tagline1": {
    en: "WhatsApp AI for tour agencies.",
    es: "IA de WhatsApp para agencias de turismo.",
  },
  "footer.tagline2": {
    en: "Built in LATAM, for LATAM.",
    es: "Hecho en LATAM, para LATAM.",
  },
  "footer.product": { en: "Product", es: "Producto" },
  "footer.company": { en: "Company", es: "Empresa" },
  "footer.legal": { en: "Legal", es: "Legal" },
  "footer.rights": {
    en: "TourGuide Inc. All rights reserved.",
    es: "TourGuide Inc. Todos los derechos reservados.",
  },
  "footer.status": {
    en: "All systems operational",
    es: "Todos los sistemas operativos",
  },
};
