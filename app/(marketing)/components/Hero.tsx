"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { FadeUp } from "./Motion";
import { Bubble, CheckIcon, Reveal, TypingDots } from "./PreviewBits";

type MockView = "conversations" | "tours" | "metrics";

export function Hero() {
  const t = useTranslations("hero");
  const [view, setView] = useState<MockView>("conversations");

  return (
    <section className="relative pt-24 pb-6 sm:pt-28 sm:pb-8 lg:pt-36 lg:pb-16 bg-white overflow-hidden">
      {/* Ilustracion de fondo — grabado del lago, volcan y catedral */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <Image
          src="/hero-illustration.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-bottom"
        />
        {/* Fade a blanco arriba para que el headline respire */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/30 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Headline */}
        <div className="mt-4 sm:mt-8 max-w-3xl mx-auto text-center">
          <FadeUp delay={0.1}>
            <h1 className="font-display text-[2.5rem] leading-[1.1] sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-navy-950 sm:leading-[1.05]">
              {t("headline1")}
              <br />
              {t("headline2")}{" "}
              <span className="relative inline-block">
                <span className="relative z-10">{t("headline3")}</span>
                <span
                  className="absolute bottom-0.5 sm:bottom-1 left-0 right-0 h-2.5 sm:h-3 bg-blue-400/20 rounded-sm -z-0"
                  aria-hidden
                />
              </span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="mt-5 sm:mt-6 text-base sm:text-lg lg:text-xl leading-relaxed text-slate-600 max-w-xl mx-auto">
              {t("sub")}
            </p>
          </FadeUp>

          {/* CTA row */}
          <FadeUp delay={0.3}>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <a
                href="/register"
                className="inline-flex h-11 sm:h-12 items-center justify-center rounded-xl bg-navy-900 px-6 text-sm font-bold text-white shadow-lg shadow-navy-900/25 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2"
              >
                {t("ctaPrimary")}
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="#how-it-works"
                className="inline-flex h-11 sm:h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-navy-900 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2"
              >
                {t("ctaSecondary")}
              </a>
            </div>
          </FadeUp>

          <FadeUp delay={0.35}>
            <p className="mt-3 sm:mt-4 text-xs text-slate-500">{t("trust")}</p>
          </FadeUp>
        </div>

        {/* Browser mockup */}
        <FadeUp delay={0.4} className="mt-10 sm:mt-14 lg:mt-20">
          <div className="browser-frame overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="browser-dots flex gap-1.5">
                <span />
                <span />
                <span />
              </div>
              <div className="flex-1 mx-2 sm:mx-3">
                <div className="mx-auto max-w-md h-5 sm:h-6 rounded-md bg-slate-100 flex items-center justify-center px-3">
                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium tracking-wide truncate">
                    {`app.tourfy.com/${view}`}
                  </span>
                </div>
              </div>
              <div className="w-8 sm:w-[52px]" />
            </div>

            {/* Preview area */}
            <div className="relative aspect-[16/10] sm:aspect-video bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="absolute inset-0">
                <DashboardSkeleton view={view} setView={setView} />
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function DashboardSkeleton({
  view,
  setView,
}: {
  view: MockView;
  setView: (v: MockView) => void;
}) {
  const tSide = useTranslations("dashboard.sidebar");
  const tConv = useTranslations("dashboard.conversations");
  const tTours = useTranslations("dashboard.tours");
  const tMetrics = useTranslations("dashboard.metrics");

  const navItems: { key: MockView | null; label: string; icon: string }[] = [
    { key: "conversations", label: tSide("conversations"), icon: NavIcons.chat },
    { key: "tours", label: tSide("tours"), icon: NavIcons.map },
    { key: "metrics", label: tSide("metrics"), icon: NavIcons.chart },
    { key: null, label: tSide("settings"), icon: NavIcons.gear },
  ];

  const titles: Record<MockView, string> = {
    conversations: tConv("title"),
    tours: tTours("title"),
    metrics: tMetrics("title"),
  };

  return (
    <div className="w-full h-full flex select-none text-left">
      {/* Sidebar */}
      <div className="hidden lg:flex w-44 xl:w-52 flex-col border-r border-slate-200/60 bg-white p-3">
        {/* Logo Tourfy */}
        <div className="flex items-center gap-2 px-1 mb-4">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-navy-900 shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <span className="font-display text-sm font-bold tracking-tight text-navy-900">
            Tourfy
          </span>
        </div>
        {navItems.map((item) =>
          item.key ? (
            <button
              key={item.label}
              onClick={() => setView(item.key as MockView)}
              className={`flex items-center gap-2 h-8 rounded-lg px-2 mb-0.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                view === item.key
                  ? "bg-blue-500/10 border border-blue-500/20 text-navy-950"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <span className="h-3.5 w-3.5 shrink-0" dangerouslySetInnerHTML={{ __html: item.icon }} />
              <span className="text-[11px] font-semibold truncate">{item.label}</span>
            </button>
          ) : (
            <div
              key={item.label}
              className="flex items-center gap-2 h-8 rounded-lg px-2 mb-0.5 text-slate-500"
            >
              <span className="h-3.5 w-3.5 shrink-0" dangerouslySetInnerHTML={{ __html: item.icon }} />
              <span className="text-[11px] font-semibold truncate">{item.label}</span>
            </div>
          )
        )}
        {/* Org al fondo */}
        <div className="mt-auto flex items-center gap-2 px-1 pt-3 border-t border-slate-100">
          <div className="h-6 w-6 rounded-full bg-navy-900/10 flex items-center justify-center">
            <span className="text-[9px] font-bold text-navy-900">CE</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-navy-950 truncate">Cusco Expeditions</p>
            <p className="text-[9px] text-slate-500 truncate">admin@cuscoexp.com</p>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-9 sm:h-11 border-b border-slate-200/60 bg-white flex items-center justify-between px-3 sm:px-4 shrink-0">
          <span className="text-xs font-bold text-navy-950">{titles[view]}</span>
          <div className="flex items-center gap-2">
            {/* Tabs de vista en mobile (sin sidebar) */}
            <div className="flex lg:hidden gap-1">
              {navItems.filter((i) => i.key).map((item) => (
                <button
                  key={item.label}
                  onClick={() => setView(item.key as MockView)}
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold cursor-pointer ${
                    view === item.key ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex h-6 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5">
              <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <span className="text-[10px] text-slate-600">{tConv("searchPlaceholder")}</span>
            </div>
            <div className="h-6 w-6 rounded-full bg-navy-900/10 flex items-center justify-center">
              <span className="text-[9px] font-bold text-navy-900">LM</span>
            </div>
          </div>
        </div>

        {/* Vista activa */}
        <div className="relative flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {view === "conversations" && <ConversationsView />}
              {view === "tours" && <ToursView />}
              {view === "metrics" && <MetricsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── Vista: Conversaciones (chat animado en loop) ─── */

function ConversationsView() {
  const tDemo = useTranslations("features.demo");
  const tHow = useTranslations("how.preview");
  const tConv = useTranslations("dashboard.conversations");
  const tChat = useTranslations("dashboard.chat");
  const tMock = useTranslations("hero.mock");

  // Loop: la conversacion se reproduce, respira y arranca de nuevo.
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), 9000);
    return () => clearInterval(id);
  }, []);

  const conversations = [
    {
      initials: "MG",
      name: "María González",
      snippet: tDemo("msg0"),
      time: "2m",
      badge: tConv("status.bot"),
      badgeStyle: "bg-green-50 text-green-700 border-green-200/60",
      active: true,
      unread: true,
    },
    {
      initials: "CM",
      name: "Carlos Mendoza",
      snippet: tMock("c1"),
      time: "18m",
      badge: tConv("status.pending"),
      badgeStyle: "bg-amber-50 text-amber-700 border-amber-200/60",
      active: false,
      unread: true,
    },
    {
      initials: "AT",
      name: "Ana Lucía Torres",
      snippet: tMock("c2"),
      time: "1h",
      badge: tConv("status.open"),
      badgeStyle: "bg-blue-50 text-blue-700 border-blue-200/60",
      active: false,
      unread: false,
    },
    {
      initials: "JR",
      name: "Jorge Ramírez",
      snippet: tMock("c3"),
      time: "3h",
      badge: tConv("status.resolved"),
      badgeStyle: "bg-slate-100 text-slate-600 border-slate-200/60",
      active: false,
      unread: false,
    },
  ];

  return (
    <div className="h-full flex min-h-0">
      {/* Lista de conversaciones */}
      <div className="hidden sm:flex flex-col w-48 md:w-60 lg:w-64 border-r border-slate-200/60 bg-white">
        {/* Tabs de estado */}
        <div className="flex gap-1 p-2 border-b border-slate-200/60">
          {[
            { label: tConv("tabs.all"), active: true },
            { label: tConv("tabs.open"), active: false },
            { label: tConv("tabs.pending"), active: false },
          ].map((tab) => (
            <span
              key={tab.label}
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                tab.active ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {tab.label}
            </span>
          ))}
        </div>
        {conversations.map((conv) => (
          <div
            key={conv.name}
            className={`flex items-start gap-2 px-2.5 py-2 border-b border-slate-100 ${
              conv.active ? "bg-blue-50/50" : ""
            }`}
          >
            <div className="relative shrink-0">
              <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="text-[9px] font-bold text-slate-600">{conv.initials}</span>
              </div>
              {conv.unread && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 border border-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center gap-1">
                <span className="text-[10px] font-bold text-navy-950 truncate">{conv.name}</span>
                <span className="text-[9px] text-slate-500 shrink-0">{conv.time}</span>
              </div>
              <p className="text-[9px] text-slate-500 truncate leading-relaxed">{conv.snippet}</p>
              <span className={`mt-0.5 inline-flex rounded-full border px-1.5 py-px text-[8px] font-bold ${conv.badgeStyle}`}>
                {conv.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-slate-50/50 min-w-0">
        {/* Header del chat */}
        <div className="h-10 sm:h-12 border-b border-slate-200/60 bg-white flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-slate-600">MG</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-navy-950 truncate">María González</p>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <span className="text-[9px] text-slate-500">WhatsApp · +51 984 ···</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 rounded-full bg-green-50 border border-green-200/60 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[9px] font-semibold text-green-700">{tConv("status.bot")}</span>
            </div>
            <div className="hidden sm:flex h-6 items-center rounded-lg border border-slate-200 bg-white px-2.5">
              <span className="text-[9px] font-bold text-navy-900">{tChat("takeControl")}</span>
            </div>
          </div>
        </div>

        {/* Mensajes — la conversacion se reproduce en loop */}
        <div className="relative flex-1 overflow-hidden pointer-events-none">
          <div key={cycle} className="p-2 sm:p-3 space-y-2">
            <Reveal at={0.5} pop>
              <Bubble side="left" text={tDemo("msg0")} />
            </Reveal>
            <TypingDots at={1.1} duration={1.2} side="right" />
            <Reveal at={2.4} pop>
              <Bubble side="right" text={tDemo("msg1")} />
            </Reveal>
            <Reveal at={3.6} pop>
              <Bubble side="left" text={tDemo("msg2")} />
            </Reveal>
            <TypingDots at={4.3} duration={1.2} side="right" />

            {/* Toast: lead calificado capturado */}
            <Reveal at={5.6} pop className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-white border border-green-200 shadow-lg shadow-green-900/5 px-3 py-2.5">
                <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-navy-950 leading-tight">
                    {tHow("leadTitle")}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Machu Picchu · {tHow("leadGroupV")}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Input (decorativo) */}
        <div className="p-2 sm:p-3 bg-white border-t border-slate-200/60 shrink-0">
          <div className="h-8 sm:h-9 rounded-xl bg-slate-100 flex items-center px-3 justify-between">
            <span className="text-[10px] text-slate-600 truncate">{tChat("typePlaceholder")}</span>
            <div className="h-5 w-5 rounded-md bg-navy-900 flex items-center justify-center shrink-0">
              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Vista: Tours y FAQs ─── */

function ToursView() {
  const t = useTranslations("dashboard.tours");

  const tours = [
    { name: "Machu Picchu Full Day", price: "$320 USD", faqs: 5 },
    { name: "Valle Sagrado + Almuerzo", price: "$180 USD", faqs: 3 },
    { name: "Laguna Humantay", price: "$95 USD", faqs: 4 },
  ];

  return (
    <div className="h-full bg-slate-50/50 p-3 sm:p-4 overflow-hidden pointer-events-none">
      {/* Header de la vista */}
      <Reveal at={0.05} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[9px] font-bold text-blue-600">
            {t("brainTag")}
          </span>
          <span className="text-[10px] text-slate-500">
            {t("summary", { tours: 3, sections: 2, faqs: 5 })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-6 rounded-lg border border-slate-200 bg-white px-2.5 flex items-center">
            <span className="text-[9px] font-bold text-navy-900">{t("importCta")}</span>
          </div>
          <div className="h-6 rounded-lg bg-navy-900 px-2.5 flex items-center">
            <span className="text-[9px] font-bold text-white">{t("save")}</span>
          </div>
        </div>
      </Reveal>

      {/* Tabs */}
      <Reveal at={0.15} className="mt-3 flex gap-1">
        {[
          { label: t("tabTours"), active: true },
          { label: t("tabBusiness"), active: false },
          { label: t("tabFaqs"), active: false },
        ].map((tab) => (
          <span
            key={tab.label}
            className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
              tab.active ? "bg-navy-900 text-white" : "bg-white border border-slate-200 text-slate-500"
            }`}
          >
            {tab.label}
          </span>
        ))}
      </Reveal>

      {/* Cards de tours */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {tours.map((tour, i) => (
          <Reveal
            key={tour.name}
            at={0.25 + i * 0.15}
            pop
            className="rounded-xl bg-white border border-slate-200/80 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold text-navy-950 leading-tight">{tour.name}</p>
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0 mt-1" />
            </div>
            <p className="mt-1.5 text-sm font-extrabold text-navy-950">{tour.price}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="inline-flex rounded-full bg-slate-100 px-1.5 py-px text-[8px] font-bold text-slate-600">
                {tour.faqs} FAQs
              </span>
              <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Import banner */}
      <Reveal at={0.75} className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-navy-950">{t("importTitle")}</p>
          <p className="text-[9px] text-slate-500 truncate">{t("importSubtitle")}</p>
        </div>
        <div className="h-6 rounded-lg bg-navy-900 px-2.5 flex items-center shrink-0 ml-2">
          <span className="text-[9px] font-bold text-white">{t("importCta")}</span>
        </div>
      </Reveal>
    </div>
  );
}

/* ─── Vista: Métricas ─── */

function MetricsView() {
  const t = useTranslations("dashboard.metrics");

  const cards = [
    { label: t("cards.totalConversations"), value: "1,284", delta: "+18%" },
    { label: t("cards.qualifiedLeads"), value: "312", delta: "+24%" },
    { label: t("cards.conversionRate"), value: "24%", delta: "+6%" },
    { label: t("cards.revenue"), value: "$8,420", delta: "+31%" },
  ];

  const bars = [42, 58, 45, 70, 62, 88, 76];
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  return (
    <div className="h-full bg-slate-50/50 p-3 sm:p-4 overflow-hidden pointer-events-none">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card, i) => (
          <Reveal
            key={card.label}
            at={0.1 + i * 0.1}
            pop
            className="rounded-xl bg-white border border-slate-200/80 p-2.5 sm:p-3"
          >
            <p className="text-[9px] text-slate-500 truncate">{card.label}</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-extrabold text-navy-950 tracking-tight">
                {card.value}
              </span>
              <span className="text-[9px] font-bold text-green-600">{card.delta}</span>
            </div>
            <p className="text-[8px] text-slate-500 truncate">{t("change")}</p>
          </Reveal>
        ))}
      </div>

      {/* Chart de leads */}
      <Reveal at={0.5} className="mt-3 rounded-xl bg-white border border-slate-200/80 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-navy-950">{t("chart.title")}</p>
            <p className="text-[9px] text-slate-500">{t("chart.sub")}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold text-slate-600">
            {t("period.7d")}
          </span>
        </div>
        <div className="mt-2 flex items-end gap-1.5 sm:gap-2 h-16 sm:h-20">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <motion.div
                className={`w-full rounded-t ${i === 5 ? "bg-blue-500" : "bg-blue-500/25"}`}
                initial={{ height: "0%" }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.7 + i * 0.08, duration: 0.4, ease: "easeOut" }}
              />
              <span className="text-[8px] text-slate-500">{t(`chart.days.${days[i]}`)}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

// Iconos mini del sidebar (stroke heredado via currentColor)
const NavIcons = {
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
};
