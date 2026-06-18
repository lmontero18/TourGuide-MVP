"use client";

import { useTranslations } from "next-intl";
import { FadeUp, StaggerContainer, StaggerItem } from "./Motion";

export function Metrics() {
  const t = useTranslations("metrics");

  const metricValues = ["3×", "68%", "<2s", "$4.2k"];

  return (
    <section id="metrics" className="py-16 sm:py-24 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-500">
              {t("label")}
            </p>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-navy-950">
              {t("title")}
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-slate-500">
              {t("sub")}
            </p>
          </div>
        </FadeUp>

        <StaggerContainer
          className="mt-10 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
          staggerDelay={0.1}
        >
          {metricValues.map((value, i) => (
            <StaggerItem key={i}>
              <div className="relative rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-7 text-center group transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5">
                <span className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter text-navy-950">
                  {value}
                </span>
                <span className="block mt-1 text-sm sm:text-lg font-display font-bold text-blue-500">
                  {t(`items.${i}.unit`)}
                </span>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                  {t(`items.${i}.label`)}
                </p>
                <div className="absolute top-0 right-0 h-12 w-12 overflow-hidden rounded-tr-2xl">
                  <div className="absolute -top-6 -right-6 h-12 w-12 rotate-45 bg-blue-500/5" />
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Caveat honesto — los numeros son proyecciones, no resultados verificados */}
        <FadeUp delay={0.2}>
          <p className="mt-10 text-center text-xs text-slate-500">
            {t("note")}
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
