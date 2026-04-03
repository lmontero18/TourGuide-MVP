"use client";

import { useI18n } from "./i18n";
import { FadeUp, StaggerContainer, StaggerItem } from "./Motion";

export function Metrics() {
  const { t } = useI18n();

  const metricValues = ["3×", "68%", "<2s", "$4.2k"];

  return (
    <section id="metrics" className="py-24 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeUp>
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-500">
              {t("metrics.label")}
            </p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-950">
              {t("metrics.title")}
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              {t("metrics.sub")}
            </p>
          </div>
        </FadeUp>

        <StaggerContainer
          className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          staggerDelay={0.1}
        >
          {metricValues.map((value, i) => (
            <StaggerItem key={i}>
              <div className="relative rounded-2xl border border-slate-200/80 bg-white p-7 text-center group transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5">
                <span className="font-display text-5xl lg:text-6xl font-extrabold tracking-tighter text-navy-950">
                  {value}
                </span>
                <span className="block mt-1 text-lg font-display font-bold text-blue-500">
                  {t(`metrics.${i}.unit`)}
                </span>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                  {t(`metrics.${i}.label`)}
                </p>
                <div className="absolute top-0 right-0 h-12 w-12 overflow-hidden rounded-tr-2xl">
                  <div className="absolute -top-6 -right-6 h-12 w-12 rotate-45 bg-blue-500/5" />
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Testimonial */}
        <FadeUp delay={0.2}>
          <div className="mt-20 max-w-3xl mx-auto text-center">
            <blockquote className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-navy-950 leading-snug">
              {t("metrics.quote")}
            </blockquote>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-500">MR</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-navy-900">
                  María Rodríguez
                </p>
                <p className="text-sm text-slate-500">
                  Cusco Expeditions · Peru
                </p>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
