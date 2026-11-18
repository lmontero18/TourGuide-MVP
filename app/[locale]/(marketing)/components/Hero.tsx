"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { FadeUp } from "./Motion";
import { Reveal, TypingDots } from "./PreviewBits";
import { demoLink } from "@/lib/marketing/demoLink";

type MockView = "conversations" | "leads" | "tours" | "metrics";

export function Hero() {
  const t = useTranslations("hero");
  const [view, setView] = useState<MockView>("conversations");
  const demo = demoLink(t("demoMessage"));

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
                href={demo.href}
                {...(demo.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
                    {`www.tourfy.app/${view}`}
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
  const tMetrics = useTranslations("dashboard.metrics");
  const tLeads = useTranslations("dashboard.leads");
  const tMock = useTranslations("hero.mock");

  // Mismo orden e iconos que el sidebar real; las vistas sin mock no se clickean.
  const navItems: { key: MockView | null; label: string; icon: string }[] = [
    { key: "conversations", label: tSide("conversations"), icon: NavIcons.chat },
    { key: "leads", label: tSide("leads"), icon: NavIcons.leads },
    { key: "tours", label: tSide("tours"), icon: NavIcons.tours },
    { key: "metrics", label: tSide("metrics"), icon: NavIcons.chart },
    { key: null, label: tSide("templates"), icon: NavIcons.templates },
    { key: null, label: tSide("agents"), icon: NavIcons.agents },
    { key: null, label: tSide("settings"), icon: NavIcons.gear },
  ];

  const titles: Record<MockView, string> = {
    conversations: tConv("title"),
    leads: tLeads("title"),
    tours: tMock("toursTitle"),
    metrics: tMetrics("title"),
  };

  return (
    <div className="w-full h-full flex select-none text-left bg-white">
      {/* Sidebar (igual al real) */}
      <div className="hidden lg:flex w-44 xl:w-48 flex-col border-r border-slate-200/70 bg-white">
        <div className="flex h-11 items-center gap-2 border-b border-slate-100 px-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-navy-900 shrink-0">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <span className="font-display text-sm font-bold tracking-tight text-navy-900">Tourfy</span>
        </div>
        <div className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const active = item.key === view;
            const inner = (
              <>
                <span className="h-3.5 w-3.5 shrink-0" dangerouslySetInnerHTML={{ __html: item.icon }} />
                <span className="text-[11px] font-medium truncate">{item.label}</span>
                {active && <span className="ml-auto h-1 w-1 rounded-full bg-navy-900" />}
              </>
            );
            const cls = `flex w-full items-center gap-2 h-8 rounded-lg px-2 transition-colors ${
              active ? "bg-navy-900/5 text-navy-900" : "text-slate-500"
            }`;
            return item.key ? (
              <button
                key={item.label}
                onClick={() => setView(item.key as MockView)}
                className={`${cls} cursor-pointer hover:bg-slate-50 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50`}
              >
                {inner}
              </button>
            ) : (
              <div key={item.label} className={cls}>{inner}</div>
            );
          })}
        </div>
        <div className="flex h-9 items-center justify-center border-t border-slate-100 text-slate-400">
          <span className="text-[11px]">«</span>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Top bar real: titulo + campana + avatar */}
        <div className="h-11 border-b border-slate-200/70 bg-white flex items-center justify-between px-3 sm:px-4 shrink-0">
          <span className="font-display text-sm font-bold text-navy-950">{titles[view]}</span>
          <div className="flex items-center gap-2.5">
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
            <svg className="hidden sm:block h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-[9px] font-bold text-navy-900">LM</span>
            </div>
          </div>
        </div>

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
              {view === "leads" && <LeadsView />}
              {view === "tours" && <ToursView />}
              {view === "metrics" && <MetricsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── Piezas del chat real, en miniatura ─── */

function MiniBubble({ role, text, time }: { role: "user" | "assistant" | "agent"; text: string; time: string }) {
  const tChat = useTranslations("dashboard.chat");
  const style = {
    user: { wrap: "justify-start", bubble: "bg-white border border-slate-200 text-navy-900 rounded-tl-sm shadow-sm", label: tChat("roleClient"), labelCls: "text-slate-400" },
    assistant: { wrap: "justify-start", bubble: "bg-blue-50 border border-blue-100 text-navy-900 rounded-tl-sm", label: tChat("roleBot"), labelCls: "text-blue-500" },
    agent: { wrap: "justify-end", bubble: "bg-navy-900 text-white rounded-tr-sm shadow-md", label: tChat("roleYou"), labelCls: "text-white/60" },
  }[role];
  return (
    <div className={`flex ${style.wrap}`}>
      <div className={`max-w-[80%] rounded-xl px-2.5 py-1.5 ${style.bubble}`}>
        <span className={`block text-[8px] font-bold ${style.labelCls}`}>{style.label}</span>
        <p className="text-[10px] sm:text-[11px] leading-relaxed">{text}</p>
        <span className={`block text-[8px] mt-0.5 ${role === "agent" ? "text-white/50" : "text-slate-400"}`}>{time}</span>
      </div>
    </div>
  );
}

function BotBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-4 items-center gap-1 rounded-full bg-green-50 border border-green-200 px-1.5 text-[8px] font-bold text-green-700">
      <span className="h-1 w-1 rounded-full bg-green-500" />
      {label}
    </span>
  );
}

