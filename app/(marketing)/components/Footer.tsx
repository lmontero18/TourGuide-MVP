"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FadeIn } from "./Motion";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <FadeIn>
      <footer className="border-t border-slate-200 bg-white py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-12">
            {/* Logo & tagline */}
            <div className="max-w-xs">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-navy-900">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <span className="font-display text-base font-bold tracking-tight text-navy-900">
                  TourGuide
                </span>
              </Link>
              <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                {t("tagline1")}
                <br />
                {t("tagline2")}
              </p>
            </div>

            {/* Link columns — grid instead of flex for mobile wrapping */}
            <div className="grid grid-cols-3 gap-8 sm:gap-12 lg:gap-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                  {t("product")}
                </p>
                <ul className="space-y-2">
                  {["Features", "Pricing", "Changelog"].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-xs sm:text-sm text-slate-500 hover:text-navy-900 transition-colors">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                  {t("company")}
                </p>
                <ul className="space-y-2">
                  {["About", "Blog", "Careers"].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-xs sm:text-sm text-slate-500 hover:text-navy-900 transition-colors">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                  {t("legal")}
                </p>
                <ul className="space-y-2">
                  {["Privacy", "Terms"].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-xs sm:text-sm text-slate-500 hover:text-navy-900 transition-colors">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 sm:mt-12 pt-5 sm:pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} {t("rights")}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 rounded-full bg-green-400" />
              <span className="text-xs text-slate-400">{t("status")}</span>
            </div>
          </div>
        </div>
      </footer>
    </FadeIn>
  );
}
