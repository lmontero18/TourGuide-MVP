"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FadeUp, StaggerContainer, StaggerItem } from "./Motion";

export function Pricing() {
  const t = useTranslations("pricing");

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

        <StaggerContainer
          className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 lg:gap-8 items-stretch max-w-4xl mx-auto"
          staggerDelay={0.12}
        >
          {/* Tier 0 — Tourfy (plan vivo, destacado) */}
          <StaggerItem>
            <div className="rounded-2xl border-2 border-navy-900 bg-white p-6 sm:p-8 transition-all hover:shadow-xl hover:shadow-navy-900/10 hover:-translate-y-0.5 h-full flex flex-col relative">
              {/* Popular badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-navy-900 px-4 py-1 text-xs font-bold text-white tracking-wide shadow-lg shadow-navy-900/25">
                  {t("popular")}
                </span>
              </div>

              <div className="mb-6 mt-1">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">
                  {t("tiers.0.badge")}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold text-navy-950 tracking-tight">
                {t("tiers.0.name")}
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed min-h-[40px]">
                {t("tiers.0.desc")}
              </p>

              {/* Price */}
              <div className="mt-6 pb-6 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter text-navy-950">
                    $500
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    /{t("month")}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-3 flex-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckIcon className="text-blue-500" />
                    <span className="text-sm text-slate-600">
                      {t(`tiers.0.f${i}`)}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="mt-8 flex h-11 items-center justify-center rounded-xl bg-navy-900 text-sm font-bold text-white shadow-lg shadow-navy-900/25 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/30 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2"
              >
                {t("tiers.0.cta")}
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
            </div>
          </StaggerItem>

          {/* Tier 1 — Tourfy Plus (coming soon) */}
          <StaggerItem>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 sm:p-8 h-full flex flex-col">
              <div className="mb-6">
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-600">
                  {t("tiers.1.badge")}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold text-navy-950 tracking-tight">
                {t("tiers.1.name")}
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed min-h-[40px]">
                {t("tiers.1.desc")}
              </p>

              {/* Price */}
              <div className="mt-6 pb-6 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter text-navy-950/70">
                    $1,000
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    /{t("month")}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-3 flex-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckIcon className="text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {t(`tiers.1.f${i}`)}
                    </span>
                  </li>
                ))}
              </ul>

              <span
                aria-disabled
                className="mt-8 flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400 cursor-default select-none"
              >
                {t("tiers.1.cta")}
              </span>
            </div>
          </StaggerItem>
        </StaggerContainer>
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
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
