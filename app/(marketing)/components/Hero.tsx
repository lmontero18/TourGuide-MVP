"use client";

import { useTranslations } from "next-intl";
import { FadeUp } from "./Motion";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative pt-24 pb-6 sm:pt-28 sm:pb-8 lg:pt-36 lg:pb-16 hero-gradient grid-pattern noise-bg overflow-hidden">
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
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium tracking-wide truncate">
                    app.tourguide.com/conversations
                  </span>
                </div>
              </div>
              <div className="w-8 sm:w-[52px]" />
            </div>

            {/* Preview area */}
            <div className="relative aspect-[16/10] sm:aspect-video bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="absolute inset-0">
                <DashboardSkeleton />
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="w-full h-full flex">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden lg:flex w-48 xl:w-56 flex-col gap-3 border-r border-slate-200/60 bg-white p-3 xl:p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-lg bg-navy-900/10" />
          <div className="h-2.5 w-16 rounded bg-navy-900/10" />
        </div>
        {[60, 48, 52, 40, 50].map((w, i) => (
          <div
            key={i}
            className={`h-7 rounded-lg ${i === 0 ? "bg-blue-500/10 border border-blue-500/20" : "bg-transparent"} flex items-center gap-2 px-2`}
          >
            <div className="h-3 w-3 rounded bg-slate-200" />
            <div className="h-2 rounded bg-slate-200" style={{ width: w }} />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-9 sm:h-11 border-b border-slate-200/60 bg-white flex items-center justify-between px-3 sm:px-4">
          <div className="h-2.5 w-20 sm:w-28 rounded bg-slate-200" />
          <div className="flex gap-1.5">
            <div className="h-6 w-6 rounded-lg bg-slate-100" />
            <div className="h-6 w-14 sm:w-18 rounded-lg bg-navy-900/10" />
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Conversation list — hidden on smallest */}
          <div className="hidden sm:block w-48 md:w-56 lg:w-64 border-r border-slate-200/60 bg-white">
            <div className="p-2 sm:p-3 border-b border-slate-200/60">
              <div className="h-7 rounded-lg bg-slate-100" />
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex items-start gap-2 px-2 sm:px-3 py-2 sm:py-2.5 border-b border-slate-100 ${i === 1 ? "bg-blue-50/50" : ""}`}
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="h-2 w-16 sm:w-20 rounded bg-slate-200" />
                    <div className="h-1.5 w-8 rounded bg-slate-200" />
                  </div>
                  <div className="h-1.5 w-full rounded bg-slate-100" />
                  <div className="h-1.5 w-3/4 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-slate-50/50 min-w-0">
            {/* Chat header */}
            <div className="h-10 sm:h-12 border-b border-slate-200/60 bg-white flex items-center justify-between px-3 sm:px-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-slate-200" />
                <div className="space-y-1">
                  <div className="h-2 w-20 sm:w-24 rounded bg-slate-200" />
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <div className="h-1.5 w-10 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-green-50 border border-green-200/60 px-2 py-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[8px] sm:text-[10px] font-semibold text-green-700">Bot</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-2 sm:p-3 space-y-2 overflow-hidden">
              <ChatBubble side="right" widths={["60%"]} color="bg-blue-500/10" />
              <ChatBubble side="left" widths={["75%", "50%"]} color="bg-white" />
              <ChatBubble side="right" widths={["45%"]} color="bg-blue-500/10" />
              <ChatBubble side="left" widths={["80%", "65%", "35%"]} color="bg-white" />
              <ChatBubble side="right" widths={["55%"]} color="bg-blue-500/10" />
              {/* Indicador de "escribiendo" — el bot esta respondiendo en vivo */}
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/40 rounded-xl rounded-tl-sm px-2.5 py-2 shadow-sm flex items-center gap-1">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="block h-1.5 w-1.5 rounded-full bg-slate-300"
                      style={{ animation: `pulse-dot 1.4s ${d * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="p-2 sm:p-3 bg-white border-t border-slate-200/60">
              <div className="h-8 sm:h-9 rounded-xl bg-slate-100 flex items-center px-2.5 justify-between">
                <div className="h-2 w-20 sm:w-28 rounded bg-slate-200" />
                <div className="h-5 w-5 rounded-md bg-navy-900/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  side,
  widths,
  color,
}: {
  side: "left" | "right";
  widths: string[];
  color: string;
}) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`${color} rounded-xl ${side === "left" ? "rounded-tl-sm" : "rounded-tr-sm"} p-2 sm:p-2.5 space-y-1 max-w-[70%] border border-slate-200/40 shadow-sm`}
      >
        {widths.map((w, i) => (
          <div key={i} className="h-1.5 sm:h-2 rounded bg-slate-200/80" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}
