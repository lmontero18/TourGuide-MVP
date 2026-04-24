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
          className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 items-start"
          staggerDelay={0.12}
        >
          {/* Tier 1 — Do it yourself */}
          <StaggerItem>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 h-full flex flex-col">
              <div className="mb-6">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
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
                  <span className="text-sm font-medium text-slate-400">
                    /{t("month")}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-3 flex-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckIcon className="text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {t(`tiers.0.f${i}`)}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className="mt-8 flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-navy-900 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
              >
                {t("tiers.0.cta")}
              </Link>
            </div>
          </StaggerItem>

          {/* Tier 2 — Do it for you (featured) */}
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
                  <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter text-navy-950">
                    $3,000
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {t("tiers.1.setup")}
                  <span className="font-semibold text-navy-900">
                    {" "}+ $500/{t("month")}
                  </span>
                </p>
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-3 flex-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckIcon className="text-blue-500" />
                    <span className="text-sm text-slate-600">
                      {t(`tiers.1.f${i}`)}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className="mt-8 flex h-11 items-center justify-center rounded-xl bg-navy-900 text-sm font-bold text-white shadow-lg shadow-navy-900/25 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                {t("tiers.1.cta")}
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
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

          {/* Tier 3 — Done for you */}
          <StaggerItem>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 h-full flex flex-col">
              <div className="mb-6">
                <span className="inline-flex items-center rounded-full bg-navy-900/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-navy-700">
                  {t("tiers.2.badge")}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold text-navy-950 tracking-tight">
                {t("tiers.2.name")}
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed min-h-[40px]">
                {t("tiers.2.desc")}
              </p>

              {/* Price */}
              <div className="mt-6 pb-6 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tighter text-navy-950">
                    {t("tiers.2.price")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {t("tiers.2.priceNote")}
                </p>
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-3 flex-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckIcon className="text-navy-500" />
                    <span className="text-sm text-slate-600">
                      {t(`tiers.2.f${i}`)}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className="mt-8 flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-navy-900 transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
              >
                {t("tiers.2.cta")}
              </Link>
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