/* ─── Vista: Conversaciones (chat animado en loop, UI real) ─── */

function ConversationsView() {
  const tDemo = useTranslations("features.demo");
  const tConv = useTranslations("dashboard.conversations");
  const tChat = useTranslations("dashboard.chat");
  const tMock = useTranslations("hero.mock");

  // Loop: la conversacion se reproduce, respira y arranca de nuevo.
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), 9000);
    return () => clearInterval(id);
  }, []);

  const tabs = [
    { label: tConv("tabs.all"), count: 4, active: true },
    { label: tConv("tabs.waiting"), count: 1 },
    { label: tConv("tabs.mine"), count: 1 },
    { label: tConv("tabs.resolved"), count: 1 },
  ];

  const conversations: {
    initials: string; name: string; snippet: string; time: string; unread?: number; active?: boolean;
    badge: "bot" | "waiting" | "mine" | "resolved";
  }[] = [
    { initials: "MG", name: "María González", snippet: tDemo("msg0"), time: "2 min", unread: 2, active: true, badge: "bot" },
    { initials: "CM", name: "Carlos Mendoza", snippet: tMock("c1"), time: "18 min", unread: 1, badge: "waiting" },
    { initials: "AT", name: "Ana Lucía Torres", snippet: tMock("c2"), time: "1 h", badge: "mine" },
    { initials: "JR", name: "Jorge Ramírez", snippet: tMock("c3"), time: "3 h", badge: "resolved" },
  ];

  return (
    <div className="h-full flex min-h-0">
      {/* Lista (igual a ConversationList) */}
      <div className="hidden sm:flex flex-col w-52 md:w-64 border-r border-slate-200/70 bg-white">
        <div className="p-2 border-b border-slate-100">
          <div className="h-6 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-1.5 px-2">
            <svg className="h-2.5 w-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <span className="text-[9px] text-slate-400 truncate">{tConv("searchPlaceholder")}</span>
          </div>
        </div>
        <div className="flex gap-1 px-2 py-1.5 border-b border-slate-100 overflow-hidden">
          {tabs.map((tab) => (
            <span
              key={tab.label}
              className={`shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] font-medium ${
                tab.active ? "bg-navy-900 text-white" : "text-slate-600"
              }`}
            >
              {tab.label}
              <span className={tab.active ? "text-white/60" : "text-slate-400"}>{tab.count}</span>
            </span>
          ))}
        </div>
        {conversations.map((conv) => (
          <div
            key={conv.name}
            className={`flex items-start gap-2 px-2.5 py-2 border-b border-slate-100 ${conv.active ? "bg-slate-50" : ""}`}
          >
            <div className="h-7 w-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-[8px] font-bold text-slate-500">{conv.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center gap-1">
                <span className={`text-[10px] truncate text-navy-950 ${conv.unread ? "font-bold" : "font-medium"}`}>{conv.name}</span>
                <span className={`text-[8px] shrink-0 ${conv.unread ? "font-bold text-blue-600" : "text-slate-400"}`}>{conv.time}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <p className={`text-[9px] truncate ${conv.unread ? "text-navy-700 font-medium" : "text-slate-500"}`}>{conv.snippet}</p>
                {conv.unread && (
                  <span className="shrink-0 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-blue-600 px-1 text-[7px] font-bold text-white">
                    {conv.unread}
                  </span>
                )}
              </div>
              <div className="mt-1">
                {conv.badge === "bot" && <BotBadge label={tConv("status.bot")} />}
                {conv.badge === "waiting" && (
                  <span className="inline-flex h-4 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-1.5 text-[7px] font-bold uppercase tracking-wider text-red-700">
                    <span className="h-1 w-1 rounded-full bg-red-500" />
                    {tConv("status.pending")}
                  </span>
                )}
                {conv.badge === "mine" && (
                  <span className="inline-flex h-4 items-center gap-1 rounded-full bg-amber-100 px-1.5 text-[8px] font-bold text-amber-800">
                    <span className="text-[7px]">LM</span>
                    {tConv("status.you")}
                  </span>
                )}
                {conv.badge === "resolved" && (
                  <span className="inline-flex h-4 items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 text-[7px] font-bold uppercase tracking-wider text-slate-500">
                    {tConv("status.resolved")}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chat (igual a ChatWindow) */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-11 border-b border-slate-200/70 bg-white flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-full bg-navy-900/10 flex items-center justify-center shrink-0">
              <span className="text-[8px] font-bold text-navy-700">MG</span>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-navy-950 truncate">María González</p>
              <p className="text-[8px] text-slate-400">50588124567</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="h-6 rounded-md bg-navy-900 px-2 flex items-center text-[8px] font-bold text-white">{tChat("takeControl")}</span>
            <span className="hidden md:flex h-6 rounded-md border border-slate-200 bg-white px-2 items-center gap-1 text-[8px] font-bold text-slate-600">✓ {tChat("resolve")}</span>
            <span className="hidden md:flex h-6 rounded-md border border-slate-200 bg-white px-2 items-center gap-1 text-[8px] font-bold text-slate-600">
              <span className="h-1 w-1 rounded-full bg-amber-500" />
              {tMock("fichaButton")}
            </span>
            <span className="h-6 w-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-[9px] text-slate-500">⋮</span>
          </div>
        </div>
        {/* Banner de estado real */}
        <div className="flex items-center gap-1.5 border-b border-green-100 bg-green-50 px-3 py-1">
          <span className="h-1 w-1 rounded-full bg-green-500" />
          <span className="text-[9px] font-medium text-green-700">{tChat("botBanner")}</span>
        </div>

        {/* Mensajes — la conversacion se reproduce en loop */}
        <div className="relative flex-1 overflow-hidden pointer-events-none bg-slate-50">
          <div key={cycle} className="p-2.5 sm:p-3 space-y-1.5">
            <Reveal at={0.5} pop>
              <MiniBubble role="user" text={tDemo("msg0")} time="21:04" />
            </Reveal>
            <TypingDots at={1.1} duration={1.2} side="left" />
            <Reveal at={2.4} pop>
              <MiniBubble role="assistant" text={tDemo("msg1")} time="21:04" />
            </Reveal>
            <Reveal at={3.6} pop>
              <MiniBubble role="user" text={tDemo("msg2")} time="21:05" />
            </Reveal>
            <TypingDots at={4.3} duration={1.2} side="left" />

            {/* El bot pasa al cliente listo para cerrar (la ficha ya esta llena) */}
            <Reveal at={5.6} pop className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3">
              <div className="w-52 rounded-xl bg-white border border-amber-200 shadow-lg shadow-amber-900/5 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <p className="text-[10px] font-bold text-navy-950">{tMock("handoffTitle")}</p>
                </div>
                <p className="mt-0.5 text-[9px] text-slate-500">{tMock("handoffSub")}</p>
                <div className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[8px] text-slate-600">{tMock("handoffNext")}</div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Input real con el bot activo */}
        <div className="p-2 bg-white border-t border-slate-200/70 shrink-0">
          <div className="h-7 rounded-lg border border-slate-200 bg-slate-50 flex items-center px-2.5 justify-between">
            <span className="text-[9px] text-slate-400 truncate">{tChat("takeControlPlaceholder")}</span>
            <div className="h-5 w-5 rounded-md bg-slate-200 flex items-center justify-center shrink-0">
              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Vista: Leads (embudo real) ─── */

function LeadsView() {
  const t = useTranslations("dashboard.leads");
  const tMock = useTranslations("hero.mock");
  const kpis = [
    { label: t("kpi.created"), value: "38" },
    { label: t("kpi.ready"), value: "6" },
    { label: t("kpi.won"), value: "10" },
    { label: t("kpi.revenue"), value: "$1,390" },
  ];
  const dot = { new: "bg-slate-400", contacted: "bg-blue-500", qualified: "bg-amber-500", converted: "bg-green-500" } as const;
  const temp = { cold: "bg-slate-100 text-slate-500", warm: "bg-amber-50 text-amber-700", hot: "bg-orange-50 text-orange-700" } as const;
  const columns: { stage: keyof typeof dot; cards: { name: string; tour: string; temp: keyof typeof temp; meta: string }[] }[] = [
    { stage: "new", cards: [{ name: "Sarah Miller", tour: tMock("tourApoyo"), temp: "cold", meta: "2 min" }] },
    { stage: "contacted", cards: [{ name: "Luis Ortega", tour: tMock("tourSomoto"), temp: "warm", meta: "1 h" }, { name: "Julie Martin", tour: tMock("tourMasaya"), temp: "warm", meta: "3 h" }] },
    { stage: "qualified", cards: [{ name: "María González", tour: tMock("tourMasaya"), temp: "hot", meta: tMock("now") }] },
    { stage: "converted", cards: [{ name: "Ana Lucía Torres", tour: tMock("tourIsletas"), temp: "hot", meta: "$90" }] },
  ];
  return (
    <div className="h-full p-3 sm:p-4 overflow-hidden pointer-events-none">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpis.map((k, i) => (
          <Reveal key={k.label} at={0.05 + i * 0.08} pop className="rounded-xl bg-white border border-slate-200/80 p-2">
            <p className="text-[8px] text-slate-500 truncate">{k.label}</p>
            <p className="font-display text-sm sm:text-base font-extrabold text-navy-950">{k.value}</p>
          </Reveal>
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {columns.map((col, ci) => (
          <Reveal key={col.stage} at={0.35 + ci * 0.1} className="rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-navy-900">
                <span className={`h-1.5 w-1.5 rounded-full ${dot[col.stage]}`} />
                {t(`stages.${col.stage}`)}
              </span>
              <span className="text-[8px] text-slate-400">{col.cards.length}</span>
            </div>
            {col.cards.map((card) => (
              <div
                key={card.name}
                className={`rounded-lg border bg-white p-1.5 ${card.name === "María González" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"}`}
              >
                <p className="text-[9px] font-bold text-navy-900 truncate">{card.name}</p>
                <p className="text-[8px] text-slate-600 truncate">{card.tour}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className={`rounded-full px-1 text-[7px] font-bold ${temp[card.temp]}`}>{t(`temperature.${card.temp}`)}</span>
                  <span className="text-[7px] text-slate-400">{card.meta}</span>
                </div>
              </div>
            ))}
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ─── Vista: Lo que sabe tu bot (espejo de /tours) ─── */

function ToursView() {
  const t = useTranslations("dashboard.tours");
  const tMock = useTranslations("hero.mock");

  const tours = [
    { name: "Volcán Masaya de noche", type: tMock("typeDay"), price: "$45 USD", more: true },
    { name: "Isletas de Granada en lancha", type: tMock("typeDay"), price: "$25 USD", more: false },
    { name: "Laguna de Apoyo", type: tMock("typeAdventure"), price: "$35 USD", more: true },
    { name: "Cañón de Somoto", type: tMock("typeAdventure"), price: "$60 USD", more: false },
  ];

  return (
    <div className="h-full bg-slate-50/50 p-3 sm:p-4 overflow-hidden pointer-events-none">
      {/* Tabs con conteo, como en el panel */}
      <Reveal at={0.05} className="flex gap-4 border-b border-slate-200">
        {[
          { label: t("tabTours"), count: 4, active: true },
          { label: t("tabBusiness"), count: 3, active: false },
          { label: t("tabFaqs"), count: 8, active: false },
        ].map((tab) => (
          <span
            key={tab.label}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 pb-1.5 text-[10px] font-bold ${
              tab.active ? "border-navy-900 text-navy-950" : "border-transparent text-slate-400"
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1 text-[8px] ${tab.active ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-400"}`}>
              {tab.count}
            </span>
          </span>
        ))}
      </Reveal>

      {/* Tabla de tours */}
      <Reveal at={0.2} className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-400">
          <span>{tMock("colTour")}</span>
          <span>{tMock("colType")}</span>
          <span>{tMock("colPrice")}</span>
        </div>
        {tours.map((tour, i) => (
          <Reveal
            key={tour.name}
            at={0.35 + i * 0.12}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 border-t border-slate-100 px-3 py-2 first:border-t-0"
          >
            <span className="truncate text-[10px] font-bold text-navy-950">{tour.name}</span>
            <span>
              <span className="rounded-full border border-slate-200 px-1.5 py-px text-[8px] font-bold text-slate-500">{tour.type}</span>
            </span>
            <span className="text-[10px] font-bold tabular-nums text-navy-950">
              {tour.price}
              {tour.more && <span className="block text-[8px] font-medium text-slate-400">{tMock("morePrices")}</span>}
            </span>
          </Reveal>
        ))}
      </Reveal>
    </div>
  );
}

/* ─── Vista: Métricas ─── */

function MetricsView() {
  const t = useTranslations("dashboard.metrics");

  const cards = [
    { label: t("cards.activeConversations"), value: "248", delta: "+18%" },
    { label: t("cards.botReplies"), value: "86%", delta: "+4%" },
    { label: t("cards.readyToClose"), value: "41", delta: "+12%" },
    { label: t("cards.teamPickup"), value: "52 s", delta: "-9%" },
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
  leads: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/></svg>`,
  tours: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="M9 11H3v10h6V11z"/><path d="M21 3h-6v18h6V3z"/><path d="M15 7H9v14h6V7z"/></svg>`,
  templates: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>`,
  agents: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
};
