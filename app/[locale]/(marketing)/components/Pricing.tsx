"use client";

import { useTranslations } from "next-intl";
import { FadeUp, StaggerContainer, StaggerItem } from "./Motion";
import { demoLink } from "@/lib/marketing/demoLink";

// Dos planes (CODE-208): Starter $200 y Pro $300, Pro destacado. El texto
// sale de pricing.tiers.{starter,pro}; las listas tienen que coincidir con lo
// que hace cada plan en el producto (lib/features.ts › PRO_FEATURES).
const TIERS = ["starter", "pro"] as const;

export function Pricing() {
  const t = useTranslations("pricing");
  const tHero = useTranslations("hero");
  const demo = demoLink(tHero("demoMessage"));

  return (
    <section id="pricing" className="py-16 sm:py-24 lg:py-32 bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-40" aria-hidden />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-500">
              {t("label")}
            </p>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-navy-950">
              {t("title")}
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-500 leading-relaxed">
              {t("sub")}
            </p>
          </div>
        </FadeUp>

        {/* En el celular una debajo de la otra; desde md, lado a lado. */}
        <StaggerContainer
          className="mt-10 sm:mt-16 grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch max-w-4xl mx-auto"
          staggerDelay={0.12}
        >
          {TIERS.map((key) => {
            const pro = key === "pro";
            const features = t.raw(`tiers.${key}.features`) as string[];
            return (
              <StaggerItem key={key}>
                <div
                  className={`h-full flex flex-col rounded-2xl p-6 sm:p-8 transition-all hover:-translate-y-0.5 ${
                    pro
                      ? "bg-navy-950 text-white shadow-xl shadow-navy-900/20 hover:shadow-2xl hover:shadow-navy-900/30"
                      : "border border-slate-200 bg-white hover:shadow-xl hover:shadow-navy-900/10"
                  }`}
                >
                  <div className="mb-6">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        pro ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {t(`tiers.${key}.badge`)}
                    </span>
                  </div>
                  <h3 className={`font-display text-xl font-bold tracking-tight ${pro ? "text-white" : "text-navy-950"}`}>
                    {t(`tiers.${key}.name`)}
                  </h3>
                  <p className={`mt-2 text-sm leading-relaxed min-h-[40px] ${pro ? "text-slate-300" : "text-slate-500"}`}>
                    {t(`tiers.${key}.desc`)}
                  </p>

                  <div className={`mt-6 pb-6 border-b ${pro ? "border-white/10" : "border-slate-100"}`}>
                    <div className="flex items-baseline gap-1">
                      <span className={`font-display text-4xl sm:text-5xl font-extrabold tracking-tighter ${pro ? "text-white" : "text-navy-950"}`}>
                        {t(`tiers.${key}.price`)}
                      </span>
                      <span className={`text-sm font-medium ${pro ? "text-slate-300" : "text-slate-500"}`}>
                        USD/{t("month")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex-1">
                    {pro && <p className="mb-3 text-sm font-bold text-white">{t("tiers.pro.lead")}</p>}
                    <ul className="space-y-3">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <CheckIcon className={pro ? "text-blue-400" : "text-blue-500"} />
                          <span className={`text-sm ${pro ? "text-slate-200" : "text-slate-600"}`}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {pro && (
                      <p className="mt-4 border-t border-dashed border-white/15 pt-4 text-xs text-slate-300">
                        {t("tiers.pro.soon")}
                      </p>
                    )}
                  </div>

                  <a
                    href={demo.href}
                    {...(demo.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`mt-8 flex h-11 items-center justify-center rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 ${
                      pro
                        ? "bg-white text-navy-950 hover:bg-slate-100"
                        : "bg-navy-900 text-white shadow-lg shadow-navy-900/25 hover:bg-navy-800"
                    }`}
                  >
                    {t(`tiers.${key}.cta`)}
                    <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <FadeUp delay={0.2}>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-600">
            <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
            <span>{t("guarantee")}</span>
          </p>
          <p className="mt-4 text-center text-sm text-slate-500 max-w-xl mx-auto">
            <span className="font-semibold text-navy-900">{t("soon")}</span> {t("soonList")}
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 mt-0.5 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
