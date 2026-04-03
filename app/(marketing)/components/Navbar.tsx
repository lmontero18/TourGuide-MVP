"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "./i18n";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { t, locale, toggle } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 ease-out ${
        scrolled
          ? "bg-white/70 backdrop-blur-xl border-b border-slate-200/30"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 transition-transform group-hover:scale-105">
              <svg
                width="16"
                height="16"
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
            <span className="font-display text-lg font-bold tracking-tight text-navy-900">
              TourGuide
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors"
            >
              {t("nav.features")}
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors"
            >
              {t("nav.howItWorks")}
            </a>
            <a
              href="#metrics"
              className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors"
            >
              {t("nav.results")}
            </a>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={toggle}
              className="hidden sm:inline-flex h-8 items-center justify-center rounded-md border border-slate-200 px-2.5 text-xs font-bold text-slate-500 hover:text-navy-900 hover:border-slate-300 transition-colors tracking-wide"
            >
              {locale === "en" ? "ES" : "EN"}
            </button>

            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-navy-900 transition-colors hidden sm:block"
            >
              {t("nav.login")}
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-lg bg-navy-900 px-4 text-sm font-semibold text-white transition-all hover:bg-navy-800 hover:shadow-lg hover:shadow-navy-900/20 active:scale-[0.98]"
            >
              {t("nav.cta")}
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
