"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FadeUp } from "./Motion";

export function CTA() {
  const t = useTranslations("ctaSection");

  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <FadeUp>
          <div className="mx-auto max-w-3xl rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 p-8 sm:p-14 lg:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 grid-pattern opacity-30" aria-hidden />

            <div className="relative z-10">
              <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy-950 leading-tight">
                {t("title1")}
                <br />
                {t("title2")}
              </h2>
              <p className="mt-5 text-base sm:text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                {t("sub")}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-navy-900 px-7 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition-all hover:bg-navy-800 hover:shadow-xl hover:shadow-navy-900/25 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2"
                >
                  {t("button")}
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
                <span className="text-sm text-slate-500">
                  {t("note")}
                </span>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
